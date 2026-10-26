"""Session persistence: create, update interview state, delete."""

from app.rag import sessions as sess


def test_session_lifecycle():
    s = sess.new_session()
    sid = s["session_id"]
    assert len(sid) >= 8

    sess.update_interview(s, mode="hr", current_type="hr", pending_question="Q1?")
    loaded = sess.load_session(sid)
    assert loaded is not None
    assert loaded["interview"]["pending_question"] == "Q1?"

    sess.update_interview(loaded, turn_count=1, asked_questions=["Q1?"], pending_question="")
    loaded2 = sess.load_session(sid)
    assert loaded2["interview"]["turn_count"] == 1
    assert "Q1?" in loaded2["interview"]["asked_questions"]

    assert sess.delete_session(sid) is True
    assert sess.load_session(sid) is None
