"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Bot,
  Braces,
  Code2,
  HeartHandshake,
  MessagesSquare,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ChatMessage } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { PipelineThinking } from "./PipelineTrace";

const SUGGESTIONS = [
  {
    icon: Users,
    label: "Start an HR interview",
    prompt: "Let's practice! Start an HR / behavioral round with me.",
  },
  {
    icon: Braces,
    label: "Technical round",
    prompt: "Start a technical interview round based on my background.",
  },
  {
    icon: Code2,
    label: "Coding challenge",
    prompt: "Give me a coding challenge to solve.",
  },
  {
    icon: HeartHandshake,
    label: "Culture fit practice",
    prompt: "Run a culture-fit interview round with me.",
  },
  {
    icon: Sparkles,
    label: "Tailor my resume",
    prompt: "Tailor my resume for the uploaded job description.",
  },
];

interface Props {
  messages: ChatMessage[];
  thinking: boolean;
  onSend: (text: string) => void;
  hasDocs: boolean;
}

export function ChatArea({ messages, thinking, onSend, hasDocs }: Props) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, thinking, input]);

  function submit() {
    const text = input.trim();
    if (!text || thinking) return;
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    onSend(text);
  }

  const empty = messages.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* messages */}
      <div ref={scrollRef} className="ic-scroll flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-5">
          {empty && (
            <div className="flex flex-col items-center py-10 text-center sm:py-16">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
                <MessagesSquare className="h-7 w-7 text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-100">
                Ready when you are
              </h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
                {hasDocs
                  ? "Your knowledge base is loaded. Pick a practice round below, ask anything, or paste a resume draft for review."
                  : "No documents yet — I'll coach you with general best practices. Upload a resume or job description anytime for grounded, personalized help."}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => onSend(s.prompt)}
                    className="group inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3.5 py-2 text-xs text-zinc-300 transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:text-emerald-200"
                  >
                    <s.icon className="h-3.5 w-3.5 text-zinc-500 group-hover:text-emerald-400" />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}

          {thinking && (
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl rounded-tl-sm border border-zinc-700/70 bg-zinc-900/70 px-4 py-3">
                <PipelineThinking />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* input */}
      <div className="border-t border-zinc-800/80 bg-zinc-950/80 px-4 py-3.5 backdrop-blur sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="relative rounded-2xl border border-zinc-700/80 bg-zinc-900/70 focus-within:border-emerald-500/50">
            <Textarea
              ref={taRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Answer the question, ask for help, or paste a resume draft for review…"
              rows={1}
              className="ic-scroll max-h-[180px] min-h-[52px] resize-none border-0 bg-transparent pr-14 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-0"
              aria-label="Chat message"
            />
            <Button
              size="icon"
              onClick={submit}
              disabled={!input.trim() || thinking}
              aria-label="Send message"
              className="absolute bottom-2.5 right-2.5 h-8 w-8 rounded-xl bg-emerald-500 text-zinc-950 hover:bg-emerald-400 disabled:opacity-30"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-zinc-600">
            <span className="inline-flex items-center gap-1">
              <ArrowUp className="h-3 w-3" /> Enter to send · Shift+Enter for newline
            </span>
            <span>answers are scored · resumes get ATS-checked</span>
          </div>
        </div>
      </div>
    </div>
  );
}
