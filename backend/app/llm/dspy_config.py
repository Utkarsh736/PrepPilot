"""DSPy configuration — structured prediction for intent routing & scoring.

DSPy is used for the *structured* parts of the pipeline (intent
classification, answer scoring) while LangGraph orchestrates the agents and
LangChain drives free-form generation. If DSPy or its LM backend cannot be
configured (e.g. missing API key), every helper here returns ``None`` and the
caller falls back to deterministic heuristics — the app never breaks.
"""

from __future__ import annotations

import threading
from typing import Optional

from app.config import settings

_lock = threading.Lock()
_lms: dict[str, object] = {}

try:
    import dspy  # noqa: F401

    DSPY_AVAILABLE = True
except Exception:  # pragma: no cover
    dspy = None
    DSPY_AVAILABLE = False


# ---------------------------------------------------------------------------
# Signatures
# ---------------------------------------------------------------------------

if DSPY_AVAILABLE:

    class ClassifyIntent(dspy.Signature):
        """Route a user message inside an interview-prep assistant.

        Pick the intent that best matches the user's latest message given the
        recent conversation and which interview mode is active.
        """

        user_message: str = dspy.InputField(desc="The user's latest message")
        conversation_excerpt: str = dspy.InputField(desc="Last few turns of chat, may be empty")
        active_mode: str = dspy.InputField(desc="Selected interview mode: auto|hr|technical|coding|culture_fit")
        last_question_asked: str = dspy.InputField(desc="The pending interview question, if any")

        intent: str = dspy.OutputField(
            desc="One of: interview | resume | critique | general"
        )
        interview_type: str = dspy.OutputField(
            desc="If intent=interview: hr | technical | coding | culture_fit, else 'none'"
        )
        is_answer: bool = dspy.OutputField(
            desc="True if the message is mainly an answer to the pending question (not a new request)"
        )

    class ScoreAnswer(dspy.Signature):
        """Score a candidate's interview answer against a question and role context."""

        question: str = dspy.InputField()
        answer: str = dspy.InputField(desc="The candidate's answer")
        role_context: str = dspy.InputField(desc="Candidate profile / job description context, may be empty")

        relevance: int = dspy.OutputField(desc="1-10, does it answer the question")
        structure: int = dspy.OutputField(desc="1-10, organization e.g. STAR for behavioral")
        depth: int = dspy.OutputField(desc="1-10, specifics, metrics, ownership")
        communication: int = dspy.OutputField(desc="1-10, clarity and conciseness")
        strengths: str = dspy.OutputField(desc="2-4 bullet-separated strengths")
        improvements: str = dspy.OutputField(desc="2-4 bullet-separated concrete improvements")
        model_answer: str = dspy.OutputField(desc="A strong 4-6 sentence sample answer")


# ---------------------------------------------------------------------------
# LM plumbing
# ---------------------------------------------------------------------------


def get_dspy_lm(provider: str):
    """Return a cached DSPy LM for the provider, or None if unavailable."""
    if not DSPY_AVAILABLE:
        return None
    from app.llm import resolve_provider

    pid = resolve_provider(provider)
    if pid == "demo":
        return None

    with _lock:
        if pid in _lms:
            return _lms[pid]

        lm = None
        try:
            if pid == "gemini":
                lm = dspy.LM(
                    f"gemini/{settings.providers['gemini'].model}",
                    api_key=settings.google_key,
                    temperature=settings.temperature,
                    max_tokens=4096,
                )
            elif pid == "groq":
                lm = dspy.LM(
                    f"groq/{settings.providers['groq'].model}",
                    api_key=settings.groq_key,
                    temperature=settings.temperature,
                    max_tokens=4096,
                )
            elif pid == "openrouter":
                lm = dspy.LM(
                    f"openrouter/{settings.providers['openrouter'].model}",
                    api_key=settings.openrouter_key,
                    temperature=settings.temperature,
                    max_tokens=4096,
                )
        except Exception:  # pragma: no cover
            lm = None

        if lm is not None:
            _lms[pid] = lm
        return lm


def classify_intent(
    provider: str,
    user_message: str,
    conversation_excerpt: str,
    active_mode: str,
    last_question: str,
) -> Optional[dict]:
    """DSPy intent classification. Returns dict or None (=> use heuristics)."""
    lm = get_dspy_lm(provider)
    if lm is None:
        return None
    try:
        with dspy.context(lm=lm):
            predictor = dspy.ChainOfThought(ClassifyIntent)
            out = predictor(
                user_message=user_message,
                conversation_excerpt=conversation_excerpt[:2000],
                active_mode=active_mode or "auto",
                last_question_asked=last_question or "(none)",
            )
            intent = str(out.intent).strip().lower()
            itype = str(out.interview_type).strip().lower()
            is_answer_raw = str(out.is_answer).strip().lower()
            is_answer = is_answer_raw in ("true", "yes", "1")

            if intent not in ("interview", "resume", "critique", "general"):
                intent = "general"
            if itype not in ("hr", "technical", "coding", "culture_fit", "none"):
                itype = "none"
            return {
                "intent": intent,
                "interview_type": itype if intent == "interview" else "none",
                "is_answer": bool(is_answer),
            }
    except Exception:
        return None


def score_answer_dspy(
    provider: str,
    question: str,
    answer: str,
    role_context: str,
) -> Optional[dict]:
    """DSPy structured scoring of an interview answer. None => heuristics."""
    lm = get_dspy_lm(provider)
    if lm is None:
        return None
    try:
        with dspy.context(lm=lm):
            predictor = dspy.ChainOfThought(ScoreAnswer)
            out = predictor(
                question=question[:1500],
                answer=answer[:6000],
                role_context=role_context[:2500] or "(none provided)",
            )

            def _clamp(v) -> int:
                try:
                    n = int(round(float(str(v).strip().split()[0])))
                except Exception:
                    n = 5
                return max(1, min(10, n))

            dims = {
                "relevance": _clamp(out.relevance),
                "structure": _clamp(out.structure),
                "depth": _clamp(out.depth),
                "communication": _clamp(out.communication),
            }
            overall = round(sum(dims.values()) / len(dims), 1)
            strengths = [s.strip("-• ").strip() for s in str(out.strengths).split("\n") if s.strip()]
            improvements = [s.strip("-• ").strip() for s in str(out.improvements).split("\n") if s.strip()]
            return {
                "overall": overall,
                "dimensions": dims,
                "strengths": strengths[:4],
                "improvements": improvements[:4],
                "model_answer": str(out.model_answer).strip(),
            }
    except Exception:
        return None
