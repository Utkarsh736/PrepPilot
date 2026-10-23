"use client";

import { useRef, useState } from "react";
import {
  Briefcase,
  Check,
  ClipboardPaste,
  FileText,
  FileUp,
  GraduationCap,
  Loader2,
  Paperclip,
  ScrollText,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  deleteDocument,
  uploadDocument,
  uploadTextDocument,
} from "@/lib/copilot-api";
import type { ContextFlags, DocRecord, DocType } from "@/lib/types";

const DOC_TYPE_META: Record<
  string,
  { label: string; icon: typeof FileText; chip: string }
> = {
  resume: {
    label: "Resume",
    icon: FileText,
    chip: "border-primary/30 bg-primary/10 text-primary",
  },
  job_description: {
    label: "Job",
    icon: Briefcase,
    chip: "border-amber-300 bg-amber-50 text-amber-800",
  },
  work_experience: {
    label: "Work ex",
    icon: ScrollText,
    chip: "border-teal-300 bg-teal-50 text-teal-800",
  },
  education: {
    label: "Education",
    icon: GraduationCap,
    chip: "border-violet-300 bg-violet-50 text-violet-800",
  },
  other: {
    label: "Doc",
    icon: Paperclip,
    chip: "border-border bg-secondary text-muted-foreground",
  },
};

const ACCEPTED = ".pdf,.docx,.txt,.md,.markdown";

function guessDocType(filename: string): DocType {
  const n = filename.toLowerCase();
  if (/(resume|cv)/.test(n)) return "resume";
  if (/(jd|job|position|role|vacanc|posting)/.test(n)) return "job_description";
  if (/(experience|work)/.test(n)) return "work_experience";
  if (/(education|degree|transcript|diploma)/.test(n)) return "education";
  return "other";
}

interface Props {
  sessionId: string;
  documents: DocRecord[];
  flags: ContextFlags | null;
  onUploaded: (doc: DocRecord, flags: ContextFlags) => void;
  onDeleted: (docId: string, flags: ContextFlags) => void;
}

export function DocumentPanel({ sessionId, documents, flags, onUploaded, onDeleted }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadType, setUploadType] = useState<string>("resume");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pasteName, setPasteName] = useState("");
  const [pasteType, setPasteType] = useState<string>("job_description");

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const t = uploadType === "auto" ? guessDocType(file.name) : uploadType;
      const res = await uploadDocument(file, sessionId, t);
      onUploaded(res.document, res.flags);
      if (res.warning)
        toast({ title: "Parsed with a warning", description: res.warning, variant: "destructive" });
      else
        toast({
          title: `${file.name} added`,
          description: `${res.document.word_count} words · ${res.document.chunk_count} chunks indexed`,
        });
    } catch (e) {
      toast({ title: "Upload failed", description: String((e as Error).message), variant: "destructive" });
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handlePasteSubmit() {
    if (pasteText.trim().length < 20) {
      toast({ title: "Text too short", description: "Paste at least a few lines.", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      const name = pasteName.trim() || `pasted-${pasteType}.txt`;
      const res = await uploadTextDocument(sessionId, pasteText, pasteType, name);
      onUploaded(res.document, res.flags);
      toast({
        title: `${res.document.name} added`,
        description: `${res.document.word_count} words indexed`,
      });
      setPasteOpen(false);
      setPasteText("");
      setPasteName("");
    } catch (e) {
      toast({ title: "Could not add text", description: String((e as Error).message), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(doc: DocRecord) {
    try {
      const res = await deleteDocument(sessionId, doc.doc_id);
      onDeleted(doc.doc_id, res.flags);
    } catch (e) {
      toast({ title: "Delete failed", description: String((e as Error).message), variant: "destructive" });
    }
  }

  return (
    <div className="space-y-3">
      {/* pre-flight check — grounding context status */}
      <div className="rounded-md border border-border bg-card px-3 py-2.5">
        <h4 className="pp-label mb-2">Pre-flight check</h4>
        <ul className="space-y-1.5">
          <CheckRow label="Profile (resume or work ex)" ok={!!flags?.has_profile} />
          <CheckRow label="Job description" ok={!!flags?.has_jd} />
        </ul>
      </div>

      {/* upload box */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a document"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-md border border-dashed p-4 text-center transition-colors ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-foreground/30"
        }`}
      >
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <FileUp className="h-5 w-5 text-muted-foreground" />
        )}
        <span className="text-xs text-muted-foreground">
          Drop a <span className="font-medium text-foreground">PDF / DOCX / TXT</span>{" "}
          or click
        </span>
        <div
          className="mt-1.5 flex w-full items-center gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <Select value={uploadType} onValueChange={setUploadType}>
            <SelectTrigger size="sm" className="h-7 flex-1 bg-background text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DOC_TYPE_META).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-xs">
                  {v.label}
                </SelectItem>
              ))}
              <SelectItem value="auto" className="text-xs">
                Auto-detect from filename
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-[11px]"
            onClick={() => setPasteOpen(true)}
          >
            <ClipboardPaste className="mr-1 h-3 w-3" /> Paste
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </div>

      {/* doc list */}
      {documents.length > 0 && (
        <div className="pp-scroll max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {documents.map((d) => {
            const t = DOC_TYPE_META[d.doc_type] ?? DOC_TYPE_META.other;
            return (
              <div
                key={d.doc_id}
                className="group flex items-center gap-2.5 rounded-md border border-border bg-card px-2.5 py-2"
              >
                <t.icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-foreground">{d.name}</div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span
                      className={`rounded border px-1 py-px font-mono text-[9px] font-medium uppercase tracking-wide ${t.chip}`}
                    >
                      {t.label}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {d.word_count}w · {d.chunk_count}c
                    </span>
                  </div>
                </div>
                <button
                  aria-label={`Delete ${d.name}`}
                  onClick={() => handleDelete(d)}
                  className="rounded p-1 text-muted-foreground/50 opacity-0 transition-all hover:bg-secondary hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* paste dialog */}
      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent aria-describedby={undefined} className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">Paste document text</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="pp-label mb-1.5 block" htmlFor="paste-type">
                  Type
                </label>
                <Select value={pasteType} onValueChange={setPasteType}>
                  <SelectTrigger id="paste-type" className="h-8 bg-card text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DOC_TYPE_META).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-xs">
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="pp-label mb-1.5 block" htmlFor="paste-name">
                  Name (optional)
                </label>
                <input
                  id="paste-name"
                  value={pasteName}
                  onChange={(e) => setPasteName(e.target.value)}
                  placeholder="e.g. stripe-jd.txt"
                  className="h-8 w-full rounded-md border border-input bg-card px-2 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            <Textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste a job description, your work experience notes, education…"
              aria-label="Pasted document text"
              className="pp-scroll min-h-[180px] bg-card text-xs"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setPasteOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="gap-1 text-xs font-semibold" disabled={busy} onClick={handlePasteSubmit}>
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              Add to knowledge base
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CheckRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className="flex items-center gap-2.5">
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border ${
          ok ? "border-primary bg-primary text-primary-foreground" : "border-dashed border-muted-foreground/50"
        }`}
        aria-hidden="true"
      >
        {ok && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      <span
        className={`text-xs leading-snug ${
          ok ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {label}
      </span>
      <span className="sr-only">{ok ? "provided" : "not provided yet"}</span>
    </li>
  );
}
