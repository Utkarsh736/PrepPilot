#!/usr/bin/env bash
# Start the Interview Copilot backend (FastAPI + LangGraph + ChromaDB) on port 8000.
# First run: uv sync installs everything; .env is created from the example if missing.
set -e
cd "$(dirname "$0")"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "→ Created backend/.env from .env.example — add your API keys there for full AI mode."
fi

uv sync
exec uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
