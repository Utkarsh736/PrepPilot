"use client";

import { motion } from "framer-motion";
import { Check, Plus } from "lucide-react";
import type { Evaluation } from "@/lib/types";

/** Stamp color by score band — the single place band color is encoded. */
function stampBorder(v: number): string {
  if (v >= 6.5) return "border-primary/60";
  if (v >= 5) return "border-amber-400/70";
  return "border-orange-400/70";
}

const DIM_LABELS: Record<string, string> = {
  relevance: "Relevance",
  structure: "Structure",
  depth: "Depth",
  communication: "Communication",
  impact: "Impact",
  ats_format: "ATS format",
  language: "Language",
  conciseness: "Conciseness",
};

export function ScoreCard({ evaluation }: { evaluation: Evaluation }) {
  const dims = Object.entries(evaluation.dimensions ?? {});
  const overall = evaluation.overall ?? 0;
  const isHeuristic = evaluation.method === "heuristic";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3.5 rounded-md border border-border bg-secondary/40 p-4"
    >
      {/* header + stamped overall */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="pp-label text-foreground">Answer scorecard</span>
          {isHeuristic && (
            <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 font-mono text-[9px] font-medium uppercase tracking-wider text-amber-800">
              heuristic
            </span>
          )}
        </div>
        <span
          className={`inline-flex items-baseline gap-1 rounded border-2 px-2.5 py-1 ${stampBorder(overall)}`}
        >
          <span className={`font-mono text-lg font-bold leading-none ${overall >= 6.5 ? "text-primary" : overall >= 5 ? "text-amber-700" : "text-orange-700"}`}>
            {overall}
          </span>
          <span className="pp-label">/ 10</span>
        </span>
      </div>

      {/* dimension bars */}
      {dims.length > 0 && (
        <div className="mt-4 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
          {dims.map(([k, v]) => (
            <div key={k} className="flex items-center gap-2.5">
              <span className="w-[5.5rem] shrink-0 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                {DIM_LABELS[k] ?? k.replace("_", " ")}
              </span>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (v / 10) * 100)}%` }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                  className="h-full rounded-full bg-primary/80"
                />
              </div>
              <span className="w-4 text-right font-mono text-[10px] text-muted-foreground">
                {v}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* STAR */}
      {evaluation.star && (
        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          {Object.entries(evaluation.star).map(([k, v]) => (
            <span
              key={k}
              className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium ${
                v === "✓"
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground"
              }`}
            >
              {v === "✓" && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
              {v !== "✓" && <Plus className="h-2.5 w-2.5" strokeWidth={3} />}
              {k.toUpperCase()}
            </span>
          ))}
        </div>
      )}

      {/* strengths / improvements */}
      <div className="mt-4 grid gap-4 border-t border-border pt-3.5 sm:grid-cols-2">
        {!!evaluation.strengths?.length && (
          <div>
            <div className="pp-label mb-1.5 flex items-center gap-1.5 text-primary">
              <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> Strengths
            </div>
            <ul className="space-y-1.5">
              {evaluation.strengths.map((s, i) => (
                <li key={i} className="text-xs leading-relaxed text-foreground/90">
                  · {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {!!evaluation.improvements?.length && (
          <div>
            <div className="pp-label mb-1.5 flex items-center gap-1.5 text-amber-700">
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} /> Improve
            </div>
            <ul className="space-y-1.5">
              {evaluation.improvements.map((s, i) => (
                <li key={i} className="text-xs leading-relaxed text-foreground/90">
                  · {typeof s === "string" ? s : `${s.issue} → ${s.fix}`}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {typeof evaluation.word_count === "number" && (
        <p className="pp-label mt-3.5">{evaluation.word_count} words analyzed</p>
      )}
    </motion.div>
  );
}
