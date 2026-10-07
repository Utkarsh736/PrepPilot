"""Demo Mode — fully functional fallbacks when no LLM key is configured.

Every agent node calls into this module when `get_llm()` returns None.
Demo Mode is NOT a stub: it grounds itself in the user's actual uploaded
documents (via retrieved chunks + extracted keywords) and computes real
heuristics (STAR detection, keyword overlap). Responses are template-based
and clearly labeled as Demo Mode in the UI.
"""

from __future__ import annotations

import random
import re

from app.eval.heuristics import score_answer
from app.rag.store import extract_keywords

DEMO_NOTE = (
    "\n\n> ⚡ **Demo Mode** — no AI provider key detected, so this reply is "
    "template-based (question banks + real heuristic analysis of your text). "
    "Add a free `GOOGLE_API_KEY`, `GROQ_API_KEY` or `OPENROUTER_API_KEY` in "
    "`backend/.env` to unlock full AI coaching."
)

# ---------------------------------------------------------------------------
# Question banks — {placeholders} are filled from the user's documents
# ---------------------------------------------------------------------------

QUESTION_BANKS: dict[str, list[str]] = {
    "hr": [
        "To start: walk me through your background and what brings you to this opportunity.",
        "Tell me about yourself in 90 seconds — focus on the arc that leads to this role.",
        "What do you consider your single most impactful professional achievement so far, and why?",
        "Describe a time you disagreed with your manager. How did you handle it?",
        "Tell me about a conflict within your team. What was your role in resolving it?",
        "What is a professional weakness you are actively working on, and what is your plan?",
        "Why are you leaving your current position?",
        "Where do you see yourself in three years?",
        "Tell me about a time you failed. What did you learn and what changed afterwards?",
        "How do you prioritize when everything on your plate is “urgent”?",
        "What kind of work environment brings out your best performance?",
        "Do you have any questions about the role or the team?",
    ],
    "technical": [
        "Walk me through the architecture of a system you designed or worked on deeply. What were the key trade-offs?",
        "Pick a technology you know well{tech_hint}. What is a common mistake teams make with it?",
        "Describe the toughest production issue you have debugged. How did you find the root cause?",
        "How would you design a URL shortener serving 100M redirects/day?",
        "Explain a time you had to choose between speed and quality. What did you pick and why?",
        "How do you approach testing in your projects? What do you deliberately NOT test?",
        "Walk me through how you would scale {product_hint} to 10× its current load.",
        "What is the most complex bug you fixed in the last year? What tools did you use?",
        "How do you stay current with new technology, and how do you decide what to adopt?",
        "Explain a technical concept you find fascinating as if I were a non-technical stakeholder.",
    ],
    "coding": [
        "**Problem:** Given an array of integers and a target `k`, return the length of the longest subarray whose sum equals `k`.\n**Example:** `[1, -1, 5, -2, 3]`, `k=3` → `4` (subarray `[1, -1, 5, -2]`).\n**Constraints:** up to 10⁵ elements, values in [-10⁴, 10⁴]. **Your task:** describe your approach first (complexity!), then write the code.",
        "**Problem:** Design a LRU cache with `get(key)` and `put(key, value)` in O(1).\n**Example:** capacity 2 → put(1,1), put(2,2), get(1)=1, put(3,3) evicts key 2.\n**Constraints:** up to 10⁴ ops/sec. **Your task:** explain your data-structure choice, then implement it.",
        "**Problem:** Given a binary tree, serialize and deserialize it.\n**Constraints:** up to 10⁵ nodes. **Your task:** define your format, then code both functions.",
        "**Problem:** Find the top-K frequent words in a large log stream.\n**Example:** `['log','in','log','out']`, k=1 → `['log']`.\n**Constraints:** stream doesn't fit in memory. **Your task:** discuss your approach before coding.",
        "**Problem:** Merge overlapping intervals — e.g. `[[1,3],[2,6],[8,10]]` → `[[1,6],[8,10]]`.\n**Constraints:** up to 10⁶ intervals. **Your task:** sort strategy + in-place merge, then code it.",
        "**Code review:** a teammate submits `if (user.role == 'admin' || user.permissions.includes('write') && !user.suspended) { grant(); }` — review it. What bugs and readability issues do you see?",
        "**Problem:** Implement a rate limiter (sliding window) as a class.\n**Constraints:** 1000 requests/sec, memory bounded. **Your task:** pick the window strategy and justify it, then code.",
        "**Problem:** Detect a cycle in a linked list and return the node where it begins.\n**Constraints:** O(1) space. **Your task:** explain the invariant before coding.",
    ],
    "culture_fit": [
        "What kind of team brings out your best work, and what drains you?",
        "Tell me about a time you received tough feedback. What did you do with it?",
        "Your teammate repeatedly misses deadlines and you depend on their work. Walk me through your next 24 hours.",
        "Describe a decision you made that was unpopular with your team. How did you bring them along?",
        "What does “ownership” mean to you in practice? Give a concrete example from your work.",
        "Tell me about a time you had to deliver with ambiguous requirements. How did you reduce the ambiguity?",
        "How do you balance shipping fast vs. doing it right? Tell me about a time you chose each.",
        "What's something you believe about your craft that many colleagues disagree with?",
        "When you join a new team, what do you do in your first two weeks?",
        "Describe your ideal relationship with your manager.",
    ],
}

OPENERS = {
    "hr": "Welcome to your **HR & behavioral round**. I'll ask one question at a time — answer in as much detail as you like, and I'll give you feedback before moving on.",
    "technical": "Welcome to your **technical round**. Expect depth questions about your real projects and system design. One question at a time — think out loud.",
    "coding": "Welcome to your **coding round**. I'll give you practical challenges calibrated to your level. Describe your approach first, then code — clarity beats syntax.",
    "culture_fit": "Welcome to your **culture-fit round**. This is a conversation, not an interrogation — I want authentic stories about how you work with people.",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _fill(text: str, context_keywords: list[str]) -> str:
    """Replace {tech_hint}/{product_hint} with real terms from user docs."""
    kws = [k for k in context_keywords if len(k) > 2][:8]
    tech_hint = f" — for instance {random.choice(kws) if kws else 'from your stack'}" if kws else ""
    product_hint = f" a service like {'/'.join(kws[:3])}" if kws else " your product"
    return text.replace("{tech_hint}", tech_hint).replace("{product_hint}", product_hint)


def _pick_question(itype: str, asked: list[str], keywords: list[str]) -> str:
    bank = QUESTION_BANKS.get(itype, QUESTION_BANKS["hr"])
    remaining = [q for q in bank if q not in asked]
    if not remaining:  # bank exhausted → generate variations
        base = random.choice(bank)
        return f"Let's go deeper: {base.replace('Tell me about', 'Give me a different example of').replace('Describe', 'Now describe')}"
    return _fill(random.choice(remaining), keywords)


def _doc_keywords(context_chunks) -> list[str]:
    """Keywords for demo grounding — tech/skill terms first, then others."""
    from app.rag.store import _SKILL_HINTS

    kws: list[str] = []
    for c in context_chunks or []:
        kws.extend(extract_keywords(c.text, limit=10))
    # prefer skill-ish tokens so grounding phrases read naturally
    skill_kws = [k for k in kws if k in _SKILL_HINTS]
    other_kws = [k for k in kws if k not in _SKILL_HINTS]
    ordered = skill_kws + other_kws
    seen: set[str] = set()
    out = []
    for k in ordered:
        if k not in seen:
            seen.add(k)
            out.append(k)
    return out


# ---------------------------------------------------------------------------
# Demo implementations (mirrors the LLM agent contract)
# ---------------------------------------------------------------------------


def demo_interview_reply(
    itype: str,
    is_answer: bool,
    pending_question: str,
    asked: list[str],
    user_message: str,
    context_chunks,
    context_text: str,
) -> tuple[str, dict | None]:
    """Returns (markdown_reply, evaluation_or_None)."""
    kws = _doc_keywords(context_chunks)
    evaluation = None

    if is_answer and pending_question:
        evaluation = score_answer(pending_question, user_message, context_text)
        d = evaluation["dimensions"]
        fb_strengths = "\n".join(f"- ✅ {s}" for s in evaluation["strengths"])
        fb_improve = "\n".join(f"- 🔧 {s}" for s in evaluation["improvements"])
        star = evaluation.get("star", {})
        star_line = " · ".join(
            f"{k.upper()} {v}" for k, v in star.items()
        ) if star else ""

        reply = (
            f"**Feedback on your answer** *(heuristic analysis)*\n\n"
            f"**Score: {evaluation['overall']}/10** — relevance {d['relevance']} · "
            f"structure {d['structure']} · depth {d['depth']} · communication {d['communication']}\n\n"
            + (f"STAR check: {star_line}\n\n" if star_line else "")
            + f"**What worked**\n{fb_strengths}\n\n"
            f"**What to improve**\n{fb_improve}\n\n"
            "Now — let's keep the momentum.\n\n"
        )
    elif asked:
        reply = "Great — let's continue.\n\n"
    else:
        reply = OPENERS.get(itype, OPENERS["hr"]) + "\n\n"

    reply += f"**{_pick_question(itype, asked, kws)}**"

    grounding = ""
    if kws and random.random() < 0.6:
        grounding = (
            "\n\n*(Grounded in your documents: "
            + ", ".join(f"`{k}`" for k in kws[:6])
            + ")*"
        )

    return reply + grounding + DEMO_NOTE, evaluation


def demo_tailor_resume(context_chunks, has_jd: bool) -> str:
    if not context_chunks:
        return (
            "I don't have any of your documents yet, so I can't draft a resume "
            "without inventing facts — which I refuse to do.\n\n"
            "**To unlock resume tailoring:**\n"
            "1. Upload your current resume (PDF/DOCX/TXT) or paste your work experience in the sidebar.\n"
            "2. Upload or paste the job description you're targeting.\n"
            "3. Then ask me to tailor your resume.\n\n"
            "Even just your work experience as bullet notes is enough to get started."
            + DEMO_NOTE
        )

    kws = _doc_keywords(context_chunks)
    profile_chunks = [c for c in context_chunks if c.doc_type in ("resume", "work_experience", "education")]
    jd_chunks = [c for c in context_chunks if c.doc_type == "job_description"]

    # pull the densest chunk as a "summary seed"
    seed = max(profile_chunks, key=lambda c: len(c.text)) if profile_chunks else context_chunks[0]
    lines = [ln.strip() for ln in seed.text.split("\n") if ln.strip()][:14]

    jd_note = (
        "calibrated against your target job description" if has_jd else "no job description uploaded yet — general optimization"
    )

    matched = ", ".join(f"`{k}`" for k in kws[:14]) or "*(add more detail to your documents for better keyword coverage)*"

    body = "\n".join(f"> {ln}" for ln in lines)

    return (
        "**Demo Mode resume draft — assembled from your actual documents.**\n"
        f"*Tailoring strategy: extracted your strongest experience lines and top keywords, {jd_note}.*\n\n"
        f"## Experience & highlights (from your documents)\n{body}\n\n"
        f"## Keyword profile detected in your documents\n{matched}\n\n"
        f"## Next steps\n"
        f"- Review the experience lines above — pick the 3-5 strongest ones.\n"
        f"- {'Re-order bullets so JD-critical keywords appear in the top third of the resume.' if has_jd else 'Upload a job description so I can mirror its exact keywords and must-haves.'}\n"
        f"- Add one quantified metric to every bullet you keep (%, time saved, scale).\n\n"
        f"⚠️ In Demo Mode I keep your original wording — with an AI provider key I will rewrite each bullet, "
        f"reorder sections, and generate an ATS keyword coverage table."
        + DEMO_NOTE
    )


def demo_critique_resume(draft: str, context_text: str, has_jd: bool) -> dict:
    from app.eval.heuristics import keyword_overlap, text_stats

    stats = text_stats(draft)
    bullets = len(re.findall(r"^\s*[-•*·]\s+\S", draft, flags=re.M))
    has_metrics = bool(re.search(r"\d+\s?%|\b\d{2,}\b", draft))
    has_contact = bool(re.search(r"[\w.+-]+@[\w-]+\.\w+|linkedin\.com/\w+", draft))
    overlap = keyword_overlap(draft, context_text, limit=12) if context_text else {"matched": [], "missing": [], "ratio": 0}

    impact = min(10, 3 + (2 if bullets >= 5 else 0) + (3 if has_metrics else 0))
    relevance = min(10, 4 + int(overlap["ratio"] * 6))
    ats = min(10, 6 + (2 if has_contact else 0) + (1 if bullets >= 3 else 0) - (1 if stats["avg_sentence_len"] > 30 else 0))
    language = min(10, 5 + (2 if bullets >= 4 else 0))
    conciseness = max(1, min(10, 10 - max(0, stats["word_count"] - 650) // 100))

    dims = {
        "impact": impact,
        "relevance": relevance,
        "ats_format": ats,
        "language": language,
        "conciseness": conciseness,
    }

    improvements = []
    if not has_metrics:
        improvements.append(
            {"section": "Experience", "issue": "No quantified outcomes detected", "fix": "Add metrics: “Improved checkout latency 40% (p95 800ms→480ms) for 2M monthly users”"}
        )
    if overlap["missing"]:
        improvements.append(
            {"section": "Skills", "issue": "Role-relevant keywords missing", "fix": "Weave in: " + ", ".join(overlap["missing"][:6])}
        )
    if not has_contact:
        improvements.append({"section": "Header", "issue": "No email/LinkedIn found", "fix": "Add a contact line: email · LinkedIn · location"})
    if bullets < 4:
        improvements.append({"section": "Experience", "issue": "Few bullet points — low information density", "fix": "Convert prose paragraphs into 3-5 bullets per role, each starting with a strong verb"})

    return {
        "overall": round(sum(dims.values()) / 5, 1),
        "dimensions": dims,
        "strengths": [
            f"{bullets} structured bullet points — scannable layout",
            f"{stats['word_count']} words total",
        ],
        "improvements": improvements[:4],
        "missing_keywords": overlap["missing"][:8],
        "method": "heuristic",
    }


def demo_general_reply(user_message: str, has_profile: bool, has_jd: bool, context_chunks) -> str:
    kws = _doc_keywords(context_chunks)
    ctx_bits = []
    if has_profile:
        ctx_bits.append(f"your profile is loaded (I can see signals like {', '.join(f'`{k}`' for k in kws[:5])})")
    if has_jd:
        ctx_bits.append("your target job description is loaded")
    ctx_line = (
        "I'm working with real context: " + " and ".join(ctx_bits) + "."
        if ctx_bits
        else "no documents uploaded yet — I'll answer with general best practices, and you can upload a resume or job description anytime for grounded help."
    )

    msg = user_message.lower()
    if any(w in msg for w in ("salary", "negotiat", "offer", "compensation")):
        advice = (
            "**Salary negotiation basics**\n\n"
            "1. **Anchor on market data** — levels.fyi, Glassdoor, Pave for your level/city.\n"
            "2. **Never give the first number** — deflect with “I'd like to understand the band for this level first.”\n"
            "3. **Negotiate the package** — base, equity, sign-on, remote allowance, learning budget.\n"
            "4. **Silence is leverage** — after they respond to your counter, pause before replying.\n"
            "5. **Get it in writing** before resigning anywhere.\n"
        )
    elif any(w in msg for w in ("cover letter", "linkedin", "portfolio")):
        advice = (
            "**Making your application stand out**\n\n"
            "- Mirror the JD's top 5 keywords in your resume summary and skills.\n"
            "- Keep the cover letter to 3 paragraphs: why them, why you (1 proof story), why now.\n"
            "- LinkedIn headline = value prop, not job title.\n"
        )
    else:
        advice = (
            "Here's how I can help you land your target role:\n\n"
            "| What | How |\n|---|---|\n"
            "| **Interview practice** | Say “start an HR interview” (or technical / coding / culture fit) — one question at a time, scored feedback on every answer |\n"
            "| **Tailored resume** | Upload your resume + the job description, then say “tailor my resume” |\n"
            "| **Resume review** | Paste a resume draft and I'll score it against your JD |\n"
            "| **Career questions** | Ask me anything — negotiation, story building, ATS tips |\n"
        )

    return (
        f"{ctx_line}\n\n{advice}"
        "\n\n**Quick tip for any answer:** structure stories as **STAR** — Situation, Task, Action, Result — and always end with a number."
        + DEMO_NOTE
    )
