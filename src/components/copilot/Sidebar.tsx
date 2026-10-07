"use client";

import {
  Bot,
  Braces,
  ChevronLeft,
  Code2,
  HeartHandshake,
  Info,
  MessagesSquare,
  Plus,
  Sparkles,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ContextFlags, DocRecord, ModelOption, Mode } from "@/lib/types";
import { DocumentPanel } from "./DocumentPanel";

const MODES: { id: Mode; label: string; icon: typeof Users; hint: string }[] = [
  { id: "auto", label: "Auto", icon: Sparkles, hint: "Router picks the right agent" },
  { id: "hr", label: "HR", icon: Users, hint: "Behavioral & screening round" },
  { id: "technical", label: "Technical", icon: Braces, hint: "System design & depth" },
  { id: "coding", label: "Coding", icon: Code2, hint: "DSA & practical challenges" },
  { id: "culture_fit", label: "Culture", icon: HeartHandshake, hint: "Values & working style" },
];

interface Props {
  sessionId: string | null;
  mode: Mode;
  onModeChange: (m: Mode) => void;
  provider: string;
  models: ModelOption[];
  onProviderChange: (p: string) => void;
  documents: DocRecord[];
  flags: ContextFlags | null;
  onUploaded: (doc: DocRecord, flags: ContextFlags) => void;
  onDeleted: (docId: string, flags: ContextFlags) => void;
  onNewChat: () => void;
  onExit: () => void;
  online: boolean;
}

export function Sidebar(props: Props) {
  const {
    sessionId,
    mode,
    onModeChange,
    provider,
    models,
    onProviderChange,
    documents,
    flags,
    onUploaded,
    onDeleted,
    onNewChat,
    onExit,
    online,
  } = props;

  return (
    <aside className="flex h-full w-full flex-col border-r border-zinc-800/80 bg-zinc-950">
      {/* brand */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/15">
            <MessagesSquare className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight text-zinc-100">Interview Copilot</div>
            <div className="flex items-center gap-1 text-[10px] text-zinc-500">
              {online ? <Wifi className="h-3 w-3 text-emerald-400" /> : <WifiOff className="h-3 w-3 text-rose-400" />}
              {online ? "backend online" : "backend offline"}
            </div>
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Back to landing page"
          onClick={onExit}
          className="h-7 w-7 text-zinc-500 hover:text-zinc-200"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="ic-scroll flex-1 space-y-5 overflow-y-auto px-4 py-4">
        {/* new chat */}
        <Button
          onClick={onNewChat}
          className="w-full justify-start gap-2 border border-zinc-700/80 bg-zinc-900/60 text-sm text-zinc-200 hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:text-emerald-200"
          variant="outline"
        >
          <Plus className="h-4 w-4" /> New chat
        </Button>

        {/* interview mode */}
        <section>
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            Interview mode
          </h3>
          <TooltipProvider delayDuration={200}>
            <div className="grid grid-cols-5 gap-1">
              {MODES.map((m) => (
                <Tooltip key={m.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onModeChange(m.id)}
                      aria-label={m.label}
                      aria-pressed={mode === m.id}
                      className={`flex h-14 flex-col items-center justify-center gap-1 rounded-lg border text-[10px] font-medium transition-all ${
                        mode === m.id
                          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                          : "border-zinc-800 bg-zinc-900/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                      }`}
                    >
                      <m.icon className="h-4 w-4" />
                      {m.label}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="border-zinc-700 bg-zinc-900 text-xs text-zinc-300">
                    {m.hint}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        </section>

        {/* model */}
        <section>
          <h3 className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            AI provider
          </h3>
          <Select value={provider} onValueChange={onProviderChange}>
            <SelectTrigger
              className="w-full border-zinc-800 bg-zinc-900/60 text-xs text-zinc-200"
              aria-label="AI provider"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-zinc-800 bg-zinc-950 text-zinc-200">
              {models.map((m) => (
                <SelectItem
                  key={m.id}
                  value={m.id}
                  disabled={!m.available}
                  className="text-xs"
                >
                  <div className="flex flex-col items-start">
                    <span className={m.available ? "text-zinc-200" : "text-zinc-600"}>
                      {m.label} {!m.available && <span className="text-[10px]">({m.env_key} missing)</span>}
                    </span>
                    <span className="text-[10px] text-zinc-500">{m.model}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {provider === "demo" && (
            <p className="mt-1.5 flex items-start gap-1 text-[10px] leading-relaxed text-amber-400/80">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              Demo Mode: templates + real heuristics. Add a free API key in
              backend/.env for full AI.
            </p>
          )}
        </section>

        {/* documents */}
        <section>
          <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            Knowledge base {documents.length > 0 && <span className="text-zinc-600">({documents.length})</span>}
          </h3>
          {sessionId ? (
            <DocumentPanel
              sessionId={sessionId}
              documents={documents}
              flags={flags}
              onUploaded={onUploaded}
              onDeleted={onDeleted}
            />
          ) : (
            <p className="text-xs text-zinc-600">creating session…</p>
          )}
        </section>
      </div>
    </aside>
  );
}
