"""LangGraph assembly for the Interview Copilot multi-agent workflow.

                 ┌──────────┐
                 │  router  │  DSPy intent classification (keyword fallback)
                 └────┬─────┘
                      ▼
                 ┌──────────┐
                 │ context  │  ChromaDB retrieval + LLM condensation
                 └────┬─────┘
        ┌─────────────┼──────────────┬──────────────┐
        ▼             ▼              ▼              ▼
   ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
   │ HR/Tech │  │  Resume  │  │ Resume   │  │  General │
   │ Coding/ │  │  Tailor  │  │  Critic  │  │ Assistant│
   │ Culture │  └──────────┘  └──────────┘  └──────────┘
   └─────────┘
"""

from __future__ import annotations

from langgraph.graph import END, START, StateGraph

from app.agents import nodes
from app.agents.state import ChatState


def route_by_intent(state: ChatState) -> str:
    intent = state.get("intent", "general")
    if intent in ("interview", "resume", "critique"):
        return intent
    return "general"


def build_graph():
    graph = StateGraph(ChatState)

    graph.add_node("router", nodes.router_node)
    graph.add_node("context", nodes.context_node)
    graph.add_node("interview", nodes.interview_node)
    graph.add_node("resume", nodes.resume_node)
    graph.add_node("critique", nodes.critique_node)
    graph.add_node("general", nodes.general_node)

    graph.add_edge(START, "router")
    graph.add_edge("router", "context")
    graph.add_conditional_edges(
        "context",
        route_by_intent,
        {
            "interview": "interview",
            "resume": "resume",
            "critique": "critique",
            "general": "general",
        },
    )
    graph.add_edge("interview", END)
    graph.add_edge("resume", END)
    graph.add_edge("critique", END)
    graph.add_edge("general", END)

    return graph.compile()


# Compiled once, reused by every request (graph itself is stateless; the
# ChatState carries per-session data).
copilot_graph = build_graph()
