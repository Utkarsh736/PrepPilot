# Interview Copilot 🎯

A conversational AI that helps job seekers **prepare for interviews** and **tailor their resumes** — grounded in their own documents via a RAG agentic pipeline.

Upload your resumes (PDF/DOCX/TXT), work experience, education and target job descriptions. The system builds a personal knowledge base, then:

- **Interview practice** across 4 round types — HR / behavioral, Technical, Coding, Culture-Fit — one question at a time with scored feedback on every answer
- **Resume tailoring** optimized against the target job description (keyword mirroring, ATS coverage)
- **Feedback & scoring** — rubric scorecards (relevance, structure, depth, communication), STAR analysis, model answers, resume draft critique

Works **with or without** uploaded context: with documents every answer is grounded in *your* experience; without them, agents fall back to high-quality general coaching.

---

## Architecture

```
┌────────────────────────── Next.js 16 frontend (port 3000)
│   landing + workspace: chat, document upload, mode/model selectors,
│   scorecards, agent pipeline trace
│                    │  fetch /api/*?XTransformPort=8000  (gateway)
▼
┌────────────────────────── FastAPI backend (port 8000, uv-managed)
│
│   LangGraph pipeline:
│
│            ┌────────┐     ┌─────────┐   ┌─────────────────────┐
│   message →│ router │ →   │ context │ → │ interview coach     │
│            │ (DSPy) │     │ (RAG)   │   │  hr|tech|coding|fit │
│            └────────┘     └─────────┘   ├─────────────────────┤
│                                       │ resume tailor       │
│                                       ├─────────────────────┤
│                                       │ resume critic       │
│                                       ├─────────────────────┤
│                                       │ general assistant   │
│                                       └─────────────────────┘
│
│   • ChromaDB vector store (one collection per session)
│   • Gemini / Groq / OpenRouter LLMs (LangChain) — switchable
│   • DSPy for structured intent routing + answer scoring
│   • pypdf + python-docx document parsing
│   • Demo Mode: heuristic STAR/keyword analysis, no key needed
└──────────────────────────────────────────────────────────────
```

**Key files**

| Path | Purpose |
|---|---|
| `backend/app/agents/prompts.py` | All multi-agent system prompts (coaches, evaluator, tailor, critic, condensers) |
| `backend/app/agents/graph.py` | LangGraph assembly (router → context → specialist → end) |
| `backend/app/agents/nodes.py` | Agent node implementations with graceful degradation |
| `backend/app/agents/fallbacks.py` | Demo Mode: question banks, template replies |
| `backend/app/llm/` | LangChain LLM factory + DSPy configuration |
| `backend/app/rag/` | PDF/DOCX/TXT parser, chunker, ChromaDB store, session persistence |
| `backend/app/eval/heuristics.py` | STAR detection, keyword overlap, heuristic scoring |
| `src/components/copilot/` | Chat UI, sidebar, scorecards, pipeline trace |

---

## Setup

### 1. Backend (Python + uv)

```bash
cd backend
uv sync                       # install all dependencies
cp .env.example .env          # then edit .env with your API keys (see below)
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Or simply `bash backend/run.sh`.

### 2. Frontend (Next.js 16)

```bash
bun install        # or npm install
bun run dev        # or npm run dev — serves on port 3000
```

**Routing note**

- In this sandbox/preview environment the Caddy gateway routes
  `/api/*?XTransformPort=8000` to the backend automatically — no config needed.
- For purely local development (no Caddy), create `.env.local` in the project
  root with `NEXT_PUBLIC_API_BASE=http://localhost:8000` — the backend has CORS
  enabled.

### 3. API keys (free tiers)

Edit `backend/.env` — you only need **one**:

| Provider | Key URL | Env var | Notes |
|---|---|---|---|
| **Google Gemini** ⭐ | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | `GOOGLE_API_KEY` | Most generous free tier; also powers embeddings |
| Groq | [console.groq.com/keys](https://console.groq.com/keys) | `GROQ_API_KEY` | Very fast free inference |
| OpenRouter | [openrouter.ai/keys](https://openrouter.ai/keys) | `OPENROUTER_API_KEY` | Pick any `:free` model |

No key? The app runs in **Demo Mode** — template-based coaching plus real
heuristic scoring (STAR detection, keyword overlap). Switch providers anytime
from the sidebar; `MODEL_PROVIDER` in `.env` sets the default.

---

## Using it

1. **Launch app** → a session is created automatically
2. **Upload context** (sidebar → Knowledge base): resume PDFs, JDs, work
   experience, education — files or pasted text. Badges show what's loaded
3. **Pick a mode** (Auto / HR / Technical / Coding / Culture) and chat:
   - *"Start an HR round"* → one question at a time → answer → scorecard
   - *"Tailor my resume for this job"* → Resume Tailor (needs profile + JD)
   - Paste a resume draft → *"review my resume"* → rubric + rewritten bullets
   - *"How do I negotiate salary?"* → grounded career assistant
4. Every assistant message shows the **agent pipeline trace** and which
   documents grounded it

---

## Tech stack

Next.js 16 · TypeScript · Tailwind CSS 4 · shadcn/ui · Framer Motion —
FastAPI · uv · LangGraph · LangChain · DSPy · ChromaDB · pypdf · python-docx —
Gemini / Groq / OpenRouter free tiers
