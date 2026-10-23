"use client";

import { useEffect, useRef, useState } from "react";
import { Braces, Code2, HeartHandshake, Route, Send, Sparkles, Users } from "lucide-react";
import { BrandMark } from "@/components/brand";
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
      <div ref={scrollRef} className="pp-scroll flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {empty && (
            <div className="flex flex-col items-center py-8 text-center sm:py-14">
              <BrandMark className="mb-4 h-9 w-9 text-primary" />
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                Ready when you are.
              </h2>
              <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                {hasDocs
                  ? "Your knowledge base is loaded and the coaches are briefed. Pick a round below, ask anything, or paste a resume draft for review."
                  : "No documents on file yet — I'll coach you with general best practices. Upload a resume or job description anytime and the coaching gets personal."}
              </p>
              <div className="mt-7 flex max-w-lg flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => onSend(s.prompt)}
                    className="group inline-flex items-center gap-2 rounded-md border border-border bg-card px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    <s.icon className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-primary" />
                    {s.label}
                  </button>
                ))}
              </div>
              <p className="pp-label mt-6 flex items-center gap-1.5">
                <Route className="h-3 w-3" /> the router picks the right agent
                automatically
              </p>
            </div>
          )}

          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}

          {thinking && (
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-card">
                <BrandMark className="h-4.5 w-4.5 text-primary" />
              </div>
              <div className="rounded-lg rounded-tl-sm border border-border bg-card px-4 py-3">
                <PipelineThinking />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* input */}
      <div className="border-t bg-background px-4 py-3.5 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="relative rounded-lg border border-border bg-card transition-colors focus-within:border-primary/60">
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
              className="pp-scroll max-h-[180px] min-h-[52px] resize-none border-0 bg-transparent pr-14 text-sm focus-visible:ring-0"
              aria-label="Chat message"
            />
            <Button
              size="icon"
              onClick={submit}
              disabled={!input.trim() || thinking}
              aria-label="Send message"
              className="absolute bottom-2.5 right-2.5 h-8 w-8 rounded-md"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between px-1">
            <span className="pp-label">Enter to send · shift+enter for newline</span>
            <span className="pp-label hidden sm:inline">
              answers scored · resumes ATS-checked
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
