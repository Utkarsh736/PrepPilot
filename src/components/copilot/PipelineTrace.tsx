"use client";

import { Check, Loader2 } from "lucide-react";
import type { PipelineStep } from "@/lib/types";

const NODE_ICONS: Record<string, string> = {
  router: "🧭",
  context: "📚",
  interview: "🎯",
  resume: "📄",
  critique: "🔍",
  general: "💬",
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
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
      {steps.map((s, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <span className="text-[10px] text-zinc-600">→</span>}
          <span
            title={`${s.detail} · ${s.ms}ms`}
            className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900/80 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400"
          >
            <span aria-hidden>{NODE_ICONS[s.node] ?? "•"}</span>
            {s.label}
          </span>
        </span>
      ))}
      {typeof elapsed === "number" && (
        <span className="ml-1 font-mono text-[10px] text-zinc-600">{elapsed}s</span>
      )}
    </div>
  );
}

const STAGE_SEQUENCE = [
  { label: "Intent Router", icon: "🧭" },
  { label: "Knowledge Base Retrieval", icon: "📚" },
  { label: "Agent thinking", icon: "🎯" },
];

/** Animated 'agents working' indicator shown while awaiting the response. */
export function PipelineThinking() {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="ic-dot h-1.5 w-1.5 rounded-full bg-emerald-400"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </span>
      <span className="text-xs text-zinc-500">agents working</span>
      <span className="flex flex-wrap items-center gap-1">
        {STAGE_SEQUENCE.map((s, i) => (
          <span key={s.label} className="inline-flex items-center gap-1">
            {i > 0 && <span className="text-[10px] text-zinc-700">→</span>}
            <span className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900/80 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500">
              <span aria-hidden>{s.icon}</span>
              {s.label}
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            </span>
          </span>
        ))}
      </span>
    </div>
  );
}

/** Big checklist version used in the thinking bubble body. */
export function PipelineChecklist({ steps }: { steps: PipelineStep[] }) {
  return (
    <div className="space-y-1.5">
      {STAGE_SEQUENCE.map((stage) => {
        const done = steps.some((s) => s.label === stage.label);
        return (
          <div key={stage.label} className="flex items-center gap-2 text-xs">
            {done ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />
            )}
            <span className={done ? "text-zinc-300" : "text-zinc-500"}>
              {stage.icon} {stage.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
