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
  ScanSearch,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import { BrandMark, BrandWordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    n: "01",
    icon: Users,
    title: "Four specialist coaches",
    body: "HR, technical, coding and culture-fit agents run realistic one-question-at-a-time rounds, grounded in your actual background — with the reasoning a real panel would push on.",
    tags: ["HR", "Technical", "Coding", "Culture fit"],
  },
  {
    n: "02",
    icon: ScanSearch,
    title: "A knowledge base that knows you",
    body: "Resumes, work experience, education and job descriptions are parsed, chunked, embedded and stored. The right fragments are retrieved the moment a coach needs them.",
    tags: ["RAG", "ChromaDB", "PDF / DOCX parsing"],
  },
  {
    n: "03",
    icon: FileText,
    title: "Resumes tailored to the JD",
    body: "The Resume Tailor rebuilds your resume around the target job description — mirrored keywords, reworded bullets, and an ATS coverage table you can check line by line.",
    tags: ["ATS", "Keyword mirroring"],
  },
  {
    n: "04",
    icon: Gauge,
    title: "Every answer scored",
    body: "Rubric scoring with STAR analysis, named strengths, concrete fixes and a model answer — heuristic scoring included even in demo mode, so practice always pays.",
    tags: ["Rubrics", "STAR", "1–10 scale"],
  },
];

const STEPS = [
  {
    n: "01",
    title: "Load your context",
    body: "Drop resumes, work history and the job descriptions you're targeting into the knowledge base. Or start with nothing — every agent degrades gracefully to general coaching.",
  },
  {
    n: "02",
    title: "Pick your round",
    body: "Choose HR, technical, coding or culture-fit — or let the router decide. The LangGraph pipeline attaches your retrieved context to every single message.",
  },
  {
    n: "03",
    title: "Score, fix, repeat",
    body: "Answer questions, read your scorecard, fix the gaps. When you're sharp, have the Resume Tailor draft the JD-optimized resume from your real experience.",
  },
];

const STACK = [
  { icon: Workflow, label: "LangGraph" },
  { icon: Braces, label: "LangChain" },
  { icon: Database, label: "ChromaDB" },
  { icon: Sparkles, label: "DSPy" },
  { icon: Bot, label: "Gemini · Groq · OpenRouter" },
  { icon: GraduationCap, label: "FastAPI + uv" },
];

const COACH_DOTS = [
  { label: "HR", color: "bg-primary" },
  { label: "TECH", color: "bg-amber-500" },
  { label: "CODE", color: "bg-orange-600" },
  { label: "CULT", color: "bg-teal-600" },
];

export function Landing({ onLaunch }: { onLaunch: () => void }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* ------------------------------------------------ nav */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <BrandWordmark markClassName="h-7 w-7" />
          <nav
            className="hidden items-center gap-7 text-sm text-muted-foreground md:flex"
            aria-label="Page sections"
          >
            <a className="transition-colors hover:text-foreground" href="#features">
              What&apos;s inside
            </a>
            <a className="transition-colors hover:text-foreground" href="#how">
              How it works
            </a>
            <a className="transition-colors hover:text-foreground" href="#stack">
              Stack
            </a>
          </nav>
          <Button onClick={onLaunch} className="gap-1.5 font-semibold">
            Open Prep Pilot <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* ------------------------------------------------ hero */}
      <section className="relative overflow-hidden">
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="pp-label text-primary">Agentic AI · grounded in your own documents</p>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
              Practice the interview{" "}
              <em className="italic underline decoration-primary/40 decoration-2 underline-offset-4">
                before
              </em>{" "}
              it happens.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Prep Pilot turns your resumes and target job descriptions into a
              private knowledge base, then drills you with realistic HR,
              technical, coding and culture-fit rounds — scoring every answer
              and tailoring your resume to the role.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" onClick={onLaunch} className="h-12 gap-2 px-7 text-base font-semibold">
                Start practicing <ArrowRight className="h-4.5 w-4.5" />
              </Button>
              <a
                href="#how"
                className="inline-flex h-12 items-center rounded-md border border-foreground/25 bg-card px-5 text-sm font-medium text-foreground transition-colors hover:border-foreground/50 hover:bg-secondary"
              >
                See how it works
              </a>
            </div>
            <p className="pp-label mt-6">
              Runs in demo mode instantly · add a free Gemini, Groq or
              OpenRouter key for full AI
            </p>
          </div>

          {/* flight-log transcript */}
          <motion.figure
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="relative"
            aria-label="Example practice session"
          >
            {/* flight path arcs behind the sheet — enters bottom-left, exits top-right */}
            <svg
              className="pointer-events-none absolute -bottom-6 -left-9 -right-5 -top-9 h-auto w-[calc(100%+3.5rem)] text-primary/30"
              viewBox="0 0 400 400"
              fill="none"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M4 392 C 110 366, 175 300, 218 218 S 330 62, 392 18"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeDasharray="1 10"
                strokeLinecap="round"
              />
            </svg>
            <svg
              className="pp-cruise absolute -top-10 right-4 h-5 w-5 text-primary/70"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M2 12.5 22 3l-7.2 18.4-2.6-7.6L2 12.5Z" />
            </svg>
            <div className="relative rounded-lg border border-border bg-card shadow-sm">
              {/* log header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="pp-label">Practice round — HR coach</span>
                <span className="flex items-center gap-2">
                  <span className="pp-dot h-1.5 w-1.5 rounded-full bg-primary" />
                  <span className="pp-label text-primary">live</span>
                </span>
              </div>
              {/* transcript */}
              <div className="space-y-4 p-5 text-sm">
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-lg rounded-tr-sm bg-primary px-4 py-2.5 text-primary-foreground">
                    I&apos;ve got a final round at a fintech next week — senior
                    backend. Where do I start?
                  </div>
                </div>
                <div className="max-w-[94%] space-y-2.5">
                  <div className="flex flex-wrap items-center gap-3">
                    {COACH_DOTS.map((c) => (
                      <span key={c.label} className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 rounded-full ${c.color}`} />
                        <span className="pp-label">{c.label}</span>
                      </span>
                    ))}
                  </div>
                  <div className="rounded-lg rounded-tl-sm border border-border bg-background px-4 py-3 leading-relaxed text-foreground">
                    <p className="pp-label mb-2 text-primary">
                      HR coach · grounded in resume.pdf + payments-jd.txt
                    </p>
                    Good news — you led the payments monolith-to-microservices
                    migration at FinPay, and this JD cares most about exactly
                    that. Start there: walk me through the split, and the
                    hardest trade-off you made on the way.
                  </div>
                  <div className="flex items-center gap-3 border-t border-dashed border-border pt-3">
                    <span className="inline-flex items-baseline gap-1 rounded border-2 border-primary/60 px-2 py-0.5">
                      <span className="font-mono text-sm font-bold text-primary">8.4</span>
                      <span className="pp-label">/ 10</span>
                    </span>
                    <span className="pp-label leading-relaxed">
                      relevance 9 · structure 8 · depth 8 · clarity 9
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <figcaption className="pp-label mt-3 text-center">
              every answer scored — star structure, depth, clarity
            </figcaption>
          </motion.figure>
        </div>
      </section>

      {/* ------------------------------------------------ stack strip */}
      <section className="border-y bg-secondary/50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-5 sm:px-6">
          {STACK.map((s) => (
            <span key={s.label} className="flex items-center gap-2">
              <s.icon className="h-3.5 w-3.5 text-primary" />
              <span className="pp-label">{s.label}</span>
            </span>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------ features manifest */}
      <section id="features" className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-4 md:grid-cols-[4rem_15rem_1fr] md:gap-6">
            <span className="pp-label text-primary md:pt-1.5">Manifest</span>
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              A full crew of specialists, on call.
            </h2>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              One LangGraph pipeline routes every message to the right
              specialist agent, with your documents retrieved from a ChromaDB
              knowledge base — the same shape a real interview loop takes.
            </p>
          </div>
          <div className="mt-10">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.n}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="grid gap-3 border-t border-border py-7 md:grid-cols-[4rem_15rem_1fr] md:gap-6"
              >
                <span className="font-mono text-sm font-semibold text-primary/70">
                  {f.n}
                </span>
                <div className="flex items-start gap-3">
                  <f.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <h3 className="text-base font-semibold leading-snug">{f.title}</h3>
                </div>
                <div>
                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
                    {f.body}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                    {f.tags.map((t) => (
                      <span key={t} className="pp-label">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
            <div className="border-t border-border" />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ flight plan */}
      <section id="how" className="border-t bg-secondary/30 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="pp-label text-primary">Flight plan</p>
          <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Three steps to clearance.
          </h2>

          <div className="relative mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
            {/* dashed route connecting the stations */}
            <div
              className="absolute left-5 right-5 top-[1.15rem] hidden border-t-2 border-dashed border-primary/25 md:block"
              aria-hidden="true"
            />
            {STEPS.map((s) => (
              <div key={s.n} className="relative">
                <div className="flex items-center gap-4">
                  <span className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card font-mono text-xs font-semibold text-primary">
                    {s.n}
                  </span>
                  <h3 className="text-base font-semibold">{s.title}</h3>
                </div>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </div>
            ))}
          </div>

          {/* graceful-degradation callout */}
          <div className="mt-12 flex items-start gap-4 rounded-lg border border-dashed border-border bg-card px-5 py-4">
            <BrandMark className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">
                No documents? You&apos;re still cleared.
              </span>{" "}
              Prep Pilot detects missing context and switches every agent to
              general coaching mode — nothing refuses to work, you just get
              more personal help with every file you add.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ closing CTA */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid items-center gap-8 rounded-lg border border-border bg-card px-6 py-10 sm:px-10 md:grid-cols-[1fr_auto]">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                The interview is next week. You&apos;ve got this.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Start a session in demo mode right now — no account, no key, no
                setup. Add documents when you want the coaching to get
                personal.
              </p>
            </div>
            <Button size="lg" onClick={onLaunch} className="h-12 gap-2 px-8 text-base font-semibold">
              Board Prep Pilot <ArrowRight className="h-4.5 w-4.5" />
            </Button>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ footer (sticky per layout rules) */}
      <footer className="mt-auto border-t bg-background">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-muted-foreground sm:flex-row sm:px-6">
          <span className="pp-label">
            Prep Pilot — LangGraph · LangChain · DSPy · ChromaDB
          </span>
          <span className="pp-label">
            Your documents stay on your machine · bring your own free-tier key
          </span>
        </div>
      </footer>
    </div>
  );
}
