"""Application configuration — loads `.env` and exposes provider settings."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")

# ---------------------------------------------------------------------
# Env access helpers
# ---------------------------------------------------------------------


def _env(key: str, default: str = "") -> str:
    return (os.getenv(key) or default).strip()


def _bool(key: str, default: bool = False) -> bool:
    val = _env(key).lower()
    if not val:
        return default
    return val in ("1", "true", "yes", "on")


# ---------------------------------------------------------------------
# Provider registry
# ---------------------------------------------------------------------


@dataclass
class ProviderInfo:
    """A single switchable LLM provider."""

    id: str
    label: str
    env_key: str
    model: str
    note: str
    available: bool = False


def _providers() -> dict[str, ProviderInfo]:
    gemini_key = _env("GOOGLE_API_KEY")
    groq_key = _env("GROQ_API_KEY")
    openrouter_key = _env("OPENROUTER_API_KEY")

    return {
        "gemini": ProviderInfo(
            id="gemini",
            label="Google Gemini",
            env_key="GOOGLE_API_KEY",
            model=_env("GEMINI_MODEL", "gemini-2.0-flash"),
            note="Recommended — generous free tier, also powers embeddings",
            available=bool(gemini_key),
        ),
        "groq": ProviderInfo(
            id="groq",
            label="Groq",
            env_key="GROQ_API_KEY",
            model=_env("GROQ_MODEL", "llama-3.3-70b-versatile"),
            note="Free tier, very fast inference",
            available=bool(groq_key),
        ),
        "openrouter": ProviderInfo(
            id="openrouter",
            label="OpenRouter",
            env_key="OPENROUTER_API_KEY",
            model=_env("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free"),
            note="Gateway to many free models (`:free` suffix)",
            available=bool(openrouter_key),
        ),
    }


@dataclass
class Settings:
    """Central settings object, computed once at import time."""

    default_provider: str
    temperature: float
    rag_top_k: int
    data_dir: Path
    embedding_provider: str
    providers: dict[str, ProviderInfo] = field(default_factory=_providers)

    @property
    def active_provider(self) -> str:
        """The provider actually used when none is requested explicitly.

        Falls back through the default provider (if its key exists) to any
        provider with a key, and finally to `demo` when the environment has
        no API keys at all.
        """
        default = self.default_provider
        if default != "demo" and default in self.providers and self.providers[default].available:
            return default
        for pid, info in self.providers.items():
            if info.available:
                return pid
        return "demo"

    @property
    def any_key_configured(self) -> bool:
        return any(p.available for p in self.providers.values())

    @property
    def google_key(self) -> str:
        return _env("GOOGLE_API_KEY")

    @property
    def groq_key(self) -> str:
        return _env("GROQ_API_KEY")

    @property
    def openrouter_key(self) -> str:
        return _env("OPENROUTER_API_KEY")


settings = Settings(
    default_provider=_env("MODEL_PROVIDER", "gemini").lower(),
    temperature=float(_env("LLM_TEMPERATURE", "0.7")),
    rag_top_k=int(_env("RAG_TOP_K", "8")),
    data_dir=Path(_env("DATA_DIR", str(BACKEND_DIR / "data"))).resolve(),
    embedding_provider=_env("EMBEDDING_PROVIDER", "gemini").lower(),
)

settings.data_dir.mkdir(parents=True, exist_ok=True)

# Doc types accepted by the knowledge base
DOC_TYPES = ("resume", "job_description", "work_experience", "education", "other")

# Interview types supported by the coach agents
INTERVIEW_TYPES = ("hr", "technical", "coding", "culture_fit")
