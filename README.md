# Prep Pilot ✈️

**Practice the interview before it happens.**

Prep Pilot is an AI interview coach and resume tailor. Upload your resumes, work experience, education, and target job descriptions. It builds a private knowledge base, then runs realistic interview rounds and rewrites your resume against the role — grounded in *your* documents via a RAG agentic pipeline.

Works with or without uploaded context: with documents every answer is grounded in your experience; without them, agents fall back to high-quality general coaching (and a full Demo Mode that needs no API keys).

---

## Features

- **Interview practice** — four round types: HR / behavioral, Technical, Coding, Culture-Fit. One question at a time, scored feedback on every answer (relevance, structure, depth, communication + STAR analysis).
- **Resume tailoring** — keyword mirroring and ATS-oriented rewrites optimized against a target job description.
- **Resume critique** — rubric + rewritten bullets for any draft you paste.
- **Agent pipeline trace** — see which agent ran and which documents grounded the reply.
- **Demo Mode** — template coaching + real heuristic scoring (STAR detection, keyword overlap) with zero API keys.
- **Switchable free-tier LLMs** — Google Gemini (recommended), Groq, or OpenRouter.

---

## Architecture

```
┌────────────────────────── Next.js 16 frontend (port 3000)
│   Landing + workspace: chat, document upload, mode/model selectors,
│   scorecards, agent pipeline trace
│                    │  fetch /api/*  (or NEXT_PUBLIC_API_BASE)
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
│   • Gemini / Groq / OpenRouter (LangChain) — switchable
│   • DSPy for structured intent routing + answer scoring
│   • pypdf + python-docx document parsing
│   • Demo Mode: heuristic STAR/keyword analysis, no key needed
└──────────────────────────────────────────────────────────────
```

**Key paths**

| Path | Purpose |
|------|---------|
| `backend/app/agents/` | LangGraph graph, nodes, prompts, fallbacks, state |
| `backend/app/rag/` | PDF/DOCX/TXT parser, ChromaDB store, sessions |
| `backend/app/llm/` | LangChain LLM factory + DSPy config |
| `backend/app/eval/` | Heuristic STAR / keyword scoring |
| `src/components/copilot/` | Chat UI, sidebar, scorecards, pipeline trace |
| `src/components/landing/` | Landing page |

---

## Quick start

### Prerequisites

- **Node.js 20+** (or Bun)
- **Python 3.11+**
- **[uv](https://docs.astral.sh/uv/)** (Python package manager)

### 1. Backend

```bash
cd backend
cp .env.example .env          # add at least one API key for full AI mode
uv sync
bash run.sh                   # or: uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend listens on **http://localhost:8000**.

### 2. Frontend

```bash
# from repo root
bun install                   # or: npm install / pnpm install
# optional: point at local backend
echo 'NEXT_PUBLIC_API_BASE=http://localhost:8000' > .env.local
bun run dev                   # or: npm run dev — http://localhost:3000
```

Without `NEXT_PUBLIC_API_BASE`, the client assumes a same-origin gateway that forwards `?XTransformPort=8000` (sandbox-style). For pure local dev, set the env var so the frontend talks to FastAPI directly (CORS is enabled).

### 3. API keys (free tiers)

Edit `backend/.env` — you only need **one**:

| Provider | Get key | Env var | Notes |
|----------|---------|---------|-------|
| **Google Gemini** ⭐ | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | `GOOGLE_API_KEY` | Most generous free tier; also powers embeddings |
| Groq | [console.groq.com/keys](https://console.groq.com/keys) | `GROQ_API_KEY` | Very fast free inference |
| OpenRouter | [openrouter.ai/keys](https://openrouter.ai/keys) | `OPENROUTER_API_KEY` | Use models ending in `:free` |

No key? The app runs in **Demo Mode**. Switch providers anytime from the sidebar; `MODEL_PROVIDER` sets the default.

---

## Using it

1. Open the app → a session is created automatically.
2. **Upload context** (sidebar → Knowledge base): resume PDFs/DOCX/TXT, job descriptions, work experience, education — files or pasted text. Badges show what’s loaded.
3. **Pick a mode** (Auto / HR / Technical / Coding / Culture) and chat:
   - *“Start an HR round”* → question → answer → scorecard
   - *“Tailor my resume for this job”* → Resume Tailor (needs profile + JD)
   - Paste a resume draft → *“review my resume”* → rubric + rewritten bullets
   - *“How do I negotiate salary?”* → grounded career assistant
4. Every assistant message shows the **agent pipeline trace** and which documents grounded it.

---

## Scripts

| Script | Purpose |
|--------|---------|
| `backend/run.sh` | Install deps (if needed) and start FastAPI with reload |
| `scripts/test_backend.sh` | Curl-based smoke tests against a running backend |
| `scripts/make_test_pdfs.py` | Generate sample PDFs for manual testing |
| `scripts/e2e-verify.sh` | End-to-end verification helper |

---

## Tech stack

**Frontend:** Next.js 16 · TypeScript · Tailwind CSS 4 · shadcn/ui · Framer Motion · Fraunces / Geist typography  

**Backend:** FastAPI · uv · LangGraph · LangChain · DSPy · ChromaDB · pypdf · python-docx  

**LLMs:** Gemini / Groq / OpenRouter free tiers  

**Design:** Quiet-cockpit UI — warm paper background, clearance-green accent, attitude-indicator brand mark, restrained aviation motifs.

---

## License

MIT (or your preferred license — update as needed).

---

Built for job seekers who want realistic practice, not generic chat.
