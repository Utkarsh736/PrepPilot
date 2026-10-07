"""LangGraph state shared by every agent node in the pipeline."""

from __future__ import annotations

from typing import Annotated, Any, TypedDict


def merge_list(current: list | None, update: list | None) -> list:
    """Reducer: append-only lists (pipeline trace, sources, scores)."""
    out = list(current or [])
    out.extend(update or [])
    return out


class ChatState(TypedDict, total=False):
    # ---- request inputs (set by the API layer) ----
    session_id: str
    user_message: str
    history: list[dict]              # [{"role","content"}]
    selected_mode: str               # auto | hr | technical | coding | culture_fit
    provider: str                    # gemini | groq | openrouter | demo

    # ---- session snapshot (read-only inputs) ----
    pending_question: str
    asked_questions: list[str]
    interview_current_type: str
    turn_count: int
    doc_types_present: list[str]

    # ---- routing results ----
    intent: str                      # interview | resume | critique | general
    interview_type: str              # hr | technical | coding | culture_fit | ""
    is_answer: bool

    # ---- retrieved context ----
    context_chunks: list[Any]        # StoredChunk objects
    context_text: str
    profile_summary: str
    jd_summary: str
    has_profile: bool
    has_jd: bool

    # ---- outputs ----
    response: str
    evaluation: dict | None
    sources: Annotated[list[dict], merge_list]
    pipeline: Annotated[list[dict], merge_list]

    # ---- session updates applied by the API layer after the run ----
    new_pending_question: str
    updated_asked_questions: list[str]
    new_interview_type: str
    turn_increment: int
    score_to_append: dict | None
