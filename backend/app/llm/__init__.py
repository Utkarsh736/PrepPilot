"""LangChain chat-model factory: Gemini / Groq / OpenRouter.

Every agent node asks `get_llm(provider, temperature=...)` for a chat model.
When no API keys are configured the factory returns ``None`` and the agent
nodes fall back to deterministic demo-mode logic (see app/agents/fallbacks.py),
so the whole product stays usable without any key.
"""

from __future__ import annotations

from functools import lru_cache

from app.config import settings

# A lightweight struct so nodes can log/echo which concrete model answered.


class LLMInfo:
    def __init__(self, provider: str, model: str, demo: bool):
        self.provider = provider
        self.model = model
        self.demo = demo

    def __repr__(self) -> str:  # pragma: no cover
        return f"LLMInfo({self.provider}:{self.model}, demo={self.demo})"


def resolve_provider(requested: str | None) -> str:
    """Map a requested provider to one that is actually usable."""
    if requested and requested != "demo":
        info = settings.providers.get(requested)
        if info and info.available:
            return requested
    # fall back to the configured default / any available key
    return settings.active_provider


def get_llm(provider: str | None = None, temperature: float | None = None):
    """Return a LangChain chat model for the provider, or ``None`` in demo mode.

    Raises nothing — callers check for ``None`` and branch to demo fallbacks.
    """
    pid = resolve_provider(provider)
    temp = settings.temperature if temperature is None else temperature

    if pid == "demo":
        return None

    info = settings.providers[pid]
    try:
        if pid == "gemini":
            from langchain_google_genai import ChatGoogleGenerativeAI

            return ChatGoogleGenerativeAI(
                model=info.model,
                google_api_key=settings.google_key,
                temperature=temp,
                max_output_tokens=4096,
                timeout=90,
            )
        if pid == "groq":
            from langchain_groq import ChatGroq

            return ChatGroq(
                model=info.model,
                api_key=settings.groq_key,
                temperature=temp,
                timeout=90,
            )
        if pid == "openrouter":
            from langchain_openai import ChatOpenAI

            return ChatOpenAI(
                model=info.model,
                api_key=settings.openrouter_key,
                base_url="https://openrouter.ai/api/v1",
                temperature=temp,
                max_tokens=4096,
                timeout=90,
            )
    except Exception:  # pragma: no cover - defensive: broken install => demo mode
        return None
    return None


@lru_cache(maxsize=8)
def _llm_cache_key(provider: str, temperature: float) -> tuple:
    return (provider, temperature)


def llm_info(provider: str | None) -> LLMInfo:
    """Metadata about the LLM that will serve this request (for the UI)."""
    pid = resolve_provider(provider)
    if pid == "demo":
        return LLMInfo("demo", "demo-coach (no API key)", demo=True)
    return LLMInfo(pid, settings.providers[pid].model, demo=False)
