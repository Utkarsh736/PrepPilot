"use client";

import { useRef, useState } from "react";
import {
  ClipboardPaste,
  FileText,
  FileUp,
  GraduationCap,
  Loader2,
  Paperclip,
  ScrollText,
  Trash2,
  Briefcase,
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

const DOC_TYPE_META: Record<string, { label: string; icon: typeof FileText; chip: string }> = {
  resume: { label: "Resume / CV", icon: FileText, chip: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10" },
  job_description: { label: "Job description", icon: Briefcase, chip: "text-amber-300 border-amber-500/30 bg-amber-500/10" },
  work_experience: { label: "Work experience", icon: ScrollText, chip: "text-teal-300 border-teal-500/30 bg-teal-500/10" },
  education: { label: "Education", icon: GraduationCap, chip: "text-violet-300 border-violet-500/30 bg-violet-500/10" },
  other: { label: "Other", icon: Paperclip, chip: "text-zinc-300 border-zinc-600/50 bg-zinc-700/30" },
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
      if (res.warning) toast({ title: "Parsed with a warning", description: res.warning, variant: "destructive" });
      else toast({ title: `${file.name} added`, description: `${res.document.word_count} words · ${res.document.chunk_count} chunks indexed` });
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
      toast({ title: `${res.document.name} added`, description: `${res.document.word_count} words indexed` });
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
      {/* context badges */}
      <div className="flex flex-wrap gap-1.5">
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
            flags?.has_profile
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border-zinc-700/70 bg-zinc-800/50 text-zinc-500"
          }`}
        >
          Profile {flags?.has_profile ? "✓" : "—"}
        </span>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
            flags?.has_jd
              ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
              : "border-zinc-700/70 bg-zinc-800/50 text-zinc-500"
          }`}
        >
          Job description {flags?.has_jd ? "✓" : "—"}
        </span>
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
        className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-dashed p-4 text-center transition-colors ${
          dragOver
            ? "border-emerald-400/60 bg-emerald-500/5"
            : "border-zinc-700/80 bg-zinc-900/40 hover:border-zinc-600"
        }`}
      >
        {busy ? (
          <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
        ) : (
          <FileUp className="h-5 w-5 text-zinc-500" />
        )}
        <span className="text-xs text-zinc-400">
          Drop a <span className="text-zinc-200">PDF / DOCX / TXT</span> or click
        </span>
        <div className="mt-1 flex w-full items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <Select value={uploadType} onValueChange={setUploadType}>
            <SelectTrigger
              size="sm"
              className="h-7 flex-1 border-zinc-700 bg-zinc-900 text-[11px] text-zinc-300"
              aria-label="Document type"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-zinc-700 bg-zinc-900 text-zinc-200">
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
            className="h-7 border-zinc-700 bg-zinc-900 px-2 text-[11px] text-zinc-300 hover:text-zinc-100"
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
        <div className="ic-scroll max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {documents.map((d) => {
            const t = DOC_TYPE_META[d.doc_type] ?? DOC_TYPE_META.other;
            return (
              <div
                key={d.doc_id}
                className="group flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-2"
              >
                <t.icon className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-zinc-200">{d.name}</div>
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                    <span className={`rounded border px-1 ${t.chip}`}>{t.label}</span>
                    <span>{d.word_count}w</span>
                    <span>· {d.chunk_count} chunks</span>
                  </div>
                </div>
                <button
                  aria-label={`Delete ${d.name}`}
                  onClick={() => handleDelete(d)}
                  className="rounded p-1 text-zinc-600 opacity-0 transition-all hover:bg-zinc-800 hover:text-rose-400 group-hover:opacity-100"
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
        <DialogContent className="border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">Paste document text</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] text-zinc-400">Type</label>
                <Select value={pasteType} onValueChange={setPasteType}>
                  <SelectTrigger className="h-8 border-zinc-700 bg-zinc-900 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-zinc-700 bg-zinc-900 text-zinc-200">
                    {Object.entries(DOC_TYPE_META).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-xs">
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-zinc-400">Name (optional)</label>
                <input
                  value={pasteName}
                  onChange={(e) => setPasteName(e.target.value)}
                  placeholder="e.g. stripe-jd.txt"
                  className="h-8 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none"
                />
              </div>
            </div>
            <Textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste a job description, your work experience notes, education…"
              className="ic-scroll min-h-[180px] border-zinc-700 bg-zinc-900 text-xs text-zinc-200 placeholder:text-zinc-600"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="border-zinc-700 bg-zinc-900 text-xs text-zinc-300"
              onClick={() => setPasteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={busy}
              className="bg-emerald-500 text-xs font-semibold text-zinc-950 hover:bg-emerald-400"
              onClick={handlePasteSubmit}
            >
              {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-1 h-3.5 w-3.5" />}
              Add to knowledge base
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
