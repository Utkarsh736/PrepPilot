/** Shared types mirroring the backend contracts. */

export type Intent = "interview" | "resume" | "critique" | "general";
export type InterviewType = "hr" | "technical" | "coding" | "culture_fit";
export type Mode = "auto" | InterviewType;
export type DocType =
  | "resume"
  | "job_description"
  | "work_experience"
  | "education"
  | "other";

export interface PipelineStep {
  node: string;
  label: string;
  detail: string;
  ms: number;
}

export interface SourceRef {
  name: string;
  type: DocType;
}

export interface Evaluation {
  overall: number;
  dimensions: Record<string, number>;
  strengths?: string[];
  improvements?: string[];
  star?: Record<string, string>;
  method?: string;
  word_count?: number;
  model_answer?: string;
  missing_keywords?: string[];
}

export interface ChatMeta {
  intent?: Intent;
  interview_type?: InterviewType;
  sources?: SourceRef[];
  pipeline?: PipelineStep[];
  provider?: string;
  model?: string;
  evaluation?: Evaluation | null;
  elapsed_s?: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
  meta?: ChatMeta;
}

export interface DocRecord {
  doc_id: string;
  name: string;
  doc_type: DocType;
  word_count: number;
  chunk_count: number;
  pages: number;
  parser: string;
  keywords: string[];
  created_at: number;
}

export interface ContextFlags {
  has_profile: boolean;
  has_resume: boolean;
  has_jd: boolean;
  doc_count: number;
}

export interface SessionView {
  session_id: string;
  created_at: number;
  documents: DocRecord[];
  interview: {
    mode: Mode;
    current_type: string;
    pending_question: string;
    asked_questions: string[];
    turn_count: number;
    scores: Evaluation[];
  };
  flags: ContextFlags;
  messages: ChatMessage[];
}

export interface ModelOption {
  id: string;
  label: string;
  model: string;
  note: string;
  available: boolean;
  env_key: string;
}

export interface HealthInfo {
  status: string;
  default_provider: string;
  any_key_configured: boolean;
  embedding: { provider: string; kind: string };
}

export interface ChatResponse {
  response: string;
  intent: Intent;
  interview_type: InterviewType | "";
  evaluation: Evaluation | null;
  sources: SourceRef[];
  pipeline: PipelineStep[];
  provider: string;
  model: string;
  flags: ContextFlags;
  elapsed_s: number;
}

export interface UploadResult {
  document: DocRecord;
  flags: ContextFlags;
  warning?: string;
}
