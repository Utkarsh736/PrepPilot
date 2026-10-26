"""Unit tests for the deterministic (regex) intent router — no API keys."""

from app.agents.nodes import _heuristic_router


def _route(msg: str, pending: str = "", mode: str = "auto") -> dict:
    return _heuristic_router(
        {
            "user_message": msg,
            "pending_question": pending,
            "selected_mode": mode,
            "interview_current_type": "",
        }
    )


def test_hr_round():
    r = _route("Start an HR round")
    assert r["intent"] == "interview"
    assert r["interview_type"] == "hr"


def test_technical_round():
    r = _route("Let's do a technical interview")
    assert r["intent"] == "interview"
    assert r["interview_type"] == "technical"


def test_coding_round():
    r = _route("Quiz me on coding algorithms")
    assert r["intent"] == "interview"
    assert r["interview_type"] == "coding"


def test_resume_tailor():
    r = _route("Tailor my resume for this job")
    assert r["intent"] == "resume"


def test_critique():
    r = _route("Please review my resume draft")
    assert r["intent"] == "critique"


def test_general():
    r = _route("How do I negotiate salary?")
    assert r["intent"] == "general"


def test_pending_long_message_is_answer():
    pending = "Tell me about a time you led a project."
    answer = (
        "In 2022 I led a six-person team migrating our billing service to event-driven "
        "architecture. I designed the dual-write phase, coordinated cutover, and we "
        "reduced failed charges by 40 percent within a quarter."
    )
    r = _route(answer, pending=pending)
    assert r["intent"] == "interview"
    assert r["is_answer"] is True
