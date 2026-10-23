"use client";

import {
  Braces,
  ChevronLeft,
  Code2,
  HeartHandshake,
  Info,
  Plus,
  Route,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { BrandWordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ContextFlags, DocRecord, ModelOption, Mode } from "@/lib/types";
import { DocumentPanel } from "./DocumentPanel";

const MODES: { id: Mode; label: string; icon: typeof Users; hint: string }[] = [
  { id: "auto", label: "Auto route", icon: Route, hint: "Router picks the right agent" },
  { id: "hr", label: "HR round", icon: Users, hint: "Behavioral & screening" },
  { id: "technical", label: "Technical round", icon: Braces, hint: "System design & depth" },
  { id: "coding", label: "Coding round", icon: Code2, hint: "DSA & practical challenges" },
  { id: "culture_fit", label: "Culture fit", icon: HeartHandshake, hint: "Values & working style" },
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
    <aside className="flex h-full w-full flex-col border-r border-border bg-sidebar text-sidebar-foreground">
      {/* brand */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
        <div>
          <BrandWordmark markClassName="h-6 w-6" textClassName="text-[15px]" />
          <div className="mt-1 flex items-center gap-1.5">
            {online ? (
              <Wifi className="h-3 w-3 text-primary" />
            ) : (
              <WifiOff className="h-3 w-3 text-red-600" />
            )}
            <span className={`pp-label ${online ? "text-primary" : "text-red-600"}`}>
              {online ? "backend online" : "backend offline"}
            </span>
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Back to landing page"
          onClick={onExit}
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="pp-scroll flex-1 space-y-6 overflow-y-auto px-4 py-4">
        {/* new chat */}
        <Button
          onClick={onNewChat}
          className="w-full justify-start gap-2 font-semibold"
        >
          <Plus className="h-4 w-4" /> New session
        </Button>

        {/* interview mode — checklist list */}
        <section aria-label="Interview mode">
          <h3 className="pp-label mb-2">Interview mode</h3>
          <div className="space-y-1">
            {MODES.map((m) => {
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => onModeChange(m.id)}
                  aria-pressed={active}
                  className={`relative flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${
                    active
                      ? "border-primary/40 bg-primary/10"
                      : "border-transparent hover:bg-accent"
                  }`}
                >
                  {active && (
                    <span
                      className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                  )}
                  <m.icon
                    className={`h-4 w-4 shrink-0 ${
                      active ? "text-primary" : "text-muted-foreground"
                    }`}
                  />
                  <span className="min-w-0">
                    <span
                      className={`block truncate text-sm font-medium ${
                        active ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {m.label}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {m.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* model */}
        <section aria-label="AI provider">
          <h3 className="pp-label mb-2">AI provider</h3>
          <Select value={provider} onValueChange={onProviderChange}>
            <SelectTrigger className="w-full bg-card text-xs" aria-label="AI provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m.id} value={m.id} disabled={!m.available}>
                  <div className="flex flex-col items-start">
                    <span className={m.available ? "text-foreground" : "text-muted-foreground"}>
                      {m.label}{" "}
                      {!m.available && (
                        <span className="text-[10px]">({m.env_key} missing)</span>
                      )}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{m.model}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {provider === "demo" && (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-800">
              <Info className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" />
              Demo mode: templates + real heuristics. Add a free API key in
              backend/.env for full AI.
            </p>
          )}
        </section>

        {/* documents */}
        <section aria-label="Knowledge base">
          <h3 className="pp-label mb-2">
            Knowledge base{" "}
            {documents.length > 0 && (
              <span className="text-muted-foreground/70">({documents.length})</span>
            )}
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
            <p className="text-xs text-muted-foreground">creating session…</p>
          )}
        </section>
      </div>
    </aside>
  );
}
