# Worklog — Interview Copilot

---
Task ID: 1
Agent: main (Super Z)
Task: Build a RAG agentic interview-prep & resume-tailoring app (Next.js frontend + Python LangGraph backend, uv-managed, Gemini/Groq/OpenRouter free tiers, DSPy, ChromaDB, PDF parsing)

Work Log:
- Loaded fullstack-dev skill, initialized sandbox environment (Next.js 16 + Tailwind 4 + shadcn/ui on :3000, Caddy gateway on :81 with XTransformPort routing)
- Created `backend/` uv project: pyproject.toml (fastapi, langgraph, langchain, dspy, chromadb, langchain-{google-genai,groq,openai,chroma}, pypdf, python-docx), .env.example, run.sh
- `app/config.py`: env-driven settings + provider registry (gemini/groq/openrouter/demo) with graceful fallback chain
- `app/llm/__init__.py`: LangChain chat-model factory with timeouts; `dspy_config.py`: DSPy LM plumbing + ClassifyIntent & ScoreAnswer signatures
- `app/rag/parser.py`: PDF (pypdf, incl. encrypted-PDF handling), DOCX (python-docx incl. tables), TXT/MD; `store.py`: ChromaDB per-session collections, Gemini embeddings → local MiniLM fallback, keyword extraction; `sessions.py`: JSON session persistence (messages, docs, interview state)
- `app/agents/prompts.py`: full multi-agent prompt library (profile/JD condensers, 4 coach prompts with shared grounding preamble, answer evaluator, resume tailor, resume critic, general assistant) + render helpers
- `app/eval/heuristics.py`: real heuristic scoring — STAR detection, keyword overlap, text stats, resume-draft detection
- `app/agents/fallbacks.py`: Demo Mode — question banks per round type, doc-grounded templating, heuristic resume critique/general replies
- `app/agents/state.py` + `nodes.py` + `graph.py`: LangGraph StateGraph (router → context → interview/resume/critique/general → END) with pipeline trace, answer→scorecard flow, session updates
- `app/main.py`: FastAPI — /api/health, /api/models, sessions CRUD, document upload (multipart + pasted text), /api/chat running the graph via asyncio.to_thread
- Backend E2E tested via curl (scripts/test_backend.sh): session, text+PDF uploads, HR interview, answer scoring (7.5/10 w/ STAR), resume tailoring, general Q&A, session persistence
- Frontend: `src/lib/copilot-api.ts` (gateway-safe fetch with XTransformPort=8000 + NEXT_PUBLIC_API_BASE override), `src/lib/types.ts`
- Landing view (hero + features + how-it-works + stack + sticky footer), CopilotApp shell: sidebar (mode pills, provider select, knowledge base with drag-drop upload + paste dialog), chat area (markdown, typewriter reveal, scorecards, agent pipeline trace, source chips, suggestion chips), demo-mode banner, mobile drawer
- Fixed: sources bug in context node, STAR situation regex, skill-first keyword grounding, fpdf quoting, ESLint venv crash (ignore backend/**), react-hooks/set-state-in-effect errors, missing getHealth import (found via agent-browser console debugging)

Stage Summary:
- Backend runs on :8000 (DEMO MODE in sandbox — no keys), fully tested end-to-end incl. PDF parsing
- Frontend on :3000, verified through gateway (:81) with agent-browser: launch→session→chat→answer scorecard→PDF upload→grounded resume tailoring→mobile layout
- Deliverables: /home/z/my-project (Next.js app), /home/z/my-project/backend (uv project), README.md setup guide, backend/.env.example, scripts/test_backend.sh
- To enable full AI: add GOOGLE_API_KEY (or GROQ/OPENROUTER) to backend/.env and restart — no code changes needed
