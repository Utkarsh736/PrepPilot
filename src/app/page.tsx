"use client";

import { useEffect, useState } from "react";
import { CopilotApp } from "@/components/copilot/CopilotApp";
import { Landing } from "@/components/landing/Landing";

const LS_VIEW = "ic_view";

export default function Home() {
  const [view, setView] = useState<"landing" | "app">("landing");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // restore last view + support #app deep-link (client-only external state)
    const fromHash = window.location.hash === "#app" ? "app" : null;
    const saved = (localStorage.getItem(LS_VIEW) as "landing" | "app" | null) ?? "landing";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage/hash
    setView(fromHash ?? saved);
    setHydrated(true);
  }, []);

  function launch() {
    localStorage.setItem(LS_VIEW, "app");
    window.location.hash = "app";
    setView("app");
  }

  function exit() {
    localStorage.setItem(LS_VIEW, "landing");
    window.location.hash = "";
    setView("landing");
  }

  // avoid hydration flash by rendering nothing until mounted
  if (!hydrated) {
    return <div className="min-h-screen bg-zinc-950" aria-hidden />;
  }

  return view === "app" ? <CopilotApp onExit={exit} /> : <Landing onLaunch={launch} />;
}
