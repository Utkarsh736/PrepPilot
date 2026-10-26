# Prep Pilot backend — FastAPI + LangGraph (demo mode works with zero keys)
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY app ./app
COPY run.sh ./

ENV DATA_DIR=/app/data
ENV PYTHONUNBUFFERED=1
EXPOSE 8000

# Demo mode by default (no keys required)
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
