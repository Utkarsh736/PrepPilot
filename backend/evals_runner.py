"""Thin wrapper so `uv run python evals_runner.py --smoke` works from backend/."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from evals.run import main

if __name__ == "__main__":
    raise SystemExit(main())
