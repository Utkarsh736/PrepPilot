"use client";

import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { FileText, User } from "lucide-react";
import { BrandMark } from "@/components/brand";
import type { ChatMessage, DocType } from "@/lib/types";
import { PipelineTrace } from "./PipelineTrace";
import { ScoreCard } from "./ScoreCard";

const TYPE_STYLES: Record<DocType, string> = {
  resume: "border-primary/30 bg-primary/10 text-primary",
  job_description: "border-amber-300 bg-amber-50 text-amber-800",
  work_experience: "border-teal-300 bg-teal-50 text-teal-800",
  education: "border-violet-300 bg-violet-50 text-violet-800",
  other: "border-border bg-secondary text-muted-foreground",
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
  const agent = agentMeta(meta.intent, meta.interview_type);

  const markdown = useMemo(
    () => (
      <div className="pp-markdown break-words text-sm leading-relaxed">
        <ReactMarkdown>{rendered}</ReactMarkdown>
      </div>
    ),
    [rendered]
  );

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      {/* avatar */}
      {isUser ? (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <User className="h-4 w-4" />
        </div>
      ) : (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-card">
          <BrandMark className="h-4.5 w-4.5 text-primary" />
        </div>
      )}

      {/* body */}
      <div className={`min-w-0 max-w-[88%] ${isUser ? "text-right" : ""}`}>
        {isUser ? (
          <div className="inline-block rounded-lg rounded-tr-sm bg-primary px-4 py-2.5 text-left text-sm leading-relaxed text-primary-foreground">
            {rendered}
          </div>
        ) : (
          <div className="rounded-lg rounded-tl-sm border border-border bg-card px-4 py-3">
            {meta.intent && (
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${agent.dot}`} aria-hidden="true" />
                  <span className="pp-label text-foreground">{agent.label}</span>
                </span>
                {meta.model && (
                  <span className="font-mono text-[10px] text-muted-foreground">{meta.model}</span>
                )}
              </div>
            )}
            <div className={typing ? "pp-caret" : undefined}>{markdown}</div>

            {/* evaluation scorecard */}
            {meta.evaluation && <ScoreCard evaluation={meta.evaluation} />}

            {/* sources + pipeline */}
            {(!!meta.sources?.length || !!meta.pipeline?.length) && (
              <div className="mt-3 border-t border-dashed border-border pt-2.5">
                {!!meta.sources?.length && (
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    <span className="pp-label">grounded in</span>
                    {meta.sources.map((s, i) => (
                      <span
                        key={i}
                        title={s.type}
                        className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] font-medium ${TYPE_STYLES[s.type] ?? TYPE_STYLES.other}`}
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

type AgentIdentity = { label: string; dot: string };

function agentMeta(intent?: string, type?: string): AgentIdentity {
  if (intent === "interview") {
    switch (type) {
      case "hr":
        return { label: "HR coach", dot: "bg-primary" };
      case "technical":
        return { label: "Technical coach", dot: "bg-amber-500" };
      case "coding":
        return { label: "Coding coach", dot: "bg-orange-600" };
      case "culture_fit":
        return { label: "Culture-fit coach", dot: "bg-teal-600" };
      default:
        return { label: "Interview coach", dot: "bg-primary" };
    }
  }
  if (intent === "resume") return { label: "Resume tailor", dot: "bg-foreground/70" };
  if (intent === "critique") return { label: "Resume critic", dot: "bg-amber-500" };
  return { label: "Career assistant", dot: "bg-muted-foreground/60" };
}
