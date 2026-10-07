"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  Braces,
  Database,
  FileText,
  Gauge,
  GraduationCap,
  HeartHandshake,
  MessagesSquare,
  ScanSearch,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Users,
    title: "4 interview coaches",
    body: "Specialized HR, Technical, Coding and Culture-Fit agents run realistic one-question-at-a-time rounds, grounded in your actual background.",
    tags: ["HR", "Technical", "Coding", "Culture Fit"],
  },
  {
    icon: ScanSearch,
    title: "Personal knowledge base",
    body: "Upload resumes (PDF/DOCX), work experience, education and job descriptions. Everything is chunked, embedded and retrieved on demand.",
    tags: ["RAG", "ChromaDB", "PDF parsing"],
  },
  {
    icon: FileText,
    title: "Tailored resumes",
    body: "The Resume Tailor rebuilds your resume around the target job description — mirrored keywords, reworded bullets, ATS coverage table.",
    tags: ["ATS", "Keyword mirroring"],
  },
  {
    icon: Gauge,
    title: "Scored feedback",
    body: "Every answer gets a rubric score with STAR analysis, strengths, concrete fixes and a model answer. Resume drafts get the same treatment.",
    tags: ["Rubrics", "STAR", "1-10 scoring"],
  },
];

const STEPS = [
  {
    n: "01",
    title: "Upload your context",
    body: "Drop in your resume PDFs, work-experience notes and the job descriptions you're targeting. Or start with nothing — the copilot works generically too.",
  },
  {
    n: "02",
    title: "Practice with agents",
    body: "Pick a round — HR, technical, coding or culture fit. The router agent sends your message to the right coach with your retrieved context attached.",
  },
  {
    n: "03",
    title: "Get scored & tailored",
    body: "Answer questions and watch the rubric scores roll in. Then have the Resume Tailor build a JD-optimized resume from your real experience.",
  },
];

const STACK = [
  { icon: Workflow, label: "LangGraph" },
  { icon: Braces, label: "LangChain" },
  { icon: Database, label: "ChromaDB" },
  { icon: Sparkles, label: "DSPy" },
  { icon: Bot, label: "Gemini / Groq / OpenRouter" },
  { icon: GraduationCap, label: "FastAPI + uv" },
];

const COACH_CHIPS = [
  { icon: Users, label: "HR Coach", color: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" },
  { icon: Braces, label: "Technical Coach", color: "text-amber-300 border-amber-500/30 bg-amber-500/10" },
  { icon: Bot, label: "Coding Coach", color: "text-rose-300 border-rose-500/30 bg-rose-500/10" },
  { icon: HeartHandshake, label: "Culture-Fit Coach", color: "text-teal-300 border-teal-500/30 bg-teal-500/10" },
];

export function Landing({ onLaunch }: { onLaunch: () => void }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* ------------------------------------------------ nav */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30">
              <MessagesSquare className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight">Interview Copilot</div>
              <div className="text-[11px] text-zinc-500">RAG · Agentic · Career</div>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-zinc-400 md:flex">
            <a className="hover:text-zinc-200 transition-colors" href="#features">Features</a>
            <a className="hover:text-zinc-200 transition-colors" href="#how">How it works</a>
            <a className="hover:text-zinc-200 transition-colors" href="#stack">Stack</a>
          </nav>
          <Button
            onClick={onLaunch}
            className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400 font-semibold"
          >
            Launch app <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* ------------------------------------------------ hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="ic-aurora absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
          <div
            className="ic-aurora absolute top-10 right-1/4 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl"
            style={{ animationDelay: "-7s" }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <Badge variant="outline" className="mb-5 border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Multi-agent · RAG-grounded
              </Badge>
              <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                An interview coach that{" "}
                <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
                  actually knows you
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
                Upload your resumes and target job descriptions. Practice HR, technical,
                coding and culture-fit rounds with an agentic AI that grounds every
                question in <em className="not-italic text-zinc-200">your real experience</em> —
                then builds the tailored resume that gets you the offer.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  onClick={onLaunch}
                  className="h-12 bg-emerald-500 px-6 text-base font-semibold text-zinc-950 hover:bg-emerald-400"
                >
                  Start practicing free <ArrowRight className="ml-1.5 h-5 w-5" />
                </Button>
                <a
                  href="#how"
                  className="inline-flex h-12 items-center rounded-xl border border-zinc-700 px-5 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
                >
                  See how it works
                </a>
              </div>
              <p className="mt-5 text-xs text-zinc-500">
                Works instantly in Demo Mode · add a free Gemini / Groq / OpenRouter key
                for full AI power
              </p>
            </div>

            {/* chat preview mock */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="relative"
            >
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-2xl shadow-emerald-950/40">
                <div className="flex items-center gap-1.5 border-b border-zinc-800 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/70" />
                  <span className="ml-3 text-xs text-zinc-500">interview-copilot · practice round</span>
                </div>
                <div className="space-y-4 p-5 text-sm">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-emerald-500/15 border border-emerald-500/25 px-4 py-2.5 text-emerald-50">
                      I have an interview at a fintech for a senior backend role. Can you
                      help me prepare?
                    </div>
                  </div>
                  <div className="max-w-[92%] space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {COACH_CHIPS.map((c) => (
                        <span
                          key={c.label}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${c.color}`}
                        >
                          <c.icon className="h-3 w-3" />
                          {c.label}
                        </span>
                      ))}
                    </div>
                    <div className="rounded-2xl rounded-bl-sm border border-zinc-700/70 bg-zinc-800/60 px-4 py-3 leading-relaxed text-zinc-300">
                      <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-emerald-400/90">
                        HR Coach · grounded in resume.pdf + payments-jd.txt
                      </p>
                      You led the payments monolith→microservices migration at FinPay —
                      walk me through the hardest trade-off you made, and what it cost
                      the team.
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-400">
                      <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-emerald-300">8.5/10</span>
                      <span>relevance 9 · structure 8 · depth 8 · communication 9</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ features */}
      <section id="features" className="border-t border-zinc-800/60 bg-zinc-950 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">
            Everything a job seeker needs, agentified
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-zinc-400 sm:text-base">
            A LangGraph pipeline routes every message to the right specialist agent,
            with your documents retrieved from a ChromaDB knowledge base.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
              >
                <Card className="h-full border-zinc-800 bg-zinc-900/60 transition-colors hover:border-zinc-700">
                  <CardContent className="p-6">
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/25 bg-emerald-500/10">
                      <f.icon className="h-5 w-5 text-emerald-400" />
                    </div>
                    <h3 className="text-base font-semibold">{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.body}</p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {f.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-zinc-700/70 bg-zinc-800/60 px-2 py-0.5 text-[11px] text-zinc-400"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ how it works */}
      <section id="how" className="border-t border-zinc-800/60 bg-zinc-950 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-bold sm:text-3xl">How it works</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="relative rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6"
              >
                <span className="font-mono text-3xl font-bold text-emerald-500/30">{s.n}</span>
                <h3 className="mt-3 text-base font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-900/40 p-5 text-center text-sm text-zinc-400">
            <span className="font-medium text-zinc-200">No documents? No problem.</span>{" "}
            The copilot detects missing context and switches to a general coaching mode
            — every agent degrades gracefully instead of refusing.
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ stack */}
      <section id="stack" className="border-t border-zinc-800/60 bg-zinc-950 py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-center text-xs font-medium uppercase tracking-widest text-zinc-500">
            Powered by a fully open, free-tier stack
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {STACK.map((s) => (
              <span
                key={s.label}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-2.5 text-sm text-zinc-300"
              >
                <s.icon className="h-4 w-4 text-emerald-400" />
                {s.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ footer (sticky per layout rules) */}
      <footer className="mt-auto border-t border-zinc-800/60 bg-zinc-950">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-xs text-zinc-500 sm:flex-row sm:px-6">
          <span>Interview Copilot — LangGraph + LangChain + DSPy + ChromaDB</span>
          <span>Bring your own free-tier API key · nothing leaves your machine</span>
        </div>
      </footer>
    </div>
  );
}
