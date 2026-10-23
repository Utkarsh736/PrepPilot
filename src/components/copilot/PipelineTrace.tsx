"use client";

import { Check, Loader2 } from "lucide-react";
import type { PipelineStep } from "@/lib/types";

const NODE_ICONS: Record<string, string> = {
  router: "→",
  context: "▤",
  interview: "◎",
  resume: "⌗",
  critique: "◇",
  general: "·",
};

/** Compact chip row of the agent pipeline (rendered under assistant messages). */
export function PipelineTrace({
  steps,
  elapsed,
}: {
  steps: PipelineStep[];
  elapsed?: number;
}) {
  if (!steps?.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {steps.map((s, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <span className="font-mono text-[10px] text-muted-foreground/50">→</span>}
          <span
            title={`${s.detail} · ${s.ms}ms`}
            className="inline-flex items-center gap-1 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground"
          >
            <span aria-hidden>{NODE_ICONS[s.node] ?? "·"}</span>
            {s.label}
          </span>
        </span>
      ))}
      {typeof elapsed === "number" && (
        <span className="ml-1 font-mono text-[10px] text-muted-foreground/70">{elapsed}s</span>
      )}
    </div>
  );
}

const STAGE_SEQUENCE = ["Intent router", "Knowledge retrieval", "Agent thinking"];

/** Animated 'agents working' indicator shown while awaiting the response. */
export function PipelineThinking() {
  return (
    <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
      <span className="flex gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="pp-dot h-1.5 w-1.5 rounded-full bg-primary"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </span>
      <span className="pp-label text-foreground">agents working</span>
      <span className="flex flex-wrap items-center gap-1.5">
        {STAGE_SEQUENCE.map((label, i) => (
          <span key={label} className="inline-flex items-center gap-1">
            {i > 0 && (
              <span className="font-mono text-[10px] text-muted-foreground/50">→</span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
              {label}
              <Loader2 className="h-2.5 w-2.5 animate-spin text-primary/70" />
            </span>
          </span>
        ))}
      </span>
    </div>
  );
}

/** Big checklist version (kept for potential future use in the thinking bubble body). */
export function PipelineChecklist({ steps }: { steps: PipelineStep[] }) {
  return (
    <div className="space-y-1.5">
      {STAGE_SEQUENCE.map((label) => {
        const done = steps.some((s) => s.label === label);
        return (
          <div key={label} className="flex items-center gap-2 text-xs">
            {done ? (
              <Check className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
            <span className={done ? "text-foreground" : "text-muted-foreground"}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
