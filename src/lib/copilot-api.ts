/**
 * Interview Copilot API client.
 *
 * Routing rules:
 * - Sandbox (default): requests go through the Caddy gateway using the
 *   `XTransformPort=8000` query param (same-origin, no CORS needed).
 * - Local dev (optional): set NEXT_PUBLIC_API_BASE=http://localhost:8000 in
 *   the frontend .env to hit the FastAPI backend directly (CORS is open).
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";
const BACKEND_PORT = 8000;

function url(path: string): string {
  const clean = path.replace(/^\//, "");
  if (API_BASE) return `${API_BASE}/${clean}`;
  return `/${clean}?XTransformPort=${BACKEND_PORT}`;
}

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url(path), {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? JSON.stringify(body);
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------- health

export function getHealth() {
  return jsonFetch<import("./types").HealthInfo>("api/health");
}

export function getModels() {
  return jsonFetch<{ default: string; models: import("./types").ModelOption[] }>("api/models");
}

// ---------------------------------------------------------------- sessions

export function createSession() {
  return jsonFetch<import("./types").SessionView>("api/sessions", { method: "POST" });
}

export function getSession(sessionId: string) {
  return jsonFetch<import("./types").SessionView>(`api/sessions/${sessionId}`);
}

export function deleteSession(sessionId: string) {
  return jsonFetch<{ deleted: boolean }>(`api/sessions/${sessionId}`, { method: "DELETE" });
}

// ---------------------------------------------------------------- documents

export function uploadDocument(file: File, sessionId: string, docType: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("session_id", sessionId);
  form.append("doc_type", docType);
  return jsonFetch<import("./types").UploadResult>("api/documents/upload", {
    method: "POST",
    body: form,
  });
}

export function uploadTextDocument(
  sessionId: string,
  text: string,
  docType: string,
  name: string
) {
  return jsonFetch<import("./types").UploadResult>("api/documents/text", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, text, doc_type: docType, name }),
  });
}

export function deleteDocument(sessionId: string, docId: string) {
  return jsonFetch<{ deleted: boolean; flags: import("./types").ContextFlags }>(
    `api/documents/${sessionId}/${docId}`,
    { method: "DELETE" }
  );
}

// ---------------------------------------------------------------- chat

export function sendChat(
  sessionId: string,
  message: string,
  mode: string,
  provider?: string
) {
  return jsonFetch<import("./types").ChatResponse>("api/chat", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      message,
      mode,
      ...(provider && provider !== "auto" ? { provider } : {}),
    }),
  });
}

/** Backend reachable? Used for the connection indicator. */
export async function pingBackend(): Promise<boolean> {
  try {
    const h = await getHealth();
    return h.status === "ok";
  } catch {
    return false;
  }
}
