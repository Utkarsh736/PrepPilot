"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, FileText, User } from "lucide-react";
import type { ChatMessage, DocType } from "@/lib/types";
import { PipelineTrace } from "./PipelineTrace";
import { ScoreCard } from "./ScoreCard";

const TYPE_STYLES: Record<DocType, string> = {
  resume: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  job_description: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  work_experience: "border-teal-500/30 bg-teal-500/10 text-teal-300",
  education: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  other: "border-zinc-600/50 bg-zinc-700/30 text-zinc-300",
};

const TYPE_LABELS: Record<DocType, string> = {
  resume: "resume",
  job_description: "job",
  work_experience: "work ex",
  education: "edu",
  other: "doc",
};

/** Progressive client-side reveal for assistant messages (streaming feel). */
function useTypewriter(text: string, enabled: boolean, speed = 14) {
  const [shown, setShown] = useState(enabled ? "" : text);

  useEffect(() => {
    if (!enabled || shown.length >= text.length) return;
    const step = Math.max(3, Math.round(text.length / 220));
    const t = setTimeout(() => {
      setShown(text.slice(0, shown.length + step));
    }, speed);
    return () => clearTimeout(t);
  }, [shown, text, enabled, speed]);

  return { shown, typing: enabled && shown.length < text.length };
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const meta = message.meta ?? {};
  const isFreshAssistant = !isUser && message.id.startsWith("new-");
  const { shown, typing } = useTypewriter(message.content, isFreshAssistant);
  const rendered = isUser ? message.content : shown;

  const markdown = useMemo(
    () => (
      <div className="ic-markdown text-sm leading-relaxed break-words">
        <ReactMarkdown>{rendered}</ReactMarkdown>
      </div>
    ),
    [rendered]
  );

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* avatar */}
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
          isUser
            ? "border-zinc-700 bg-zinc-800 text-zinc-300"
            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* body */}
      <div className={`min-w-0 max-w-[88%] ${isUser ? "text-right" : ""}`}>
        {isUser ? (
          <div className="inline-block rounded-2xl rounded-tr-sm border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-left text-sm leading-relaxed text-emerald-50">
            {rendered}
          </div>
        ) : (
          <div className="rounded-2xl rounded-tl-sm border border-zinc-700/70 bg-zinc-900/70 px-4 py-3 text-zinc-200">
            {meta.intent && (
              <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                <span className="text-emerald-400/90">{agentLabel(meta.intent, meta.interview_type)}</span>
                {meta.model && <span className="text-zinc-600">· {meta.model}</span>}
              </div>
            )}
            <div className={typing ? "ic-caret" : undefined}>{markdown}</div>

            {/* evaluation scorecard */}
            {meta.evaluation && <ScoreCard evaluation={meta.evaluation} />}

            {/* sources + pipeline */}
            {(!!meta.sources?.length || !!meta.pipeline?.length) && (
              <div className="mt-3 border-t border-zinc-800 pt-2.5">
                {!!meta.sources?.length && (
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-600">grounded in</span>
                    {meta.sources.map((s, i) => (
                      <span
                        key={i}
                        title={s.type}
                        className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] ${TYPE_STYLES[s.type] ?? TYPE_STYLES.other}`}
                      >
                        <FileText className="h-3 w-3" />
                        {s.name.length > 22 ? s.name.slice(0, 20) + "…" : s.name}
                      </span>
                    ))}
                  </div>
                )}
                <PipelineTrace steps={meta.pipeline ?? []} elapsed={meta.elapsed_s} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function agentLabel(intent?: string, type?: string): string {
  if (intent === "interview") {
    switch (type) {
      case "hr":
        return "HR Coach";
      case "technical":
        return "Technical Coach";
      case "coding":
        return "Coding Coach";
      case "culture_fit":
        return "Culture-Fit Coach";
      default:
        return "Interview Coach";
    }
  }
  if (intent === "resume") return "Resume Tailor";
  if (intent === "critique") return "Resume Critic";
  return "Career Assistant";
}
