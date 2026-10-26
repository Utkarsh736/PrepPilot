"""Eval runner: smoke (zero keys, CI) and full (optional LLM) modes.

Usage (from repo root or backend/):
  cd backend && uv run python -m evals.run --smoke
  cd backend && uv run python -m evals.run --full   # needs API keys
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

# Allow running as `python -m evals.run` with backend on sys.path
ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

DATASETS = ROOT / "evals" / "datasets"
RESULTS = ROOT / "evals" / "results"


def _load_json(name: str) -> list[dict]:
    path = DATASETS / name
    with path.open() as f:
        return json.load(f)


def _fingerprint() -> dict:
    prompts = BACKEND / "app" / "agents" / "prompts.py"
    ph = hashlib.sha256(prompts.read_bytes()).hexdigest()[:12] if prompts.exists() else "missing"
    return {
        "prompt_hash": ph,
        "provider": "demo",
        "model": "heuristic",
        "dataset_version": "smoke-v1",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def run_router_smoke() -> dict:
    from app.agents.nodes import _heuristic_router

    rows = [r for r in _load_json("intents_smoke.json") if r.get("smoke", True)]
    correct = 0
    failures = []
    for row in rows:
        state = {
            "user_message": row["utterance"],
            "pending_question": "",
            "selected_mode": "auto",
            "interview_current_type": "",
        }
        out = _heuristic_router(state)
        intent = out.get("intent", "general")
        itype = out.get("interview_type") or out.get("itype") or ""
        # nodes may use different key names — normalize
        if not itype and "interview_type" in out:
            itype = out["interview_type"]
        ok_intent = intent == row["expected_intent"]
        ok_sub = True
        if row["expected_subtype"] and row["expected_intent"] == "interview":
            ok_sub = (itype == row["expected_subtype"]) or (not itype and row["expected_subtype"] == "hr")
        ok = ok_intent and (ok_sub if row["expected_intent"] == "interview" else True)
        if ok:
            correct += 1
        else:
            failures.append(
                {
                    "utterance": row["utterance"],
                    "expected": row["expected_intent"],
                    "expected_subtype": row["expected_subtype"],
                    "got_intent": intent,
                    "got_subtype": itype,
                }
            )
    total = len(rows)
    return {
        "name": "router_accuracy_regex",
        "total": total,
        "correct": correct,
        "accuracy": round(correct / total, 4) if total else 0.0,
        "failures": failures,
    }


def run_state_machine_smoke() -> dict:
    """Interview flow transitions in demo mode via session helpers."""
    from app.rag import sessions as sess

    checks = []
    s = sess.new_session()
    sid = s["session_id"]
    checks.append(("session_created", bool(sid)))

    sess.update_interview(s, mode="hr", current_type="hr", pending_question="Tell me about yourself.")
    s2 = sess.load_session(sid)
    checks.append(("pending_question_set", bool(s2 and s2.get("interview", {}).get("pending_question"))))

    sess.update_interview(
        s2,
        pending_question="",
        turn_count=1,
        asked_questions=["Tell me about yourself."],
    )
    # append a scorecard-like entry
    scores = s2.setdefault("interview", {}).setdefault("scores", [])
    scores.append({"question": "Tell me about yourself.", "overall": 7.5})
    sess._save(s2)
    s3 = sess.load_session(sid)
    checks.append(("turn_count", s3.get("interview", {}).get("turn_count") == 1))
    checks.append(("score_appended", len(s3.get("interview", {}).get("scores", [])) == 1))
    checks.append(("asked_questions", "Tell me about yourself." in (s3.get("interview", {}).get("asked_questions") or [])))

    sess.delete_session(sid)
    checks.append(("session_deleted", sess.load_session(sid) is None))

    passed = sum(1 for _, ok in checks if ok)
    return {
        "name": "interview_state_machine",
        "total": len(checks),
        "correct": passed,
        "accuracy": round(passed / len(checks), 4),
        "checks": [{"name": n, "ok": ok} for n, ok in checks],
    }


def run_heuristic_agreement() -> dict:
    from app.eval.heuristics import score_answer

    rows = [r for r in _load_json("rubric_smoke.json") if r.get("smoke", True)]
    # Map continuous score to coarse label
    def to_label(overall: float) -> str:
        if overall >= 7.0:
            return "strong"
        if overall >= 4.5:
            return "medium"
        return "weak"

    correct = 0
    details = []
    for row in rows:
        result = score_answer(row.get("question", ""), row["answer_text"])
        overall = float(result.get("overall", result.get("score", 0)))
        pred = to_label(overall)
        ok = pred == row["human_label"]
        if ok:
            correct += 1
        details.append(
            {
                "question_id": row["question_id"],
                "human": row["human_label"],
                "predicted": pred,
                "overall": overall,
                "ok": ok,
            }
        )
    total = len(rows)
    return {
        "name": "heuristic_rubric_agreement",
        "total": total,
        "correct": correct,
        "accuracy": round(correct / total, 4) if total else 0.0,
        "details": details,
    }


def run_smoke() -> dict:
    RESULTS.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    report = {
        "mode": "smoke",
        "fingerprint": _fingerprint(),
        "suites": [
            run_router_smoke(),
            run_state_machine_smoke(),
            run_heuristic_agreement(),
        ],
        "elapsed_s": round(time.time() - t0, 3),
    }
    out = RESULTS / "smoke-latest.json"
    out.write_text(json.dumps(report, indent=2))
    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="PrepPilot eval runner")
    parser.add_argument("--smoke", action="store_true", help="Zero-key CI gate")
    parser.add_argument("--full", action="store_true", help="LLM suites (requires keys)")
    args = parser.parse_args(argv)

    if args.full:
        print("Full eval not implemented in this baseline — run --smoke.")
        return 2
    if not args.smoke and not args.full:
        args.smoke = True

    report = run_smoke()
    print(json.dumps(report, indent=2))
    # Fail CI if router accuracy collapses or state machine breaks
    for suite in report["suites"]:
        if suite["name"] == "interview_state_machine" and suite["accuracy"] < 1.0:
            print("FAIL: state machine checks incomplete", file=sys.stderr)
            return 1
        if suite["name"] == "router_accuracy_regex" and suite["accuracy"] < 0.6:
            print("FAIL: router accuracy below 60%", file=sys.stderr)
            return 1
    print("SMOKE OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
