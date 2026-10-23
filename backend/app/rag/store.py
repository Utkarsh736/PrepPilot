"""ChromaDB-backed personal knowledge base with embeddings.

Design
------
* One Chroma **collection per session** (namespace isolation between users).
* Embeddings: Google `text-embedding-004` when a Gemini key exists (free
  tier), otherwise ChromaDB's built-in MiniLM ONNX model (no key needed,
  ~80 MB one-time download, cached on disk).
* Every document is tagged with a `doc_type` (resume / job_description /
  work_experience / education / other) so retrieval can prefer the right
  slice of the knowledge base for each agent.
* Document metadata + extracted keywords are ALSO mirrored into the session
  JSON store, so the UI can list documents even without touching Chroma.
"""

from __future__ import annotations

import re
import threading
import uuid
from dataclasses import dataclass, field

from langchain_chroma import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings

_lock = threading.Lock()
_splitter = RecursiveCharacterTextSplitter(
    chunk_size=900,
    chunk_overlap=120,
    separators=["\n\n", "\n", "• ", "- ", "|", ". ", " ", ""],
)


# ---------------------------------------------------------------------------
# Embeddings
# ---------------------------------------------------------------------------

_embedding_fn = None
_embedding_name = ""


def _get_embedding_function():
    """Gemini embeddings if a key exists, else Chroma's local default."""
    global _embedding_fn, _embedding_name
    if _embedding_fn is not None:
        return _embedding_fn, _embedding_name

    use_gemini = settings.embedding_provider == "gemini" and settings.google_key
    if use_gemini:
        try:
            from langchain_google_genai import GoogleGenerativeAIEmbeddings

            # wrap to keep lazy + robust: if Google fails at call time we raise
            # a clear error rather than crash the whole app at import time.
            _embedding_fn = GoogleGenerativeAIEmbeddings(model="models/text-embedding-004")
            _embedding_name = "gemini:text-embedding-004"
            return _embedding_fn, _embedding_name
        except Exception:
            pass
    # fallback: None tells langchain-chroma to use chromadb's DefaultEmbeddingFunction
    _embedding_fn = None
    _embedding_name = "local:all-MiniLM-L6-v2 (chromadb default)"
    return None, _embedding_name


def embedding_info() -> dict:
    fn, name = _get_embedding_function()
    return {"provider": name, "kind": "gemini" if fn is not None else "local"}


# ---------------------------------------------------------------------------
# Keyword extraction (used for demo-mode grounding & UI chips)
# ---------------------------------------------------------------------------

_STOPWORDS = {
    "the", "and", "for", "with", "you", "your", "our", "are", "will", "have",
    "has", "was", "were", "this", "that", "from", "they", "their", "who",
    "whom", "what", "when", "where", "why", "how", "all", "any", "can",
    "may", "should", "must", "not", "but", "also", "into", "over", "than",
    "then", "them", "there", "these", "those", "been", "being", "each",
    "which", "while", "about", "such", "some", "more", "most", "other",
    "using", "use", "used", "work", "working", "team", "teams", "role",
    "roles", "job", "jobs", "years", "year", "experience", "experiences",
    "including", "include", "includes", "etc", "new", "one", "two", "three",
    "strong", "good", "great", "plus", "required", "preferred", "responsibilities",
    "requirements", "qualifications", "candidate", "candidates", "company",
    "ability", "skills", "skill", "knowledge", "related", "least", "well",
    "within", "across", "ensure", "support", "help", "looking", "join",
}

_SKILL_HINTS = {
    "python", "java", "javascript", "typescript", "react", "node", "nodejs",
    "sql", "nosql", "mongodb", "postgresql", "mysql", "aws", "gcp", "azure",
    "docker", "kubernetes", "git", "rest", "graphql", "api", "apis",
    "machine", "learning", "deep", "neural", "pandas", "numpy", "tensorflow",
    "pytorch", "scikit", "spark", "hadoop", "kafka", "redis", "linux",
    "c++", "c#", "go", "rust", "ruby", "php", "swift", "kotlin", "scala",
    "html", "css", "tailwind", "nextjs", "django", "flask", "fastapi",
    "spring", "microservices", "ci", "cd", "terraform", "jenkins",
    "agile", "scrum", "leadership", "communication", "mentorship",
}


def extract_keywords(text: str, limit: int = 25) -> list[str]:
    """Simple TF-based keyword extraction (demo grounding + match chips)."""
    words = re.findall(r"[A-Za-z][A-Za-z+#.]{1,24}", text.lower())
    counts: dict[str, int] = {}
    for w in words:
        if w in _STOPWORDS or len(w) < 3:
            continue
        counts[w] = counts.get(w, 0) + 1
    ranked = sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))
    return [w for w, _ in ranked[:limit]]


# ---------------------------------------------------------------------------
# Store
# ---------------------------------------------------------------------------


@dataclass
class StoredChunk:
    doc_id: str
    text: str
    doc_type: str
    doc_name: str


@dataclass
class AddResult:
    doc_id: str
    chunk_count: int
    keywords: list[str] = field(default_factory=list)


class VectorStore:
    """Thin wrapper around a per-session Chroma collection."""

    def __init__(self, session_id: str):
        safe = re.sub(r"[^a-zA-Z0-9_-]", "-", session_id)[:60]
        self.collection_name = f"sess-{safe}"
        emb, _name = _get_embedding_function()
        self.db = Chroma(
            collection_name=self.collection_name,
            embedding_function=emb,  # None → chromadb default MiniLM
            persist_directory=str(settings.data_dir / "chroma"),
            collection_metadata={"hnsw:space": "cosine"},
        )

    # ------------------------------------------------------------------
    def add_document(
        self,
        text: str,
        doc_type: str,
        doc_name: str,
        doc_id: str | None = None,
    ) -> AddResult:
        doc_id = doc_id or uuid.uuid4().hex[:12]
        chunks = _splitter.split_text(text)
        if not chunks:
            chunks = [text[:900]]

        metadatas = [
            {
                "doc_id": doc_id,
                "doc_type": doc_type,
                "doc_name": doc_name,
                "chunk_index": i,
            }
            for i in range(len(chunks))
        ]
        self.db.add_texts(texts=chunks, metadatas=metadatas, ids=[f"{doc_id}-{i}" for i in range(len(chunks))])
        return AddResult(
            doc_id=doc_id,
            chunk_count=len(chunks),
            keywords=extract_keywords(text),
        )

    # ------------------------------------------------------------------
    def delete_document(self, doc_id: str) -> int:
        """Remove all chunks of a document. Returns removed chunk count."""
        try:
            got = self.db.get(where={"doc_id": doc_id}, include=["metadatas"])
            ids = got.get("ids") or []
            if ids:
                self.db.delete(ids=ids)
            return len(ids)
        except Exception:
            return 0

    # ------------------------------------------------------------------
    def retrieve(
        self,
        query: str,
        doc_types: list[str] | None = None,
        top_k: int | None = None,
    ) -> list[StoredChunk]:
        """Semantic search with optional doc-type filter."""
        k = top_k or settings.rag_top_k
        # fetch a bit more when filtering, then trim
        fetch_k = k * 2 if doc_types else k
        try:
            if doc_types:
                results = self.db.similarity_search_with_relevance_scores(
                    query, k=fetch_k, filter={"doc_type": {"$in": doc_types}}
                )
            else:
                results = self.db.similarity_search_with_relevance_scores(query, k=fetch_k)
        except Exception:
            return []

        seen: set[str] = set()
        out: list[StoredChunk] = []
        for doc, score in results:
            meta = doc.metadata or {}
            key = f"{meta.get('doc_id')}:{hash(doc.page_content)}"
            if key in seen:
                continue
            seen.add(key)
            out.append(
                StoredChunk(
                    doc_id=str(meta.get("doc_id", "")),
                    text=doc.page_content,
                    doc_type=str(meta.get("doc_type", "other")),
                    doc_name=str(meta.get("doc_name", "document")),
                )
            )
            if len(out) >= k:
                break
        return out

    # ------------------------------------------------------------------
    def count(self) -> int:
        try:
            return self.db._collection.count()
        except Exception:
            return 0

    def stats(self) -> dict:
        """Aggregated counts per doc_type — powers the context badges."""
        try:
            got = self.db.get(include=["metadatas"])
        except Exception:
            return {"total": 0, "by_type": {}}
        by_type: dict[str, int] = {}
        for meta in got.get("metadatas") or []:
            t = str((meta or {}).get("doc_type", "other"))
            by_type[t] = by_type.get(t, 0) + 1
        return {"total": len(got.get("ids") or []), "by_type": by_type}


# ---------------------------------------------------------------------------
# Pre-warm the local embedding model so the first upload isn't slow
# ---------------------------------------------------------------------------

def prewarm_local_embeddings() -> None:
    """Download/initialize the MiniLM model in a background thread."""

    def _do():
        try:
            fn, name = _get_embedding_function()
            if fn is not None:
                fn.embed_query("warmup")
                return
            # local default EF via a throwaway collection
            import chromadb

            client = chromadb.PersistentClient(path=str(settings.data_dir / "chroma" / "_warmup"))
            client.get_or_create_collection("warmup").add(
                ids=["w"], documents=["warmup"], metadatas=[{"t": 1}]
            )
            client.delete_collection("warmup")
            _ = name
        except Exception:
            pass

    threading.Thread(target=_do, daemon=True).start()
