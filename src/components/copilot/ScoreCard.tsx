"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Gauge, TrendingUp, Wrench } from "lucide-react";
import type { Evaluation } from "@/lib/types";

function scoreColor(v: number): string {
  if (v >= 8) return "bg-emerald-500";
  if (v >= 6.5) return "bg-teal-400";
  if (v >= 5) return "bg-amber-400";
  return "bg-rose-400";
}

function scoreText(v: number): string {
  if (v >= 8) return "text-emerald-300";
  if (v >= 6.5) return "text-teal-300";
  if (v >= 5) return "text-amber-300";
  return "text-rose-300";
}

const DIM_LABELS: Record<string, string> = {
  relevance: "Relevance",
  structure: "Structure",
  depth: "Depth",
  communication: "Communication",
  impact: "Impact",
  ats_format: "ATS Format",
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
      className="mt-3 rounded-xl border border-zinc-700/70 bg-zinc-900/70 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-semibold text-zinc-100">Answer scorecard</span>
          {isHeuristic && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
              heuristic
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`font-mono text-2xl font-bold ${scoreText(overall)}`}>{overall}</span>
          <span className="text-xs text-zinc-500">/ 10</span>
        </div>
      </div>

      {/* dimension bars */}
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {dims.map(([k, v]) => (
          <div key={k} className="flex items-center gap-2.5">
            <span className="w-24 shrink-0 text-[11px] text-zinc-400">
              {DIM_LABELS[k] ?? k.replace("_", " ")}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (v / 10) * 100)}%` }}
                transition={{ duration: 0.7, ease: "easeOut" }}
                className={`h-full rounded-full ${scoreColor(v)}`}
              />
            </div>
            <span className="w-5 text-right font-mono text-[11px] text-zinc-400">{v}</span>
          </div>
        ))}
      </div>

      {/* STAR */}
      {evaluation.star && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {Object.entries(evaluation.star).map(([k, v]) => (
            <span
              key={k}
              className={`rounded-md border px-2 py-0.5 font-mono text-[10px] ${
                v === "✓"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                  : "border-zinc-700 bg-zinc-800/60 text-zinc-500"
              }`}
            >
              {k.toUpperCase()} {v}
            </span>
          ))}
        </div>
      )}

      {/* strengths / improvements */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {!!evaluation.strengths?.length && (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-emerald-400/90">
              <CheckCircle2 className="h-3.5 w-3.5" /> Strengths
            </div>
            <ul className="space-y-1.5">
              {evaluation.strengths.map((s, i) => (
                <li key={i} className="text-xs leading-relaxed text-zinc-300">
                  • {s}
                </li>
              ))}
            </ul>
          </div>
        )}
        {!!evaluation.improvements?.length && (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-amber-400/90">
              <Wrench className="h-3.5 w-3.5" /> Improve
            </div>
            <ul className="space-y-1.5">
              {evaluation.improvements.map((s, i) => (
                <li key={i} className="text-xs leading-relaxed text-zinc-300">
                  • {typeof s === "string" ? s : `${s.issue} → ${s.fix}`}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {typeof evaluation.word_count === "number" && (
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-zinc-500">
          <TrendingUp className="h-3 w-3" />
          {evaluation.word_count} words analyzed
        </div>
      )}
    </motion.div>
  );
}
