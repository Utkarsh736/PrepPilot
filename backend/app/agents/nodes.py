"""Agent nodes for the LangGraph interview-copilot pipeline.

Flow:  router → context → {interview | resume | critique | general}

Each node is resilient: it tries the LLM path first (Gemini / Groq /
OpenRouter via LangChain) and degrades to Demo Mode (template + heuristic)
whenever no provider is configured or a call fails. The user never sees a
raw error inside the chat.
"""

from __future__ import annotations

import json
import re
import time

from app.agents import fallbacks, prompts
from app.agents.state import ChatState
from app.eval.heuristics import looks_like_resume_draft
from app.llm import get_llm
from app.llm import dspy_config
from app.rag.store import VectorStore

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _pipeline(state: ChatState, node: str, label: str, detail: str, ms: float) -> dict:
    return {
        "pipeline": [
            {
                "node": node,
                "label": label,
                "detail": detail,
                "ms": int(ms),
            }
        ]
    }


def _sources_from_chunks(chunks) -> list[dict]:
    out, seen = [], set()
    for c in chunks or []:
        if c.doc_name not in seen:
            seen.add(c.doc_name)
            out.append({"name": c.doc_name, "type": c.doc_type})
    return out


def _extract_question(reply: str) -> str:
    """Pull the bolded question (or last interrogative sentence) from a coach reply."""
    bolds = re.findall(r"\*\*(.+?)\*\*", reply, flags=re.S)
    for b in reversed(bolds):
        b = b.strip()
        if b.endswith("?") or len(b) > 25:
            return re.sub(r"\s+", " ", b)[:400]
    qs = re.findall(r"([^.!?]*\?)", reply)
    if qs:
        return qs[-1].strip()[:400]
    return ""


# ---------------------------------------------------------------------------
# 1. ROUTER — intent classification (DSPy, with keyword fallback)
# ---------------------------------------------------------------------------

_INTERVIEW_KW = re.compile(
    r"\b(interview|mock|practice|rehearse|roleplay|role-play|round|"
    r"quiz me|test me|ask me|grill me|prepare)\b", re.I)
_TYPE_KW = {
    "hr": re.compile(r"\b(hr|behavioral|behavioural|screen(?:ing)?)\b", re.I),
    "technical": re.compile(r"\b(technical|system design|tech round)\b", re.I),
    "coding": re.compile(r"\b(coding|dsa|algorithm|algorithms|leetcode|data structure)\b", re.I),
    "culture_fit": re.compile(r"\b(culture|fit|values|team fit)\b", re.I),
}
_RESUME_TAILOR_KW = re.compile(r"\b(tailor|optimi[sz]e|build|write|rewrite|craft|update|make|improve|create)\b.*\b(resume|cv)\b|\b(resume|cv)\b.*\b(tailor|optimi[sz]e|build|write|rewrite|craft|update|make|improve|create)\b", re.I | re.S)
_CRITIQUE_KW = re.compile(r"\b(review|score|rate|critique|feedbac|check|assess|evaluate)\b.*\b(resume|cv|draft)\b", re.I)
_COMMAND_STARTERS = re.compile(r"^\s*(hey|hi|hello|start|begin|let'?s|can you|could you|please|help|what|how|why|who|when|where|do you|are you|i want|show|give me|explain|tell me about)\b", re.I)


def _heuristic_router(state: ChatState) -> dict:
    msg = state.get("user_message", "")
    pending = state.get("pending_question", "")
    mode = state.get("selected_mode", "auto")

    is_answer = False
    intent = "general"
    itype = ""

    # 1) pasted resume draft or explicit resume review request
    if looks_like_resume_draft(msg) or _CRITIQUE_KW.search(msg):
        intent = "critique"

    # 2) explicit resume build request
    elif _RESUME_TAILOR_KW.search(msg):
        intent = "resume"

    # 3) answer to the pending question?
    elif pending:
        words = msg.split()
        looks_command = bool(_COMMAND_STARTERS.search(msg)) or msg.rstrip().endswith("?")
        if len(msg) > 80 or (len(words) >= 15 and not looks_command):
            is_answer = True
            intent = "interview"
            itype = state.get("interview_current_type") or "hr"

    # 4) explicit interview request
    if intent == "general" and _INTERVIEW_KW.search(msg):
        intent = "interview"
        for t, rx in _TYPE_KW.items():
            if rx.search(msg):
                itype = t
                break
        if not itype and mode in ("hr", "technical", "coding", "culture_fit"):
            itype = mode
        if not itype:
            itype = state.get("interview_current_type") or "hr"

    if intent == "interview" and not itype:
        itype = "hr"
    if intent != "interview":
        itype = ""
        is_answer = False

    return {"intent": intent, "interview_type": itype, "is_answer": is_answer}


def router_node(state: ChatState) -> dict:
    t0 = time.time()
    result = None
    method = "keywords"

    if state.get("provider") != "demo":
        excerpt = "\n".join(f"{t['role']}: {t['content'][:300]}" for t in (state.get("history") or [])[-4:])
        result = dspy_config.classify_intent(
            state.get("provider"),
            state.get("user_message", ""),
            excerpt,
            state.get("selected_mode", "auto"),
            state.get("pending_question", ""),
        )
        if result:
            method = "dspy"

    if result is None:
        result = _heuristic_router(state)
        # heuristic answer-detection is conservative; let a pending question
        # + long message win even if it starts with "I"
        if not result.get("is_answer") and state.get("pending_question"):
            msg = state.get("user_message", "")
            if len(msg.split()) >= 35 and not msg.rstrip().endswith("?"):
                result["intent"] = "interview"
                result["is_answer"] = True
                result["interview_type"] = state.get("interview_current_type") or "hr"

    update = {**result}
    detail = f"intent: {result['intent']}" + (
        f" · round: {result['interview_type']}" if result.get("interview_type") else ""
    ) + (" · answer detected" if result.get("is_answer") else "")
    update.update(_pipeline(state, "router", "Intent Router", f"({method}) {detail}", (time.time() - t0) * 1000))
    return update


# ---------------------------------------------------------------------------
# 2. CONTEXT — RAG retrieval + condensation (cached per session documents)
# ---------------------------------------------------------------------------


def _condense(llm, template: str, chunks_text: str) -> str:
    prompt = prompts.render(template, retrieved_context=chunks_text)
    try:
        return llm.invoke(prompt).content.strip()
    except Exception:
        # graceful: truncated raw chunks
        return chunks_text[:1800]


def context_node(state: ChatState) -> dict:
    t0 = time.time()
    sid = state["session_id"]
    intent = state.get("intent", "general")
    query = state.get("user_message", "") or state.get("pending_question", "") or "candidate background"

    store = VectorStore(sid)
    llm = get_llm(state.get("provider"))

    profile_chunks, jd_chunks = [], []
    if intent in ("interview", "general", "resume", "critique"):
        profile_chunks = store.retrieve(
            query, doc_types=["resume", "work_experience", "education"], top_k=6
        )
    if intent in ("interview", "general", "resume", "critique"):
        jd_chunks = store.retrieve(query, doc_types=["job_description"], top_k=5)

    context_chunks = profile_chunks + jd_chunks
    ctx_text, _srcs = prompts.context_block(context_chunks)

    has_profile = len(profile_chunks) > 0
    has_jd = len(jd_chunks) > 0

    # Condense with the LLM (short, cached-in-session would be ideal; the
    # condensation is capped so it stays fast). In demo mode we pass raw
    # truncated chunks — the coach prompts handle it.
    profile_summary, jd_summary = "", ""
    if has_profile:
        raw = prompts.context_block(profile_chunks)[0]
        profile_summary = _condense(llm, prompts.PROFILE_CONDENSER_PROMPT, raw) if llm else raw[:2000]
    if has_jd:
        raw = prompts.context_block(jd_chunks)[0]
        jd_summary = _condense(llm, prompts.JD_CONDENSER_PROMPT, raw) if llm else raw[:1200]

    detail = (
        f"profile: {'✓' if has_profile else '✗'} · job description: {'✓' if has_jd else '✗'} · "
        f"{len(context_chunks)} chunks retrieved"
    )
    update = {
        "context_chunks": context_chunks,
        "context_text": ctx_text,
        "profile_summary": profile_summary,
        "jd_summary": jd_summary,
        "has_profile": has_profile,
        "has_jd": has_jd,
        "sources": _sources_from_chunks(context_chunks),
    }
    update.update(_pipeline(state, "context", "Knowledge Base Retrieval", detail, (time.time() - t0) * 1000))
    return update


# ---------------------------------------------------------------------------
# 3. INTERVIEW COACH — one specialized agent per round type
# ---------------------------------------------------------------------------


def interview_node(state: ChatState) -> dict:
    t0 = time.time()
    itype = state.get("interview_type") or "hr"
    is_answer = state.get("is_answer", False)
    pending = state.get("pending_question", "")
    asked = list(state.get("asked_questions") or [])
    user_message = state.get("user_message", "")

    update: dict = {"new_interview_type": itype, "turn_increment": 1}
    evaluation = None
    llm = get_llm(state.get("provider"))

    # ---- structured scoring when the user answered ----
    if is_answer and pending:
        if state.get("provider") != "demo":
            role_ctx = (state.get("profile_summary", "") or "") + "\n" + (state.get("jd_summary", "") or "")
            evaluation = dspy_config.score_answer_dspy(state["provider"], pending, user_message, role_ctx)
        if evaluation is None:
            evaluation = fallbacks.demo_interview_reply(
                itype, True, pending, asked, user_message,
                state.get("context_chunks"), state.get("context_text", ""),
            )[1]
        update["score_to_append"] = evaluation

    # ---- generate the coach message ----
    if llm is not None:
        template = prompts.COACH_PROMPTS.get(itype, prompts.HR_COACH_PROMPT)
        sys_prompt = prompts.render(
            template,
            candidate_profile=state.get("profile_summary", "") or "(none uploaded yet — run a general session)",
            job_description=state.get("jd_summary", "") or "(none uploaded yet — stay general)",
            conversation_history=prompts.history_block(state.get("history") or []),
            interview_state=prompts.interview_state_block(
                {
                    "interview": {
                        "mode": state.get("selected_mode", "auto"),
                        "pending_question": pending,
                        "asked_questions": asked,
                        "turn_count": state.get("turn_count", 0),
                    }
                }
            ),
        )
        try:
            reply = llm.invoke(
                [
                    ("system", sys_prompt),
                    ("human", user_message),
                ]
            ).content.strip()
        except Exception as e:  # LLM failed mid-flight → demo fallback
            reply = None
            state = {**state, "_llm_error": str(e)}  # logged, not exposed
    else:
        reply = None

    if reply is None:
        reply, evaluation = fallbacks.demo_interview_reply(
            itype, is_answer, pending, asked, user_message,
            state.get("context_chunks"), state.get("context_text", ""),
        )
        update["score_to_append"] = evaluation if is_answer else None

    # ---- update interview session state ----
    question = _extract_question(reply)
    if question:
        asked.append(question)
    update["new_pending_question"] = question
    update["updated_asked_questions"] = asked
    update["response"] = reply
    update["evaluation"] = evaluation if is_answer else None

    label = {
        "hr": "HR Coach",
        "technical": "Technical Coach",
        "coding": "Coding Coach",
        "culture_fit": "Culture-Fit Coach",
    }.get(itype, "Coach")
    detail = ("evaluated answer + next question" if is_answer else "new question") + (
        " · grounded in your documents" if state.get("has_profile") or state.get("has_jd") else " · general mode"
    )
    update.update(_pipeline(state, "interview", label, detail, (time.time() - t0) * 1000))
    return update


# ---------------------------------------------------------------------------
# 4. RESUME TAILOR
# ---------------------------------------------------------------------------


def resume_node(state: ChatState) -> dict:
    t0 = time.time()
    llm = get_llm(state.get("provider"))
    reply = None

    if llm is not None and (state.get("has_profile") or state.get("context_chunks")):
        sys_prompt = prompts.render(
            prompts.RESUME_TAILOR_PROMPT,
            candidate_profile=state.get("profile_summary", "") or "(none)",
            job_description=state.get("jd_summary", "") or "(none)",
            retrieved_context=prompts.context_block(state.get("context_chunks") or [])[0][:6000],
        )
        try:
            reply = llm.invoke(
                [("system", sys_prompt), ("human", state.get("user_message", "Tailor my resume for this role."))]
            ).content
        except Exception:
            reply = None

    if reply is None:
        reply = fallbacks.demo_tailor_resume(state.get("context_chunks"), state.get("has_jd", False))

    update = {
        "response": reply,
        "new_pending_question": "",
        "evaluation": None,
    }
    update.update(
        _pipeline(
            state, "resume", "Resume Tailor",
            "tailored resume built" if state.get("has_profile") else "guidance (no profile uploaded)",
            (time.time() - t0) * 1000,
        )
    )
    return update


# ---------------------------------------------------------------------------
# 5. RESUME CRITIC
# ---------------------------------------------------------------------------


def _parse_json_block(text: str) -> dict | None:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*|\s*```$", "", text, flags=re.S)
    try:
        return json.loads(text)
    except Exception:
        m = re.search(r"\{.*\}", text, flags=re.S)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                return None
    return None


def critique_node(state: ChatState) -> dict:
    t0 = time.time()
    draft = state.get("user_message", "")
    llm = get_llm(state.get("provider"))
    evaluation = None
    reply = None

    if llm is not None:
        sys_prompt = prompts.render(
            prompts.RESUME_CRITIC_PROMPT,
            candidate_profile=state.get("profile_summary", "") or "(none)",
            job_description=state.get("jd_summary", "") or "(none — judge on general strength)",
            resume_draft=draft[:8000],
        )
        try:
            raw = llm.invoke(
                [("system", sys_prompt), ("human", "Review this resume draft.")]
            ).content
            evaluation = _parse_json_block(raw)
        except Exception:
            evaluation = None

    if evaluation is None:
        evaluation = fallbacks.demo_critique_resume(draft, state.get("context_text", ""), state.get("has_jd", False))

    dims = evaluation.get("dimensions", {})
    overall = evaluation.get("overall") or round(sum(dims.values()) / max(1, len(dims)), 1)

    strengths = "\n".join(f"- ✅ {s}" for s in evaluation.get("strengths", [])[:4])
    improvements = evaluation.get("improvements", [])
    if improvements and isinstance(improvements[0], dict):
        imp_lines = "\n".join(
            f"- 🔧 **{i.get('section', 'General')}** — {i.get('issue', '')}\n  ↳ *Fix:* {i.get('fix', '')}"
            for i in improvements[:5]
        )
    else:
        imp_lines = "\n".join(f"- 🔧 {i}" for i in improvements[:5])
    missing = evaluation.get("missing_keywords") or []
    missing_line = (
        "\n\n**Missing keywords to weave in:** " + ", ".join(f"`{k}`" for k in missing[:10])
        if missing else ""
    )
    rewritten = evaluation.get("rewritten_summary")
    rewritten_block = f"\n\n**Suggested professional summary:**\n> {rewritten}" if rewritten else ""

    reply = (
        f"## Resume review — overall **{overall}/10**\n\n"
        + " · ".join(f"**{k.replace('_', ' ').title()}** {v}/10" for k, v in dims.items())
        + f"\n\n**What works**\n{strengths or '- (see improvements — there is room to grow)'}"
        + f"\n\n**What to fix**\n{imp_lines}"
        + missing_line
        + rewritten_block
        + ("\n\n> ⚡ *Score computed with heuristic analysis (Demo Mode).*" if evaluation.get("method") == "heuristic" else "")
    )

    update = {
        "response": reply,
        "evaluation": {"overall": overall, "dimensions": dims, "method": evaluation.get("method", "llm")},
        "new_pending_question": "",
    }
    update.update(_pipeline(state, "critique", "Resume Critic", f"scored draft {overall}/10", (time.time() - t0) * 1000))
    return update


# ---------------------------------------------------------------------------
# 6. GENERAL ASSISTANT
# ---------------------------------------------------------------------------


def general_node(state: ChatState) -> dict:
    t0 = time.time()
    llm = get_llm(state.get("provider"))
    reply = None

    if llm is not None:
        sys_prompt = prompts.render(
            prompts.GENERAL_ASSISTANT_PROMPT,
            candidate_profile=state.get("profile_summary", "") or "(none)",
            job_description=state.get("jd_summary", "") or "(none)",
            conversation_history=prompts.history_block(state.get("history") or []),
        )
        try:
            reply = llm.invoke([("system", sys_prompt), ("human", state.get("user_message", ""))]).content.strip()
        except Exception:
            reply = None

    if reply is None:
        reply = fallbacks.demo_general_reply(
            state.get("user_message", ""),
            state.get("has_profile", False),
            state.get("has_jd", False),
            state.get("context_chunks"),
        )

    update = {"response": reply, "new_pending_question": ""}
    grounded = state.get("has_profile") or state.get("has_jd")
    update.update(
        _pipeline(state, "general", "Career Assistant",
                  "grounded in your documents" if grounded else "general mode",
                  (time.time() - t0) * 1000)
    )
    return update
