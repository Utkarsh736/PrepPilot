"""FastAPI application — the HTTP surface of the agentic backend.

Endpoints
---------
GET  /api/health                     status, provider availability, embedding info
GET  /api/models                     switchable providers (drives the UI selector)
POST /api/sessions                   create a session
GET  /api/sessions/{sid}             session snapshot (history, docs, flags)
DELETE /api/sessions/{sid}           delete session
POST /api/documents/upload           multipart file OR pasted text → parse → Chroma
GET  /api/documents/{sid}            list session documents
DELETE /api/documents/{sid}/{doc_id} remove a document (Chroma + registry)
POST /api/chat                       run the LangGraph pipeline for a message
"""

from __future__ import annotations

import asyncio
import logging
import time

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.agents.graph import copilot_graph
from app.config import DOC_TYPES, INTERVIEW_TYPES, settings
from app.llm import llm_info
from app.rag import sessions as sess
from app.rag.parser import ParseError, parse_pasted_text, parse_upload
from app.rag.store import VectorStore, embedding_info, prewarm_local_embeddings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("interview-copilot")

app = FastAPI(title="Interview Copilot Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # gateway is same-origin; this enables local dev too
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def _startup() -> None:
    mode = "AI providers active" if settings.any_key_configured else "DEMO MODE (no API keys)"
    log.info("Interview Copilot backend up — %s | default=%s | embeddings=%s",
             mode, settings.active_provider, embedding_info()["provider"])
    # warm the local embedding model in the background so first upload is fast
    prewarm_local_embeddings()


# =====================================================================
# Models / schemas
# =====================================================================


class ChatRequest(BaseModel):
    session_id: str
    message: str = Field(min_length=1, max_length=12000)
    mode: str = "auto"
    provider: str | None = None


class TextDocumentRequest(BaseModel):
    session_id: str
    text: str = Field(min_length=20, max_length=60000)
    doc_type: str = "other"
    name: str = "pasted-text"


# =====================================================================
# Health / models
# =====================================================================


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "default_provider": settings.active_provider,
        "any_key_configured": settings.any_key_configured,
        "embedding": embedding_info(),
        "doc_types": list(DOC_TYPES),
        "interview_types": list(INTERVIEW_TYPES),
    }


@app.get("/api/models")
async def models():
    out = []
    for pid, info in settings.providers.items():
        out.append(
            {
                "id": pid,
                "label": info.label,
                "model": info.model,
                "note": info.note,
                "available": info.available,
                "env_key": info.env_key,
            }
        )
    out.append(
        {
            "id": "demo",
            "label": "Demo Mode",
            "model": "template + heuristics",
            "note": "Always available — no API key needed",
            "available": True,
            "env_key": "",
        }
    )
    return {"default": settings.active_provider, "models": out}


# =====================================================================
# Sessions
# =====================================================================


@app.post("/api/sessions")
async def create_session():
    s = sess.new_session()
    return _session_view(s)


@app.get("/api/sessions/{sid}")
async def get_session(sid: str):
    s = sess.load_session(sid)
    if s is None:
        raise HTTPException(404, "Session not found")
    return _session_view(s)


@app.delete("/api/sessions/{sid}")
async def delete_session(sid: str):
    ok = sess.delete_session(sid)
    return {"deleted": ok}


def _session_view(s: dict) -> dict:
    return {
        "session_id": s["session_id"],
        "created_at": s["created_at"],
        "documents": s.get("documents", []),
        "interview": s.get("interview", {}),
        "flags": sess.context_flags(s),
        "messages": [
            {
                "id": m["id"],
                "role": m["role"],
                "content": m["content"],
                "meta": m.get("meta", {}),
                "ts": m["ts"],
            }
            for m in s.get("messages", [])
        ],
    }


# =====================================================================
# Documents (knowledge base ingestion)
# =====================================================================


@app.post("/api/documents/upload")
async def upload_document(
    file: UploadFile | None = File(None),
    session_id: str = Form(...),
    doc_type: str = Form("other"),
):
    if doc_type not in DOC_TYPES:
        raise HTTPException(400, f"doc_type must be one of {DOC_TYPES}")

    if file is None or not file.filename:
        raise HTTPException(400, "No file provided (send multipart 'file' or use /api/documents/text)")

    data = await file.read()
    try:
        parsed = parse_upload(file.filename, data)
    except ParseError as e:
        raise HTTPException(422, str(e))

    return await _ingest(session_id, doc_type, file.filename, parsed)


@app.post("/api/documents/text")
async def upload_text_document(req: TextDocumentRequest):
    if req.doc_type not in DOC_TYPES:
        raise HTTPException(400, f"doc_type must be one of {DOC_TYPES}")
    try:
        parsed = parse_pasted_text(req.text)
    except ParseError as e:
        raise HTTPException(422, str(e))
    name = req.name or "pasted-text"
    if "." not in name:
        name += ".txt"
    return await _ingest(req.session_id, req.doc_type, name, parsed)


async def _ingest(session_id: str, doc_type: str, filename: str, parsed) -> dict:
    session = sess.get_or_create(session_id)
    store = VectorStore(session["session_id"])
    t0 = time.time()

    result = store.add_document(parsed.text, doc_type, filename)

    doc_record = {
        "doc_id": result.doc_id,
        "name": filename,
        "doc_type": doc_type,
        "word_count": parsed.word_count,
        "chunk_count": result.chunk_count,
        "pages": parsed.pages,
        "parser": parsed.parser,
        "keywords": result.keywords[:20],
        "created_at": time.time(),
    }
    sess.add_document(session, doc_record)

    log.info("ingested %s (%s, %d words, %d chunks) in %.2fs",
             filename, doc_type, parsed.word_count, result.chunk_count, time.time() - t0)

    return {
        "document": doc_record,
        "flags": sess.context_flags(session),
        "warning": parsed.warning,
        "store_stats": store.stats(),
    }


@app.get("/api/documents/{sid}")
async def list_documents(sid: str):
    session = sess.load_session(sid)
    if session is None:
        raise HTTPException(404, "Session not found")
    return {"documents": session.get("documents", []), "flags": sess.context_flags(session)}


@app.delete("/api/documents/{sid}/{doc_id}")
async def delete_document(sid: str, doc_id: str):
    session = sess.load_session(sid)
    if session is None:
        raise HTTPException(404, "Session not found")
    removed = sess.remove_document(session, doc_id)
    if removed is None:
        raise HTTPException(404, "Document not found")
    store = VectorStore(sid)
    removed_chunks = store.delete_document(doc_id)
    return {"deleted": True, "removed_chunks": removed_chunks, "flags": sess.context_flags(session)}


# =====================================================================
# Chat — run the LangGraph pipeline
# =====================================================================


@app.post("/api/chat")
async def chat(req: ChatRequest):
    session = sess.load_session(req.session_id)
    if session is None:
        raise HTTPException(404, "Session not found")

    mode = req.mode if req.mode in ("auto", *INTERVIEW_TYPES) else "auto"
    sess.update_interview(session, mode=mode)

    iv = session["interview"]
    state = {
        "session_id": session["session_id"],
        "user_message": req.message.strip(),
        "history": sess.history_excerpt(session),
        "selected_mode": mode,
        "provider": req.provider or "",
        "pending_question": iv.get("pending_question", ""),
        "asked_questions": list(iv.get("asked_questions") or []),
        "interview_current_type": iv.get("current_type", ""),
        "turn_count": iv.get("turn_count", 0),
        "doc_types_present": [d.get("doc_type") for d in session.get("documents", [])],
    }

    t0 = time.time()
    try:
        # run the blocking LangGraph pipeline off the event loop
        result = await asyncio.to_thread(copilot_graph.invoke, state)
    except Exception as e:
        log.exception("pipeline failed")
        raise HTTPException(500, f"Pipeline error: {e}")

    elapsed = time.time() - t0

    # ---- persist session updates ----
    sess.add_message(session, "user", req.message.strip())
    meta = {
        "intent": result.get("intent"),
        "interview_type": result.get("interview_type"),
        "sources": result.get("sources") or [],
        "pipeline": result.get("pipeline") or [],
        "provider": llm_info(req.provider).provider,
        "model": llm_info(req.provider).model,
        "evaluation": result.get("evaluation"),
        "elapsed_s": round(elapsed, 2),
    }
    sess.add_message(session, "assistant", result.get("response", ""), meta)

    sess.update_interview(
        session,
        current_type=result.get("new_interview_type", ""),
        pending_question=result.get("new_pending_question", ""),
        asked_questions=result.get("updated_asked_questions", iv.get("asked_questions") or []),
        turn_count=iv.get("turn_count", 0) + (result.get("turn_increment", 0) or 0),
    )
    if result.get("score_to_append"):
        iv["scores"].append(result["score_to_append"])
        sess.update_interview(session, scores=iv["scores"])

    return {
        "response": result.get("response", ""),
        "intent": result.get("intent", "general"),
        "interview_type": result.get("interview_type", ""),
        "evaluation": result.get("evaluation"),
        "sources": result.get("sources") or [],
        "pipeline": result.get("pipeline") or [],
        "provider": llm_info(req.provider).provider,
        "model": llm_info(req.provider).model,
        "flags": sess.context_flags(session),
        "elapsed_s": round(elapsed, 2),
    }
