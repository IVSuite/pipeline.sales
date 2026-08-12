"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import {
  CUSTOMER_IMPORT_FIELDS,
  applyMapping,
  validateMappedRow,
  normalizeEmail,
  type ColumnMapping,
  type FieldKey,
} from "@/lib/import/customer-import";

type Step = "upload" | "map" | "preview" | "importing" | "summary";

interface ParsedData {
  fileName: string;
  headers: string[];
  rows: string[][];
  totalRows: number;
  truncated: boolean;
  suggestedMapping: ColumnMapping;
}

interface PreviewRow {
  rowNumber: number; // 1-based data row number as it appears in the file
  values: Record<FieldKey, string | null>;
  valid: boolean;
  errors: string[];
  duplicateInFile: boolean;
}

interface ImportSummary {
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: { index: number; full_name: string; email: string; message: string }[];
}

const BATCH_SIZE = 100;

export function ImportCustomersDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({ full_name: null, email: null, phone: null, company: null });
  const [duplicateMode, setDuplicateMode] = useState<"skip" | "update">("skip");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const reset = useCallback(() => {
    setStep("upload");
    setParsing(false);
    setParsed(null);
    setMapping({ full_name: null, email: null, phone: null, company: null });
    setDuplicateMode("skip");
    setProgress({ done: 0, total: 0 });
    setSummary(null);
    setDragOver(false);
  }, []);

  const handleClose = useCallback(() => {
    if (step === "importing") return; // don't allow closing mid-import
    reset();
    onClose();
  }, [step, reset, onClose]);

  // --- Upload + parse -------------------------------------------------------
  const handleFile = useCallback(async (file: File) => {
    const name = file.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".csv") && !name.endsWith(".xlsm") && !name.endsWith(".tsv")) {
      toast.error("Please choose a .xlsx or .csv file");
      return;
    }
    setParsing(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/customers/import/parse", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to read file");
      const data = json as ParsedData;
      if (data.rows.length === 0) {
        toast.error("No data rows found in the file");
        setParsing(false);
        return;
      }
      setParsed(data);
      setMapping(data.suggestedMapping);
      setStep("map");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to read file");
    } finally {
      setParsing(false);
    }
  }, []);

  const downloadTemplate = useCallback(async () => {
    try {
      const res = await fetch("/api/customers/import/template");
      if (!res.ok) throw new Error("Failed to download template");
      const blob = await res.blob();
      triggerDownload(blob, "pipeline-customers-template.xlsx");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    }
  }, []);

  // --- Preview (client-side validation) ------------------------------------
  const previewRows = useMemo<PreviewRow[]>(() => {
    if (!parsed) return [];
    const seenEmails = new Set<string>();
    return parsed.rows.map((row, i) => {
      const mapped = applyMapping(row, mapping);
      const v = validateMappedRow(mapped);
      const normEmail = normalizeEmail(v.data.email);
      const duplicateInFile = normEmail ? seenEmails.has(normEmail) : false;
      if (normEmail) seenEmails.add(normEmail);
      return {
        rowNumber: i + 1,
        values: v.data,
        valid: v.valid,
        errors: v.errors.map((e) => e.message),
        duplicateInFile,
      };
    });
  }, [parsed, mapping]);

  const stats = useMemo(() => {
    const valid = previewRows.filter((r) => r.valid);
    const invalid = previewRows.filter((r) => !r.valid);
    const dupInFile = previewRows.filter((r) => r.valid && r.duplicateInFile);
    return { valid: valid.length, invalid: invalid.length, dupInFile: dupInFile.length, total: previewRows.length };
  }, [previewRows]);

  const fullNameMapped = mapping.full_name !== null;

  // --- Import ---------------------------------------------------------------
  const runImport = useCallback(async () => {
    if (!parsed) return;
    // Only send rows that pass client validation; invalid rows are reported as failed.
    const validPreview = previewRows.filter((r) => r.valid);
    const invalidPreview = previewRows.filter((r) => !r.valid);

    setStep("importing");
    setProgress({ done: 0, total: validPreview.length });

    const agg: ImportSummary = {
      imported: 0,
      updated: 0,
      skipped: 0,
      failed: invalidPreview.length,
      errors: invalidPreview.map((r) => ({
        index: r.rowNumber,
        full_name: r.values.full_name ?? "",
        email: r.values.email ?? "",
        message: r.errors.join("; "),
      })),
    };

    try {
      for (let i = 0; i < validPreview.length; i += BATCH_SIZE) {
        const slice = validPreview.slice(i, i + BATCH_SIZE);
        const res = await fetch("/api/customers/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            duplicateMode,
            startIndex: 0,
            rows: slice.map((r) => ({
              full_name: r.values.full_name ?? "",
              email: r.values.email ?? "",
              phone: r.values.phone ?? "",
              company: r.values.company ?? "",
            })),
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Import failed");
        agg.imported += json.imported ?? 0;
        agg.updated += json.updated ?? 0;
        agg.skipped += json.skipped ?? 0;
        agg.failed += json.failed ?? 0;
        // Remap server error indices back to file row numbers for this slice.
        for (const err of json.errors ?? []) {
          const local = slice[err.index];
          agg.errors.push({
            index: local ? local.rowNumber : err.index,
            full_name: err.full_name,
            email: err.email,
            message: err.message,
          });
        }
        setProgress({ done: Math.min(i + slice.length, validPreview.length), total: validPreview.length });
      }
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setSummary(agg);
      setStep("summary");
      toast.success(`Import complete — ${agg.imported} added, ${agg.updated} updated`);
    } catch (e) {
      // Preserve whatever succeeded, surface the error, and still show a summary.
      setSummary(agg);
      setStep("summary");
      toast.error(e instanceof Error ? e.message : "Import failed");
    }
  }, [parsed, previewRows, duplicateMode, queryClient]);

  const downloadFailedRows = useCallback(() => {
    if (!summary || summary.errors.length === 0) return;
    const header = ["Row", "Full name", "Email", "Error"];
    const lines = [header, ...summary.errors.map((e) => [String(e.index), e.full_name, e.email, e.message])];
    const csv = lines.map((cols) => cols.map(csvCell).join(",")).join("\r\n");
    triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8" }), "failed-customer-rows.csv");
  }, [summary]);

  // --- Render ---------------------------------------------------------------
  return (
    <Modal open={open} onClose={handleClose} title="Import customers" size="lg">
      <StepIndicator step={step} />

      {step === "upload" && (
        <div className="space-y-4">
          <div
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
            className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            {parsing ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Reading file…</p>
              </>
            ) : (
              <>
                <UploadCloud className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Drag & drop your file here</p>
                  <p className="text-xs text-muted-foreground">Excel (.xlsx) or CSV — up to 15 MB</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  <FileSpreadsheet className="h-4 w-4" /> Choose file
                </Button>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xlsm,.csv,.tsv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-surface-muted px-4 py-3">
            <div>
              <p className="text-sm font-medium">Need the right format?</p>
              <p className="text-xs text-muted-foreground">Download a template with the exact Pipeline fields.</p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4" /> Template
            </Button>
          </div>
        </div>
      )}

      {step === "map" && parsed && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We detected <span className="font-medium text-foreground">{parsed.headers.length}</span> columns and{" "}
            <span className="font-medium text-foreground">{parsed.totalRows}</span> rows in{" "}
            <span className="font-medium text-foreground">{parsed.fileName}</span>. Match each Pipeline field to a
            column from your file.
          </p>
          {parsed.truncated && (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
              Only the first {parsed.rows.length} rows were loaded. Split the file to import the rest.
            </p>
          )}
          <div className="space-y-3">
            {CUSTOMER_IMPORT_FIELDS.map((field) => (
              <div key={field.key} className="grid grid-cols-2 items-center gap-3">
                <div>
                  <span className="text-sm font-medium">{field.label}</span>
                  {field.required && <span className="ml-1 text-red-500">*</span>}
                  <p className="text-xs text-muted-foreground">e.g. {field.example}</p>
                </div>
                <Select
                  value={mapping[field.key] ?? ""}
                  onChange={(e) =>
                    setMapping((m) => ({
                      ...m,
                      [field.key]: e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                >
                  <option value="">— Not mapped —</option>
                  {parsed.headers.map((h, idx) => (
                    <option key={idx} value={idx}>
                      {h || `Column ${idx + 1}`}
                    </option>
                  ))}
                </Select>
              </div>
            ))}
          </div>
          {!fullNameMapped && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500">
              Full name is required — map it to continue.
            </p>
          )}
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep("upload")}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={() => setStep("preview")} disabled={!fullNameMapped}>
              Preview <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === "preview" && parsed && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <StatBox label="Valid rows" value={stats.valid} tone="good" />
            <StatBox label="Invalid rows" value={stats.invalid} tone={stats.invalid ? "bad" : "neutral"} />
            <StatBox label="Dupes in file" value={stats.dupInFile} tone={stats.dupInFile ? "warn" : "neutral"} />
          </div>

          <div className="rounded-lg border border-border">
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-surface-muted">
                  <tr>
                    <th className="px-2 py-2 font-medium">#</th>
                    <th className="px-2 py-2 font-medium">Full name</th>
                    <th className="px-2 py-2 font-medium">Email</th>
                    <th className="px-2 py-2 font-medium">Phone</th>
                    <th className="px-2 py-2 font-medium">Company</th>
                    <th className="px-2 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(0, 100).map((r) => (
                    <tr key={r.rowNumber} className="border-t border-border">
                      <td className="px-2 py-1.5 text-muted-foreground">{r.rowNumber}</td>
                      <td className="px-2 py-1.5">{r.values.full_name || <em className="text-muted-foreground">—</em>}</td>
                      <td className="px-2 py-1.5">{r.values.email || "—"}</td>
                      <td className="px-2 py-1.5">{r.values.phone || "—"}</td>
                      <td className="px-2 py-1.5">{r.values.company || "—"}</td>
                      <td className="px-2 py-1.5">
                        {!r.valid ? (
                          <span className="text-red-500" title={r.errors.join("; ")}>
                            {r.errors.join("; ")}
                          </span>
                        ) : r.duplicateInFile ? (
                          <span className="text-amber-600 dark:text-amber-400">Duplicate in file</span>
                        ) : (
                          <span className="text-emerald-600 dark:text-emerald-400">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {previewRows.length > 100 && (
              <p className="border-t border-border px-2 py-1.5 text-xs text-muted-foreground">
                Showing first 100 of {previewRows.length} rows.
              </p>
            )}
          </div>

          <div className="rounded-lg bg-surface-muted p-3">
            <p className="mb-2 text-sm font-medium">When a customer with the same email already exists:</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="dupmode"
                  checked={duplicateMode === "skip"}
                  onChange={() => setDuplicateMode("skip")}
                />
                Skip it (never overwrite) <span className="text-xs text-muted-foreground">— recommended</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="dupmode"
                  checked={duplicateMode === "update"}
                  onChange={() => setDuplicateMode("update")}
                />
                Update the existing customer
              </label>
            </div>
          </div>

          <div className="flex justify-between pt-1">
            <Button variant="outline" onClick={() => setStep("map")}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button onClick={runImport} disabled={stats.valid === 0}>
              Import {stats.valid} {stats.valid === 1 ? "customer" : "customers"} <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === "importing" && (
        <div className="space-y-4 py-6 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium">
            Importing… {progress.done} / {progress.total}
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">Please keep this window open until it finishes.</p>
        </div>
      )}

      {step === "summary" && summary && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {summary.failed === 0 ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-500" />
            ) : (
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            )}
            <p className="text-sm font-medium">Import finished</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBox label="Imported" value={summary.imported} tone="good" />
            <StatBox label="Updated" value={summary.updated} tone={summary.updated ? "good" : "neutral"} />
            <StatBox label="Skipped" value={summary.skipped} tone={summary.skipped ? "warn" : "neutral"} />
            <StatBox label="Failed" value={summary.failed} tone={summary.failed ? "bad" : "neutral"} />
          </div>
          {summary.skipped > 0 && (
            <p className="text-xs text-muted-foreground">
              Skipped rows were duplicates of existing customers (matched by email) and were left untouched.
            </p>
          )}
          {summary.errors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{summary.errors.length} rows could not be imported</p>
                <Button variant="outline" size="sm" onClick={downloadFailedRows}>
                  <Download className="h-4 w-4" /> Download failed rows
                </Button>
              </div>
              <div className="max-h-40 overflow-auto rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-surface-muted">
                    <tr>
                      <th className="px-2 py-1.5 font-medium">Row</th>
                      <th className="px-2 py-1.5 font-medium">Name</th>
                      <th className="px-2 py-1.5 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.errors.slice(0, 200).map((e, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-2 py-1 text-muted-foreground">{e.index}</td>
                        <td className="px-2 py-1">{e.full_name || "—"}</td>
                        <td className="px-2 py-1 text-red-500">{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={reset}>
              Import another file
            </Button>
            <Button onClick={handleClose}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// --- Small presentational helpers ------------------------------------------

function StepIndicator({ step }: { step: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "upload", label: "Upload" },
    { key: "map", label: "Map" },
    { key: "preview", label: "Preview" },
    { key: "summary", label: "Done" },
  ];
  const order: Step[] = ["upload", "map", "preview", "importing", "summary"];
  const currentIdx = order.indexOf(step);
  return (
    <div className="mb-5 flex items-center gap-2 text-xs">
      {steps.map((s, i) => {
        const idx = order.indexOf(s.key);
        const active = step === s.key || (s.key === "summary" && step === "importing");
        const done = currentIdx > idx && !active;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                active
                  ? "bg-primary text-primary-foreground"
                  : done
                    ? "bg-emerald-500 text-white"
                    : "bg-surface-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </span>
            <span className={active ? "font-medium text-foreground" : "text-muted-foreground"}>{s.label}</span>
            {i < steps.length - 1 && <span className="mx-1 text-muted-foreground">›</span>}
          </div>
        );
      })}
    </div>
  );
}

function StatBox({ label, value, tone }: { label: string; value: number; tone: "good" | "bad" | "warn" | "neutral" }) {
  const toneClasses = {
    good: "text-emerald-600 dark:text-emerald-400",
    bad: "text-red-500",
    warn: "text-amber-600 dark:text-amber-400",
    neutral: "text-foreground",
  };
  return (
    <div className="rounded-lg border border-border p-3 text-center">
      <div className={`text-2xl font-semibold ${toneClasses[tone]}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function csvCell(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
