"""Heuristic answer & resume analysis.

These functions compute REAL, explainable metrics from text (no LLM needed).
They power Demo Mode and act as a safety net if the LLM scorer fails:
STAR-structure detection, keyword grounding vs. job description / resume,
length & clarity statistics.

The output shape matches the LLM evaluator contract exactly, so the UI can
render both identically.
"""

from __future__ import annotations

import re

from app.rag.store import extract_keywords

# ---------------------------------------------------------------------------
# STAR detection
# ---------------------------------------------------------------------------

_STAR_SIGNALS = {
    "situation": [
        r"\b(when|while|during|at my|we were|the team|the company|our client)",
        r"\bin \d{4}",
        r"\b(my previous|last|former) (role|company|job|project)",
        r"\b(the situation|context|backdrop|setting) (was|is)",
    ],
    "task": [
        r"\b(i was (asked|tasked|responsible)|my (task|job|goal|role) was|"
        r"we needed to|i had to|the objective)",
    ],
    "action": [
        r"\b(i (built|led|designed|implemented|created|migrated|refactored|"
        r"proposed|wrote|automated|negotiated|debugged|shipped|launched|"
        r"mentored|owned|drove|architected|optimized|delivered))",
        r"\b(my approach|i decided|i started by)",
    ],
    "result": [
        r"\b(resulted|achieved|reduced|increased|improved|saved|delivered|"
        r"grew|decreased|shipped)",
        r"\d+\s?%|\b\d+(k|m)?\s?(users|customers|hours|days|requests|rps|"
        r"records|rows)\b",
        r"\b(as a result|in the end|after \w+ (weeks|months))",
    ],
}

_CLARITY_FILLERS = [
    "um", "uh", "like i said", "basically", "kind of", "sort of",
    "you know", "i guess", "maybe", "actually", "literally", "stuff",
    "things like that",
]


def star_analysis(answer: str) -> dict[str, dict]:
    """Detect Situation/Task/Action/Result evidence with matched phrases."""
    text = answer.lower()
    found = {}
    for dim, patterns in _STAR_SIGNALS.items():
        evidence = []
        for pat in patterns:
            for m in re.finditer(pat, text):
                snippet = answer[max(0, m.start() - 10) : m.end() + 35].strip()
                snippet = re.sub(r"\s+", " ", snippet)
                evidence.append(snippet[:70])
                if len(evidence) >= 2:
                    break
            if len(evidence) >= 2:
                break
        found[dim] = {"present": bool(evidence), "evidence": evidence}
    return found


# ---------------------------------------------------------------------------
# Text stats
# ---------------------------------------------------------------------------


def text_stats(answer: str) -> dict:
    words = re.findall(r"[A-Za-z0-9+#.']+", answer)
    sentences = [s for s in re.split(r"[.!?]+\s|\n+", answer) if s.strip()]
    word_count = len(words)
    sent_count = max(1, len(sentences))
    avg_sentence = word_count / sent_count
    lower = answer.lower()
    filler_hits = sum(lower.count(f) for f in _CLARITY_FILLERS)
    filler_ratio = filler_hits / max(1, word_count)
    return {
        "word_count": word_count,
        "sentence_count": sent_count,
        "avg_sentence_len": round(avg_sentence, 1),
        "filler_ratio": round(filler_ratio, 4),
    }


# ---------------------------------------------------------------------------
# Keyword grounding
# ---------------------------------------------------------------------------


def keyword_overlap(answer: str, reference: str, limit: int = 14) -> dict:
    """Which important reference terms appear in the answer."""
    if not reference:
        return {"matched": [], "missing": [], "ratio": 0.0}
    ref_kws = extract_keywords(reference, limit=limit)
    lower = answer.lower()
    matched = [k for k in ref_kws if k in lower]
    missing = [k for k in ref_kws if k not in lower]
    ratio = len(matched) / max(1, len(ref_kws))
    return {"matched": matched, "missing": missing, "ratio": round(ratio, 2)}


# ---------------------------------------------------------------------------
# Scoring (output contract == LLM evaluator contract)
# ---------------------------------------------------------------------------


def score_answer(question: str, answer: str, role_context: str = "") -> dict:
    """Full heuristic evaluation of an interview answer."""
    stats = text_stats(answer)
    star = star_analysis(answer)
    overlap = keyword_overlap(answer, role_context or question, limit=12)

    wc = stats["word_count"]

    # ---- relevance: question-term echo + non-trivial length ----
    q_kws = extract_keywords(question, limit=8)
    q_echo = sum(1 for k in q_kws if k in answer.lower()) / max(1, len(q_kws))
    relevance = 3
    if wc >= 30:
        relevance = 4
    if wc >= 60:
        relevance += 1
    if q_echo >= 0.3:
        relevance += 1
    if q_echo >= 0.6:
        relevance += 1
    relevance = min(10, relevance + (1 if wc >= 120 else 0))

    # ---- structure: STAR presence ----
    present = sum(1 for d in star.values() if d["present"])
    structure = 2 + present * 2  # 2..10
    if wc >= 80:
        structure = min(10, structure + 1)

    # ---- depth: metrics + specifics ----
    has_numbers = bool(re.search(r"\d+\s?%|\b\d{2,}\b", answer))
    depth = 3
    if wc >= 80:
        depth += 1
    if has_numbers:
        depth += 2
    if overlap["ratio"] >= 0.25:
        depth += 1
    if star["result"]["present"]:
        depth += 1
    depth = min(10, depth)

    # ---- communication: sentence balance + filler ----
    communication = 7
    if stats["avg_sentence_len"] > 34:
        communication -= 1
    if stats["avg_sentence_len"] < 9 and wc > 40:
        communication -= 1
    if stats["filler_ratio"] > 0.02:
        communication -= 1
    if wc > 450:
        communication -= 1
    if 80 <= wc <= 350:
        communication += 1
    communication = max(1, min(10, communication))

    dims = {
        "relevance": relevance,
        "structure": structure,
        "depth": depth,
        "communication": communication,
    }
    overall = round(sum(dims.values()) / 4, 1)

    # ---- qualitative feedback ----
    strengths: list[str] = []
    improvements: list[str] = []

    if wc >= 80:
        strengths.append("Substantial answer with enough room to make your case")
    if star["action"]["present"]:
        strengths.append(
            f"Clear personal ownership — you describe your actions directly (e.g. “{star['action']['evidence'][0]}…”)"
        )
    if has_numbers:
        strengths.append("Includes concrete numbers — interviewers love quantified impact")
    if star["result"]["present"]:
        strengths.append("Closes the loop with a result/outcome — good STAR discipline")
    if overlap["matched"]:
        strengths.append(
            "Anchors to role-relevant terms: " + ", ".join(overlap["matched"][:5])
        )
    if not strengths:
        strengths.append("You engaged with the question directly — a base to build on")

    if not star["situation"]["present"]:
        improvements.append(
            "Open with 1-2 sentences of situation/context (where, when, what was at stake)"
        )
    if not star["task"]["present"]:
        improvements.append(
            "State your specific responsibility or goal in that situation — what were YOU accountable for?"
        )
    if not star["action"]["present"]:
        improvements.append(
            "Describe your concrete actions with strong verbs (led, built, migrated, negotiated…)"
        )
    if not star["result"]["present"]:
        improvements.append(
            "End with measurable results — % improvements, time saved, users affected"
        )
    if not has_numbers:
        improvements.append("Add at least one quantified metric to make the impact tangible")
    if wc < 60:
        improvements.append(
            "Too brief for an interview answer — aim for 60-90 seconds of speech (~150-250 words)"
        )
    if wc > 450:
        improvements.append("Too long — tighten to the strongest 5-6 sentences")
    if overlap["missing"]:
        improvements.append(
            "Weave in relevant keywords you missed: " + ", ".join(overlap["missing"][:6])
        )

    star_map = {d: ("✓" if star[d]["present"] else "✗") for d in ("situation", "task", "action", "result")}

    return {
        "overall": overall,
        "dimensions": dims,
        "strengths": strengths[:4],
        "improvements": improvements[:4],
        "star": star_map,
        "method": "heuristic",
        "word_count": wc,
    }


def looks_like_resume_draft(text: str) -> bool:
    """Cheap detector: does this text look like a pasted resume?"""
    if len(text) < 200:
        return False
    bullets = len(re.findall(r"^\s*[-•*·]\s+\S", text, flags=re.M))
    headings = len(re.findall(r"^\s*(experience|education|skills|summary|projects|work history)\b", text, flags=re.I | re.M))
    has_contact = bool(re.search(r"[\w.+-]+@[\w-]+\.\w+|linkedin\.com/\w+|\+?\d[\d\s-]{7,}", text))
    return bullets >= 4 or (headings >= 2 and bullets >= 2) or (has_contact and headings >= 1)
