"""Session persistence — one JSON file per session under data/sessions/.

A session holds:
* chat history (user / assistant messages, with rich metadata),
* document registry (mirrors what was ingested into Chroma),
* interview state (current pending question, mode, questions asked,
  per-answer scores) so coaches behave like a real interviewer across turns.
"""

from __future__ import annotations

import json
import threading
import time
import uuid
from pathlib import Path

from app.config import settings

_lock = threading.Lock()
SESSIONS_DIR = settings.data_dir / "sessions"
SESSIONS_DIR.mkdir(parents=True, exist_ok=True)

MAX_HISTORY_MESSAGES = 80  # rolling window persisted


def _session_path(session_id: str) -> Path:
    safe = "".join(c for c in session_id if c.isalnum() or c in "-_")
    return SESSIONS_DIR / f"{safe}.json"


def new_session() -> dict:
    sid = uuid.uuid4().hex[:16]
    session = {
        "session_id": sid,
        "created_at": time.time(),
        "messages": [],
        "documents": [],
        "interview": {
            "mode": "auto",            # auto | hr | technical | coding | culture_fit
            "current_type": "",        # type of the running interview
            "pending_question": "",    # question awaiting an answer
            "asked_questions": [],     # list[str]
            "turn_count": 0,
            "scores": [],              # list of evaluation dicts
        },
        "totals": {"messages": 0, "documents": 0},
    }
    _save(session)
    return session


def _save(session: dict) -> None:
    path = _session_path(session["session_id"])
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(session, ensure_ascii=False, indent=1))
    tmp.replace(path)


def load_session(session_id: str) -> dict | None:
    path = _session_path(session_id)
    if not path.exists():
        return None
    try:
        data = json.loads(path.read_text())
        # forward compatibility for older shapes
        data.setdefault("interview", {})
        data["interview"].setdefault("mode", "auto")
        data["interview"].setdefault("pending_question", "")
        data["interview"].setdefault("asked_questions", [])
        data["interview"].setdefault("turn_count", 0)
        data["interview"].setdefault("scores", [])
        data.setdefault("documents", [])
        data.setdefault("messages", [])
        return data
    except Exception:
        return None


def get_or_create(session_id: str | None) -> dict:
    if session_id:
        session = load_session(session_id)
        if session is not None:
            return session
    return new_session()


def delete_session(session_id: str) -> bool:
    path = _session_path(session_id)
    if path.exists():
        path.unlink(missing_ok=True)
        return True
    return False


def list_sessions() -> list[dict]:
    out = []
    for path in SESSIONS_DIR.glob("*.json"):
        try:
            data = json.loads(path.read_text())
            out.append(
                {
                    "session_id": data.get("session_id"),
                    "created_at": data.get("created_at"),
                    "message_count": len(data.get("messages", [])),
                    "document_count": len(data.get("documents", [])),
                }
            )
        except Exception:
            continue
    return sorted(out, key=lambda s: s.get("created_at") or 0, reverse=True)


# ---------------------------------------------------------------------------
# Mutations
# ---------------------------------------------------------------------------


def add_message(
    session: dict,
    role: str,
    content: str,
    meta: dict | None = None,
) -> dict:
    msg = {
        "id": uuid.uuid4().hex[:10],
        "role": role,
        "content": content,
        "ts": time.time(),
        "meta": meta or {},
    }
    with _lock:
        session["messages"].append(msg)
        if len(session["messages"]) > MAX_HISTORY_MESSAGES:
            session["messages"] = session["messages"][-MAX_HISTORY_MESSAGES:]
        session["totals"]["messages"] += 1
        _save(session)
    return msg


def add_document(session: dict, doc_record: dict) -> None:
    with _lock:
        session["documents"].append(doc_record)
        session["totals"]["documents"] += 1
        _save(session)


def remove_document(session: dict, doc_id: str) -> dict | None:
    with _lock:
        for i, doc in enumerate(session["documents"]):
            if doc["doc_id"] == doc_id:
                removed = session["documents"].pop(i)
                _save(session)
                return removed
    return None


def update_interview(session: dict, **fields) -> None:
    with _lock:
        session["interview"].update(fields)
        _save(session)


def history_excerpt(session: dict, max_messages: int = 12, max_chars: int = 4000) -> list[dict]:
    """Recent turns for prompt context (newest last)."""
    msgs = session["messages"][-max_messages:]
    out: list[dict] = []
    total = 0
    for m in msgs:
        content = m["content"]
        if total + len(content) > max_chars:
            content = content[: max(0, max_chars - total)] + " …"
        out.append({"role": m["role"], "content": content})
        total += len(content)
    return out


def context_flags(session: dict) -> dict:
    """Which knowledge slices exist for this session (drives grounding)."""
    types = {d.get("doc_type") for d in session.get("documents", [])}
    return {
        "has_profile": bool(types & {"resume", "work_experience", "education"}),
        "has_resume": "resume" in types,
        "has_jd": "job_description" in types,
        "doc_count": len(session.get("documents", [])),
    }
