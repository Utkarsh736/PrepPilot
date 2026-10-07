"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, KeyRound, PanelLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createSession,
  getHealth,
  getModels,
  getSession,
  sendChat,
} from "@/lib/copilot-api";
import type {
  ChatMessage,
  ContextFlags,
  DocRecord,
  HealthInfo,
  ModelOption,
  Mode,
} from "@/lib/types";
import { ChatArea } from "./ChatArea";
import { Sidebar } from "./Sidebar";

const LS_SESSION = "ic_session_id";
const LS_MODE = "ic_mode";
const LS_PROVIDER = "ic_provider";

export function CopilotApp({ onExit }: { onExit: () => void }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [documents, setDocuments] = useState<DocRecord[]>([]);
  const [flags, setFlags] = useState<ContextFlags | null>(null);
  const [mode, setMode] = useState<Mode>("auto");
  const [provider, setProvider] = useState<string>("demo");
  const [models, setModels] = useState<ModelOption[]>([]);
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [thinking, setThinking] = useState(false);
  const [online, setOnline] = useState(true);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const startedRef = useRef(false);

  // ---------------------------------------------------------------- init
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    (async () => {
      try {
        const [h, m] = await Promise.all([getHealth(), getModels()]);
        setHealth(h);
        setModels(m.models);
        const savedProvider = localStorage.getItem(LS_PROVIDER);
        const chosen =
          savedProvider && m.models.find((x) => x.id === savedProvider)?.available
            ? savedProvider
            : m.default;
        setProvider(chosen);
        setOnline(true);
      } catch {
        setOnline(false);
        return;
      }

      try {
        const savedMode = localStorage.getItem(LS_MODE) as Mode | null;
        if (savedMode) setMode(savedMode);

        const saved = localStorage.getItem(LS_SESSION);
        let view = saved ? await getSession(saved).catch(() => null) : null;
        if (!view) {
          view = await createSession();
          localStorage.setItem(LS_SESSION, view.session_id);
        }
        applySession(view);
      } catch {
        /* surfaced via online flag */
      }
    })();
  }, []);

  function applySession(view: {
    session_id: string;
    messages: ChatMessage[];
    documents: DocRecord[];
    flags: ContextFlags;
    interview: { mode?: Mode };
  }) {
    setSessionId(view.session_id);
    setMessages(view.messages ?? []);
    setDocuments(view.documents ?? []);
    setFlags(view.flags ?? null);
    if (view.interview?.mode) setMode(view.interview.mode);
  }

  // ---------------------------------------------------------------- actions
  const handleModeChange = (m: Mode) => {
    setMode(m);
    localStorage.setItem(LS_MODE, m);
  };

  const handleProviderChange = (p: string) => {
    setProvider(p);
    localStorage.setItem(LS_PROVIDER, p);
  };

  const handleNewChat = async () => {
    try {
      const view = await createSession();
      localStorage.setItem(LS_SESSION, view.session_id);
      applySession(view);
      setBannerDismissed(false);
    } catch {
      setOnline(false);
    }
  };

  const handleSend = useCallback(
    async (text: string) => {
      if (!sessionId || thinking) return;
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: text,
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setThinking(true);
      try {
        const res = await sendChat(sessionId, text, mode, provider);
        const assistantMsg: ChatMessage = {
          id: `new-${Date.now()}`,
          role: "assistant",
          content: res.response,
          ts: Date.now(),
          meta: {
            intent: res.intent,
            interview_type: res.interview_type || undefined,
            sources: res.sources,
            pipeline: res.pipeline,
            provider: res.provider,
            model: res.model,
            evaluation: res.evaluation,
            elapsed_s: res.elapsed_s,
          },
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setFlags(res.flags);
        setOnline(true);
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: `⚠️ **Backend error** — ${String((e as Error).message)}\n\nIs the Python backend running on port 8000? See the setup card in the sidebar.`,
            ts: Date.now(),
          },
        ]);
      } finally {
        setThinking(false);
      }
    },
    [sessionId, thinking, mode, provider]
  );

  const demoBanner =
    !bannerDismissed && health && !health.any_key_configured && online;

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {/* sidebar (desktop) */}
      <div className="hidden w-80 shrink-0 lg:block">
        <Sidebar
          sessionId={sessionId}
          mode={mode}
          onModeChange={handleModeChange}
          provider={provider}
          models={models}
          onProviderChange={handleProviderChange}
          documents={documents}
          flags={flags}
          onUploaded={(doc, f) => {
            setDocuments((prev) => [...prev, doc]);
            setFlags(f);
          }}
          onDeleted={(docId, f) => {
            setDocuments((prev) => prev.filter((d) => d.doc_id !== docId));
            setFlags(f);
          }}
          onNewChat={handleNewChat}
          onExit={onExit}
          online={online}
        />
      </div>

      {/* sidebar (mobile drawer) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSidebarOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-xs">
            <Sidebar
              sessionId={sessionId}
              mode={mode}
              onModeChange={(m) => {
                handleModeChange(m);
              }}
              provider={provider}
              models={models}
              onProviderChange={handleProviderChange}
              documents={documents}
              flags={flags}
              onUploaded={(doc, f) => {
                setDocuments((prev) => [...prev, doc]);
                setFlags(f);
              }}
              onDeleted={(docId, f) => {
                setDocuments((prev) => prev.filter((d) => d.doc_id !== docId));
                setFlags(f);
              }}
              onNewChat={() => {
                handleNewChat();
                setSidebarOpen(false);
              }}
              onExit={onExit}
              online={online}
            />
          </div>
        </div>
      )}

      {/* main */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* header */}
        <header className="flex items-center gap-3 border-b border-zinc-800/80 px-4 py-2.5">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-zinc-400 lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
          <div className="flex min-w-0 flex-1 items-center gap-2 text-xs text-zinc-500">
            <span className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5 font-medium text-zinc-300">
              {mode === "auto" ? "Auto-routing" : `${MODE_LABEL[mode]} round`}
            </span>
            <span className="hidden truncate sm:inline">
              {flags?.has_profile ? "profile ✓" : "no profile"} ·{" "}
              {flags?.has_jd ? "job description ✓" : "no job description"}
            </span>
          </div>
          <span className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-0.5 font-mono text-[10px] text-zinc-500">
            {models.find((m) => m.id === provider)?.model ?? provider}
          </span>
        </header>

        {/* demo banner */}
        {demoBanner && (
          <div className="flex items-start gap-2.5 border-b border-amber-500/20 bg-amber-500/[0.07] px-4 py-2.5 text-xs text-amber-200/90">
            <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
            <p className="min-w-0 flex-1 leading-relaxed">
              <span className="font-semibold">Demo Mode</span> — replies are
              template-based with real heuristic scoring. For full AI coaching,
              add a free <code className="rounded bg-zinc-800/80 px-1">GOOGLE_API_KEY</code> (recommended),{" "}
              <code className="rounded bg-zinc-800/80 px-1">GROQ_API_KEY</code> or{" "}
              <code className="rounded bg-zinc-800/80 px-1">OPENROUTER_API_KEY</code> to{" "}
              <code className="rounded bg-zinc-800/80 px-1">backend/.env</code> and restart the backend.
            </p>
            <button
              onClick={() => setBannerDismissed(true)}
              aria-label="Dismiss"
              className="rounded p-0.5 text-amber-300/60 hover:text-amber-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {!online && (
          <div className="flex items-start gap-2.5 border-b border-rose-500/20 bg-rose-500/[0.07] px-4 py-2.5 text-xs text-rose-200/90">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
            <p className="min-w-0 flex-1 leading-relaxed">
              Can&apos;t reach the Python backend on port 8000. Start it with{" "}
              <code className="rounded bg-zinc-800/80 px-1">cd backend && uv run uvicorn app.main:app --port 8000</code>
            </p>
          </div>
        )}

        <div className="min-h-0 flex-1">
          <ChatArea
            messages={messages}
            thinking={thinking}
            onSend={handleSend}
            hasDocs={(flags?.doc_count ?? 0) > 0}
          />
        </div>
      </main>
    </div>
  );
}

const MODE_LABEL: Record<string, string> = {
  hr: "HR",
  technical: "Technical",
  coding: "Coding",
  culture_fit: "Culture-fit",
};
