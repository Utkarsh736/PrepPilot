"""Heuristic scoring produces stable structure and ranks strong > weak."""

from app.eval.heuristics import score_answer, star_analysis


STRONG = (
    "At my previous company in 2023, two senior engineers disagreed on API design. "
    "I was tasked with unblocking the release. I scheduled a design review, wrote a "
    "decision doc comparing options with latency and complexity trade-offs, and "
    "facilitated a vote. We shipped on time and reduced P99 latency by 18%."
)
WEAK = "There was some conflict and I talked to people and it got better."


def test_star_detects_action_and_result():
    star = star_analysis(STRONG)
    assert star["action"]["present"]
    assert star["result"]["present"]


def test_strong_scores_higher_than_weak():
    q = "Tell me about a time you handled conflict on a team."
    s = score_answer(q, STRONG)
    w = score_answer(q, WEAK)
    assert s["overall"] > w["overall"]
    assert set(s["dimensions"]) == {"relevance", "structure", "depth", "communication"}
    assert s["method"] == "heuristic"


def test_weak_has_improvements():
    q = "Tell me about a time you handled conflict on a team."
    w = score_answer(q, WEAK)
    assert len(w["improvements"]) >= 1
