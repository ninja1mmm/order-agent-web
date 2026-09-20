"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Bot, Check, Download, LoaderCircle, Play, RefreshCw, RotateCcw, Save, Search, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { ConfirmDialog, useConfirm } from "../../confirm-dialog";
import { listCustomers, type CustomerConfig } from "@/services/settings";
import {
  applyCorrections, deleteSkillRun, downloadSkillResult, executeSkillRun,
  fetchCorrections, fetchSnapshot, getSkillRun, patchSkillCorrection,
  recreateSkillRun, selectSkillRunSnapshot, validateSkillRun,
} from "@/services/skills";
import type {
  CollisionResolution, Issue, OrdersFilter, SkillCorrection,
  SkillRun, SnapshotCell, ValidationSummary,
} from "@/types/models/skills";
import { correctionFilterLabels, correctionStatusLabels, modeLabels, phaseLabels, sourceTypeLabels, statusLabels, t } from "../../skill-copy";
import { orderCopy } from "../../../orders/_components/order-utils";

const ordersLabels = orderCopy["zh-CN"];
const today = new Date().toISOString().slice(0, 10);
const later = `${new Date().getFullYear()}-12-31`;

type EditDraft = {
  internalPartNumber: string;
  customerPartNumber: string;
  date: string;
  quantity: string;
  classification: "forecast" | "confirmed";
  collisionResolution: CollisionResolution | "";
};

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "请求失败";
}

function displayValue(current: unknown) {
  return current === null || current === undefined || current === "" ? "—" : String(current);
}

function displayQuantity(current: unknown) {
  return typeof current === "number" ? current.toLocaleString("en-US") : displayValue(current);
}

function displayChangedAt(current: string | null | undefined) {
  if (!current) return "—";
  const date = new Date(current);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
}

function sourceTypeLabel(sourceType: string | null | undefined) {
  if (!sourceType) return "未知来源";
  return sourceTypeLabels[sourceType] ?? sourceType;
}

function draftFor(item: SkillCorrection): EditDraft {
  return {
    internalPartNumber: item.proposal.internalPartNumber,
    customerPartNumber: item.proposal.customerPartNumber ?? "",
    date: item.proposal.date,
    quantity: String(item.proposal.quantity),
    classification: item.proposal.classification,
    collisionResolution: item.collisionResolution ?? "",
  };
}

function classificationText(value: "forecast" | "confirmed") {
  return value === "confirmed" ? t.confirmed : t.forecast;
}

// ─── InputIssuesPanel (reusable: Step 1 + Step 2) ────────────────────
function dedupeIssues(items: Issue[]) {
  const map = new Map<string, { issue: Issue; count: number }>();
  for (const i of items) {
    const key = `${i.code}::${i.message}`;
    const existing = map.get(key);
    if (existing) existing.count++;
    else map.set(key, { issue: i, count: 1 });
  }
  return [...map.values()];
}

function InputIssuesPanel({ issues }: { issues: Issue[] }) {
  const errors = dedupeIssues(issues.filter((i) => i.severity === "error"));
  const warnings = dedupeIssues(issues.filter((i) => i.severity === "warning"));
  if (!errors.length && !warnings.length) return null;
  return (
    <div className="mb-3 space-y-2">
      {errors.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <strong>{t.blockingIssuesTitle(errors.reduce((s, e) => s + e.count, 0))}</strong>
          {errors.map((e) => <p key={e.issue.code} className="mt-1">{e.issue.code} · {e.issue.message}{e.count > 1 ? ` (×${e.count})` : ""}</p>)}
        </div>
      )}
      {warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <strong>{t.warningHintsTitle(warnings.reduce((s, w) => s + w.count, 0))}</strong>
          {warnings.map((w) => <p key={w.issue.code} className="mt-1">{w.issue.code} · {w.issue.message}{w.count > 1 ? ` (×${w.count})` : ""}</p>)}
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────
export function SkillRunPage({ runId }: { runId: string }) {
  const router = useRouter();
  const [run, setRun] = useState<SkillRun | null>(null);
  const [snapshot, setSnapshot] = useState<SnapshotCell[] | null>(null);
  const [corrections, setCorrections] = useState<SkillCorrection[]>([]);
  const [validationSummary, setValidationSummary] = useState<ValidationSummary>({ valid: 0, blocked: 0, merged: 0 });
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [viewingStep, setViewingStep] = useState<1 | 2 | 3>(2);
  const [selected, setSelected] = useState<string[]>([]);
  const [applying, setApplying] = useState(false);
  const [validating, setValidating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "valid" | "warning" | "blocked" | "merged">("all");
  const [drafts, setDrafts] = useState<Record<string, EditDraft>>({});
  const [customers, setCustomers] = useState<CustomerConfig[]>([]);
  const [scope, setScope] = useState<OrdersFilter>({ timeFrom: today, timeTo: later, internalPartNumbers: [] });
  const [materialSearch, setMaterialSearch] = useState("");
  const [snapshotting, setSnapshotting] = useState(false);
  const [snapshotDirty, setSnapshotDirty] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const { confirm, dialogProps } = useConfirm();
  const initialized = useRef(false);
  const mergeKey = useRef<{ signature: string; key: string } | null>(null);

  const acceptRun = useCallback((next: SkillRun) => {
    setRun(next);
    setExecuting(next.status === "running");
    setValidationSummary(next.validationSummary);
    return next;
  }, []);

  const acceptCorrections = useCallback((items: SkillCorrection[], summary: ValidationSummary, isInitialLoad = false) => {
    setCorrections(items);
    setValidationSummary(summary);
    setDrafts(Object.fromEntries(items.map((item) => [item.id, draftFor(item)])));
    if (isInitialLoad) {
      const autoSelect = items
        .filter((item) => item.status === "valid" && !item.issues.some((i) => i.code === "NO_EFFECTIVE_CHANGE"))
        .map((item) => item.id);
      setSelected(autoSelect);
    } else {
      setSelected((current) => {
        const stillValid = new Set(items.filter((item) => item.status === "valid").map((item) => item.id));
        return current.filter((id) => stillValid.has(id));
      });
    }
  }, []);

  const loadRun = useCallback(async () => acceptRun(await getSkillRun(runId)), [acceptRun, runId]);

  const loadSnapshot = useCallback(async () => {
    const data = await fetchSnapshot(runId);
    setSnapshot(data.cells);
  }, [runId]);

  const correctionsLoaded = useRef(false);
  const loadCorrections = useCallback(async () => {
    const data = await fetchCorrections(runId);
    const isFirst = !correctionsLoaded.current;
    correctionsLoaded.current = true;
    acceptCorrections(data.items, data.summary, isFirst);
  }, [runId, acceptCorrections]);

  /* eslint-disable react-hooks/set-state-in-effect -- API-backed initial state */
  useEffect(() => {
    void loadRun().then(async (next) => {
      if (!initialized.current) {
        initialized.current = true;
        if (next.filters.timeFrom && next.filters.timeTo) {
          setScope({ timeFrom: next.filters.timeFrom, timeTo: next.filters.timeTo, internalPartNumbers: next.filters.internalPartNumbers });
          setSnapshotDirty(!next.inputCellCount);
        }
      }
      if (next.inputCellCount > 0) await loadSnapshot().catch(() => undefined);
      if (next.status === "succeeded" || next.status === "failed") await loadCorrections().catch(() => undefined);
    }).catch((error) => toast.error(errorText(error))).finally(() => setLoading(false));
    void listCustomers().then(setCustomers).catch(() => undefined);
  }, [loadRun, loadSnapshot, loadCorrections]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!executing) return;
    const timer = window.setInterval(() => {
      void loadRun().then(async (next) => {
        if (next.status === "succeeded" || next.status === "failed") {
          window.clearInterval(timer);
          await loadCorrections().catch(() => undefined);
        }
      }).catch((error) => {
        window.clearInterval(timer);
        setExecuting(false);
        toast.error(errorText(error));
      });
    }, 1500);
    return () => window.clearInterval(timer);
  }, [executing, loadRun, loadCorrections]);

  const customer = customers.find((item) => item.id === run?.filters.customerId);
  const activeMaterials = useMemo(() => (customer?.materialMappings ?? []).filter((item) => item.status === "active"), [customer]);
  const matchingMaterials = activeMaterials.filter((item) => `${item.internalPartNumber} ${item.customerPartNumber} ${item.designation ?? ""}`.toLowerCase().includes(materialSearch.toLowerCase()));
  const filteredCorrections = useMemo(() => corrections.filter((item) => {
    if (filter === "all") return true;
    if (filter === "warning") return item.status === "valid" && item.issues.some((i) => i.severity === "warning");
    if (filter === "valid") return item.status === "valid" && !item.issues.some((i) => i.severity === "warning");
    return item.status === filter;
  }), [filter, corrections]);

  const hasBlockingIssues = run?.inputIssues.some((i) => i.severity === "error") ?? false;
  const canExecute = !executing && !snapshotDirty && (run?.inputCellCount ?? 0) > 0 && !hasBlockingIssues;

  async function execute() {
    if (!run || !canExecute || !run.filters.timeFrom || !run.filters.timeTo) return;
    const confirmed = await confirm({
      title: t.executeConfirmTitle,
      body: t.executeConfirmBody(
        customer?.name ?? run.filters.customerId,
        run.filters.timeFrom,
        run.filters.timeTo,
        run.inputCellCount,
      ),
      confirmLabel: t.confirmAndExecute,
    });
    if (!confirmed) return;
    setExecuting(true);
    try {
      acceptRun(await executeSkillRun(run.id));
      setViewingStep(2);
    } catch (error) {
      setExecuting(false);
      toast.error(errorText(error));
    }
  }

  async function previewSnapshot() {
    if (!run || snapshotting || scope.timeFrom > scope.timeTo) return;
    setSnapshotting(true);
    try {
      const next = acceptRun(await selectSkillRunSnapshot(run.id, scope));
      setSnapshotDirty(false);
      await loadSnapshot();
      toast.success(t.snapshotLoaded(next.inputCellCount));
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setSnapshotting(false);
    }
  }

  async function saveCorrection(item: SkillCorrection) {
    if (!run || savingId) return;
    const draft = drafts[item.id];
    const quantity = Number(draft.quantity);
    if (!Number.isInteger(quantity) || quantity < 0) {
      toast.error(t.quantityError);
      return;
    }
    setSavingId(item.id);
    try {
      const updated = await patchSkillCorrection(run.id, item.id, {
        reviewRevision: run.reviewRevision,
        internalPartNumber: draft.internalPartNumber,
        ...(draft.customerPartNumber ? { customerPartNumber: draft.customerPartNumber } : {}),
        date: draft.date,
        quantity,
        classification: draft.classification,
        collisionResolution: draft.collisionResolution || null,
      });
      setCorrections((prev) => prev.map((c) => c.id === updated.id ? updated : c));
      setDrafts((prev) => ({ ...prev, [updated.id]: draftFor(updated) }));
      await loadRun();
      mergeKey.current = null;
      toast.success(t.correctionSaved);
    } catch (error) {
      if (error instanceof Error && error.message.includes("409")) {
        toast.error(t.dataReloaded);
        await loadCorrections().catch(() => undefined);
      } else {
        toast.error(errorText(error));
        await loadCorrections().catch(() => undefined);
      }
    } finally {
      setSavingId(null);
    }
  }

  async function revalidate(goToMerge = false) {
    if (!run || validating) return;
    setValidating(true);
    try {
      const next = acceptRun(await validateSkillRun(run.id));
      await loadCorrections();
      if (goToMerge) setViewingStep(3);
      toast.success(t.validationDone(next.validationSummary.valid, next.validationSummary.blocked));
    } catch (error) {
      toast.error(errorText(error));
    } finally {
      setValidating(false);
    }
  }

  async function download() {
    if (!run) return;
    try {
      const blob = await downloadSkillResult(run.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `skill-result-${run.id}.html`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(errorText(error));
    }
  }

  async function merge() {
    if (!run || applying || !selected.length) return;
    const signature = `${run.id}:${run.reviewRevision}:${[...selected].sort().join(",")}`;
    if (mergeKey.current?.signature !== signature) mergeKey.current = { signature, key: crypto.randomUUID() };
    const selectedIds = [...selected];
    const idempotencyKey = mergeKey.current.key;
    setApplying(true);
    try {
      const result = await applyCorrections(run.id, selectedIds, run.reviewRevision, idempotencyKey);
      acceptRun(result);
      await loadCorrections();
      mergeKey.current = null;
      const latestBatch = result.mergeBatches[result.mergeBatches.length - 1];
      toast.success(t.mergeSuccess(latestBatch.changesetId ?? ""));
    } catch (error) {
      await loadRun().catch(() => null);
      await loadCorrections().catch(() => null);
      toast.error(errorText(error));
      setViewingStep(2);
    } finally {
      setApplying(false);
    }
  }

  async function removeRun() {
    if (!run || deleting || run.mergeBatches.length) return;
    const yes = await confirm({ title: t.deleteRun, body: t.deleteRunConfirm, variant: "destructive", confirmLabel: t.deleteRun });
    if (!yes) return;
    setDeleting(true);
    try {
      await deleteSkillRun(run.id);
      toast.success(t.runDeleted);
      router.push("/skill-studio");
    } catch (error) {
      toast.error(errorText(error));
      setDeleting(false);
    }
  }

  if (loading) return <div className="grid flex-1 place-items-center"><LoaderCircle className="animate-spin text-[var(--forvia-blue)]" /></div>;
  if (!run) return <div className="grid flex-1 place-items-center text-sm text-slate-500">{t.notFound}</div>;

  const activeStep = run.status === "queued" ? 1 : run.status === "running" ? 2 : viewingStep;
  const customerName = customer?.name ?? run.filters.customerId;
  const invalidDates = !scope.timeFrom || !scope.timeTo || scope.timeFrom > scope.timeTo;
  const title = run.skillSnapshot?.name ?? "Skill Run";
  const selectedCorrections = corrections.filter((item) => selected.includes(item.id));
  const restoreCount = selectedCorrections.filter((item) => item.target && (item.target.rowKey !== item.source.rowKey || item.target.colKey !== item.source.colKey)).length;
  function updateScope(next: OrdersFilter) { setScope(next); setSnapshotDirty(true); }
  function toggleMaterial(part: string) { updateScope({ ...scope, internalPartNumbers: scope.internalPartNumbers.includes(part) ? scope.internalPartNumbers.filter((item) => item !== part) : [...scope.internalPartNumbers, part] }); }
  function updateDraft(id: string, changes: Partial<EditDraft>) { setDrafts((current) => ({ ...current, [id]: { ...current[id], ...changes } })); }

  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
    <header className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-4 py-3">
      <div className="min-w-0"><Link href="/skill-studio" className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[var(--forvia-blue)]"><ArrowLeft size={15}/>{t.backToStudio}</Link><h1 className="mt-1 truncate text-lg font-black">{title}</h1></div>
      <div className="flex shrink-0 items-center gap-3 text-[11px] text-slate-500"><span>{modeLabels[run.mode]} · {run.inputCellCount} 个单元格</span><Badge variant={run.status === "succeeded" ? "green" : run.status === "failed" ? "red" : "amber"}>{statusLabels[run.status]}</Badge>{!run.mergeBatches.length && <Button size="sm" variant="destructive" disabled={deleting} onClick={() => void removeRun()}>{deleting ? <LoaderCircle className="animate-spin" size={13}/> : <Trash2 size={13}/>}{t.deleteRun}</Button>}</div>
    </header>
    <div className="grid min-h-0 flex-1 grid-cols-[270px_minmax(560px,1fr)] overflow-hidden max-[900px]:block max-[900px]:overflow-auto">
      <aside className="min-h-0 overflow-auto border-r border-[var(--line)] p-4">
        <h2 className="text-sm font-black">{t.runSummary}</h2>
        <dl className="mt-4 grid grid-cols-[72px_1fr] gap-x-3 gap-y-3 text-xs">
          <dt className="text-slate-500">{t.filtersCustomer}</dt><dd className="font-semibold">{customerName}</dd>
          <dt className="text-slate-500">{t.filtersDate}</dt><dd>{run.filters.timeFrom ? <>{run.filters.timeFrom}<br/>{run.filters.timeTo}</> : t.filtersPending}</dd>
          <dt className="text-slate-500">{t.filtersType}</dt><dd>{run.filters.classifications.join(" / ")}</dd>
          <dt className="text-slate-500">{t.filtersMaterial}</dt><dd>{run.filters.timeFrom ? run.filters.internalPartNumbers.length ? t.materialCount(run.filters.internalPartNumbers.length) : t.filtersAllMaterials : t.filtersPending}</dd>
          <dt className="text-slate-500">{t.prompt}</dt><dd className="truncate text-[11px] text-slate-600">{run.skillSnapshot?.prompt ? `${run.skillSnapshot.prompt.slice(0, 80)}${run.skillSnapshot.prompt.length > 80 ? "…" : ""}` : "—"}</dd>
        </dl>
        {run.status === "succeeded" && <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px]"><SummaryStat label={t.statusValid} value={validationSummary.valid}/><SummaryStat label={t.statusBlocked} value={validationSummary.blocked}/><SummaryStat label={t.statusMerged} value={validationSummary.merged}/></div>}
      </aside>
      <section className="min-h-0 overflow-auto p-5">
        <div className="mb-5 grid grid-cols-3 gap-2">{[t.step1, t.step2, t.step3].map((label, index) => {
          const step = (index + 1) as 1 | 2 | 3;
          const enabled = run.status === "queued" ? step === 1 : run.status === "running" ? step === 2 : step < 3 || run.status === "succeeded";
          const complete = step === 1 ? run.status !== "queued" : step === 2 ? run.status === "succeeded" : run.mergeBatches.length > 0;
          return <button type="button" key={label} disabled={!enabled} onClick={() => setViewingStep(step)} aria-current={activeStep === step ? "step" : undefined} className={`rounded-xl border px-3 py-3 text-left text-xs ${activeStep === step ? "border-[var(--forvia-blue)] bg-[var(--forvia-blue-soft)]" : "border-[var(--line)]"} ${!enabled ? "cursor-default opacity-50" : "hover:border-slate-300"}`}><span className={`mr-2 inline-grid h-5 w-5 place-items-center rounded-full ${complete ? "bg-emerald-500 text-white" : "bg-slate-100"}`}>{complete ? <Check size={12}/> : step}</span>{label}</button>;
        })}</div>

        {activeStep === 1 && <StepOne run={run} scope={scope} setScope={updateScope} invalidDates={invalidDates} snapshotting={snapshotting} snapshotDirty={snapshotDirty} materialSearch={materialSearch} setMaterialSearch={setMaterialSearch} materials={matchingMaterials} toggleMaterial={toggleMaterial} previewSnapshot={previewSnapshot} execute={execute} executing={executing} canExecute={canExecute} snapshot={snapshot}/>}

        {activeStep === 2 && <div>
          <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-sm font-black">{t.step2Title}</h2><p className="mt-1 text-xs text-slate-500">{t.step2Hint(customerName)}</p></div><div className="flex gap-2">{run.status === "succeeded" && <><Button disabled={validating} onClick={() => void revalidate()}>{validating ? <LoaderCircle className="animate-spin" size={14}/> : <RefreshCw size={14}/>}{t.revalidate}</Button><Button onClick={() => void (async () => { try { const next = await recreateSkillRun(run.id); router.push(`/skill-studio/runs/${next.id}`); } catch (error) { toast.error(errorText(error)); } })()}><RotateCcw size={14}/>{t.recreateRun}</Button></>}{run.status === "failed" && <Button onClick={() => void (async () => { try { const next = await recreateSkillRun(run.id); router.push(`/skill-studio/runs/${next.id}`); } catch (error) { toast.error(errorText(error)); } })()}><RotateCcw size={14}/>{t.recreateRun}</Button>}</div></div>

          <InputIssuesPanel issues={run.inputIssues} />

          {executing || run.status === "running" ? <ExecutionProgress run={run}/> : run.status === "failed" ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><strong>{t.executionFailed}</strong><p className="mt-1">{run.error || t.executionFailedDefault}</p></div> : <>
            <AiAuditPanel summary={run.summary} corrections={corrections}/>
            {corrections.length === 0 ? <div className="rounded-xl border border-[var(--line)] bg-slate-50 p-6 text-center text-sm"><strong>{t.noCorrections}</strong><p className="mt-1 text-xs text-slate-500">{t.noCorrectionsHint}</p><Button className="mt-4" onClick={() => void revalidate(true)}>{t.goToExport}</Button></div> : <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <div className="flex flex-wrap gap-2">{(["all", "valid", "warning", "blocked", "merged"] as const).map((tab) => <button key={tab} onClick={() => setFilter(tab)} className={`rounded-full border px-3 py-1.5 text-xs ${filter === tab ? "border-[var(--forvia-blue)] bg-[var(--forvia-blue-soft)] text-[var(--forvia-blue)]" : "border-[var(--line)]"}`}>{correctionFilterLabels[tab]}</button>)}</div>
                <span className="ml-auto text-[11px] text-slate-500">{t.selectionHint(selected.length, corrections.length)}</span>
              </div>
              <CorrectionTable corrections={filteredCorrections} drafts={drafts} selected={selected} materials={activeMaterials} allowedClassifications={run.filters.classifications} savingId={savingId} customerName={customerName} onDraft={updateDraft} onSave={saveCorrection} onToggle={(id) => setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])}/>
              <div className="mt-4 flex justify-end"><Button variant="primary" disabled={validating} onClick={() => void revalidate(true)}>{validating && <LoaderCircle className="animate-spin" size={14}/>}{t.validateAndNext}</Button></div>
            </>}
          </>}
        </div>}

        {activeStep === 3 && <StepThree run={run} selectedCorrections={selectedCorrections} restoreCount={restoreCount} applying={applying} validationSummary={validationSummary} corrections={corrections} onDownload={download} onMerge={merge}/>}
      </section>
    </div>
    <ConfirmDialog {...dialogProps} />
  </div>;
}

// ─── AiAuditPanel ────────────────────────────────────────────────────
function AiAuditPanel({ summary, corrections }: { summary: string | null; corrections: SkillCorrection[] }) {
  const advice = [...new Map(corrections.map((item) => [item.reason, item])).values()];
  return <section className="mb-3 overflow-hidden rounded-xl border border-[var(--forvia-blue-border)] bg-[var(--forvia-blue-soft)]/40">
    <div className="flex items-center gap-2 border-b border-[var(--forvia-blue-border)] px-3 py-2">
      <span className="grid h-6 w-6 place-items-center rounded-lg bg-[var(--forvia-blue)] text-white"><Bot size={14}/></span>
      <h3 className="text-xs font-black text-[var(--ink)]">{t.aiAuditTitle}</h3>
    </div>
    <div className="space-y-3 px-3 py-3 text-xs leading-5">
      <p className="text-slate-700">{summary || t.aiAuditNoSummary}</p>
      <div>
        <h4 className="font-black text-[var(--ink)]">{t.adviceTitle}</h4>
        {advice.length ? <ul className="mt-1.5 space-y-1.5 text-slate-600">
          {advice.map((item) => <li key={item.id} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--forvia-blue)]"/><span><strong className="font-semibold text-slate-800">{item.proposal.internalPartNumber} · {item.proposal.date}</strong>：{item.reason}</span></li>)}
        </ul> : <p className="mt-1.5 text-slate-500">{t.noAdvice}</p>}
      </div>
    </div>
  </section>;
}

// ─── StepOne ─────────────────────────────────────────────────────────
function StepOne({ run, scope, setScope, invalidDates, snapshotting, snapshotDirty, materialSearch, setMaterialSearch, materials, toggleMaterial, previewSnapshot, execute, executing, canExecute, snapshot }: {
  run: SkillRun; scope: OrdersFilter; setScope: (value: OrdersFilter) => void; invalidDates: boolean; snapshotting: boolean; snapshotDirty: boolean;
  materialSearch: string; setMaterialSearch: (value: string) => void; materials: CustomerConfig["materialMappings"];
  toggleMaterial: (value: string) => void; previewSnapshot: () => Promise<void>; execute: () => Promise<void>; executing: boolean; canExecute: boolean; snapshot: SnapshotCell[] | null;
}) {
  return <div>
    <div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-black">{t.step1Title}</h2><p className="mt-1 text-xs text-slate-500">{t.step1Hint}</p></div>{run.status === "queued" ? <Button variant="primary" disabled={!canExecute || executing} onClick={() => void execute()}><Play size={14}/>{t.confirmAndExecute}</Button> : <Badge variant="green">{t.immutableSnapshot}</Badge>}</div>

    <InputIssuesPanel issues={run.inputIssues} />

    {run.status === "queued" && <div className="mb-4 rounded-xl border border-[var(--line)] bg-slate-50 p-4"><div className="grid grid-cols-[minmax(280px,1fr)_minmax(260px,1fr)_auto] items-end gap-3 max-[1100px]:grid-cols-1"><div className="skill-field"><span>{t.dateRange}</span><div className="grid grid-cols-2 gap-2"><DatePicker aria-label="开始日期" value={scope.timeFrom} onChange={(value) => setScope({ ...scope, timeFrom: value })}/><DatePicker aria-label="结束日期" value={scope.timeTo} onChange={(value) => setScope({ ...scope, timeTo: value })}/></div>{invalidDates && <small className="text-red-600">{t.dateRangeError}</small>}</div><div className="skill-field"><span>{t.material}（可选）</span><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400"/><Input className="pl-8" value={materialSearch} onChange={(event) => setMaterialSearch(event.target.value)} placeholder={t.searchMaterial}/></div></div><Button disabled={invalidDates || snapshotting} onClick={() => void previewSnapshot()}>{snapshotting && <LoaderCircle className="animate-spin" size={14}/>}{t.loadSnapshot}</Button></div><div className="mt-3 flex flex-wrap gap-1">{scope.internalPartNumbers.map((part) => <button key={part} onClick={() => toggleMaterial(part)} className="inline-flex items-center gap-1 rounded-full bg-[var(--forvia-blue-soft)] px-2 py-1 text-[11px] text-[var(--forvia-blue)]">{part}<X size={11}/></button>)}</div>{materialSearch && <div className="mt-2 max-h-36 overflow-auto rounded-lg border border-[var(--line)] bg-white">{materials.map((item) => <button key={item.mappingId} onClick={() => toggleMaterial(item.internalPartNumber)} className="block w-full border-b border-[var(--line)] px-3 py-2 text-left text-xs last:border-0 hover:bg-slate-50"><strong>{item.internalPartNumber}</strong><span className="ml-2 text-slate-500">{item.customerPartNumber}</span></button>)}{!materials.length && <p className="p-3 text-xs text-slate-400">{t.noMatchingMaterial}</p>}</div>}<p className="mt-2 text-[11px] text-slate-500">{t.materialHint}</p></div>}
    {snapshotDirty && run.inputCellCount > 0 && <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{t.snapshotDirtyHint}</div>}
    {snapshot && snapshot.length > 0 ? <OrdersTable rows={snapshot}/> : <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-[var(--line)] text-center text-xs text-slate-400"><div><Search className="mx-auto mb-2" size={20}/><strong className="block text-slate-600">{t.noData}</strong><span>{t.noDataHint}</span></div></div>}
  </div>;
}

// ─── StepThree ───────────────────────────────────────────────────────
type ChangeDetail = { key: string; label: string; before: string; after: string };

function correctionChangeDetails(item: SkillCorrection, draft: EditDraft = draftFor(item)): ChangeDetail[] {
  const changes: ChangeDetail[] = [];
  const beforeMaterial = `${item.source.internalPartNumber} · ${item.source.customerPartNumber || "—"}`;
  const afterMaterial = `${draft.internalPartNumber} · ${draft.customerPartNumber || "—"}`;
  if (beforeMaterial !== afterMaterial) changes.push({ key: "material", label: t.materialLabel, before: beforeMaterial, after: afterMaterial });
  if (item.source.date !== draft.date) changes.push({ key: "date", label: t.dateLabel, before: item.source.date, after: draft.date || "—" });
  if (String(item.source.quantity ?? "") !== draft.quantity) changes.push({ key: "quantity", label: t.quantityLabel, before: displayQuantity(item.source.quantity), after: draft.quantity === "" ? "—" : displayQuantity(Number(draft.quantity)) });
  if (item.source.classification !== draft.classification) changes.push({ key: "classification", label: t.typeLabel, before: classificationText(item.source.classification), after: classificationText(draft.classification) });
  return changes;
}

function StepThree({ run, selectedCorrections, restoreCount, applying, validationSummary, corrections, onDownload, onMerge }: {
  run: SkillRun; selectedCorrections: SkillCorrection[]; restoreCount: number; applying: boolean;
  validationSummary: ValidationSummary; corrections: SkillCorrection[]; onDownload: () => Promise<void>; onMerge: () => Promise<void>;
}) {
  return <div>
    <h2 className="text-sm font-black">{t.step3Title}</h2>
    <p className="mt-1 text-xs text-slate-500">{t.step3Hint}</p>

    {run.summary && <div className="mt-4 rounded-xl border border-[color:var(--forvia-blue-border)] bg-[var(--forvia-blue-soft)] p-4"><h3 className="mb-2 text-xs font-black text-[var(--forvia-blue)]">{t.aiAuditTitle}</h3><p className="whitespace-pre-wrap text-xs leading-5 text-slate-700">{run.summary}</p></div>}

    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px]"><SummaryStat label={t.statusValid} value={validationSummary.valid}/><SummaryStat label={t.statusBlocked} value={validationSummary.blocked}/><SummaryStat label={t.statusMerged} value={validationSummary.merged}/></div>

    {corrections.length > 0 && <section className="mt-4 overflow-hidden rounded-xl border border-[var(--line)]"><div className="border-b border-[var(--line)] bg-slate-50 px-3 py-2"><h3 className="text-xs font-black">{"修正项总览"} ({corrections.length})</h3></div><div className="max-h-60 divide-y divide-[var(--line)] overflow-auto">{corrections.map((item) => <div key={item.id} className="grid grid-cols-[minmax(140px,200px)_80px_80px_1fr] items-center gap-3 px-3 py-2 text-xs"><span className="truncate font-semibold">{item.source.internalPartNumber}</span><span className="text-slate-500">{item.source.date}</span><span className="text-right tabular-nums">{displayQuantity(item.source.quantity)} → {displayQuantity(item.proposal.quantity)}</span><span className="truncate text-slate-500">{item.reason}</span></div>)}</div></section>}

    <p className="mt-4 text-xs font-semibold text-slate-700">{t.mergeSummary(selectedCorrections.length, selectedCorrections.length + restoreCount)}</p>
    <div className="mt-4 grid max-w-3xl grid-cols-5 gap-2 max-[1100px]:grid-cols-3">
      <SummaryStat label={t.selectedCount} value={selectedCorrections.length}/>
      <SummaryStat label={t.expectedWrites} value={selectedCorrections.length + restoreCount}/>
      <SummaryStat label={t.sourceRestores} value={restoreCount}/>
      <SummaryStat label={t.pendingBlocked} value={validationSummary.blocked}/>
      <SummaryStat label={t.submittedBatches} value={run.mergeBatches.length}/>
    </div>
    <section className="mt-4 overflow-hidden rounded-xl border border-[var(--line)]">
      <div className="border-b border-[var(--line)] bg-slate-50 px-3 py-2"><h3 className="text-xs font-black">{t.aboutToWrite}</h3></div>
      {selectedCorrections.length ? <div className="divide-y divide-[var(--line)]">{selectedCorrections.map((item) => {
        const changes = correctionChangeDetails(item);
        return <div key={item.id} className="grid grid-cols-[minmax(150px,220px)_1fr] gap-4 px-3 py-2.5 text-xs max-[800px]:grid-cols-1">
          <div><strong>{item.source.internalPartNumber}</strong><span className="block text-[11px] text-slate-500">{item.source.date}</span></div>
          <div className="flex flex-wrap gap-2">{changes.map((change) => <span key={change.key} className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[11px] text-blue-800"><strong>{change.label}</strong>{change.before}<ArrowRight size={11}/>{change.after}</span>)}</div>
        </div>;
      })}</div> : <p className="px-3 py-6 text-center text-xs text-slate-400">{t.noMergeSelection}</p>}
    </section>
    <div className="mt-4 flex flex-wrap gap-2">
      <Button onClick={() => void onDownload()}><Download size={14}/>{t.exportResult}</Button>
      {run.mode === "formal" && <Button variant="primary" disabled={!selectedCorrections.length || applying} onClick={() => void onMerge()}>{applying ? <LoaderCircle className="animate-spin" size={14}/> : <Upload size={14}/>}{t.confirmMerge(selectedCorrections.length)}</Button>}
    </div>
    {run.mode !== "formal" && <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{t.testModeWarning}</div>}
    {run.mergeBatches.length > 0 && <section className="mt-5"><h3 className="text-xs font-black">{t.mergeHistory}</h3><div className="mt-2 divide-y divide-[var(--line)] rounded-xl border border-[var(--line)]">{run.mergeBatches.map((batch) => <div key={batch.batchId} className="grid grid-cols-[1fr_auto] items-center gap-3 px-3 py-2 text-xs"><span><strong>{t.mergeBatchLabel(batch.correctionIds.length)}</strong><span className="ml-2 text-slate-500">{t.mergeRevision(run.reviewRevision)} · {displayChangedAt(batch.timestamp)}</span></span><span className="font-mono text-[10px] text-slate-500">{batch.changesetId}</span></div>)}</div></section>}
  </div>;
}

// ─── Shared small components ─────────────────────────────────────────
function SummaryStat({ label, value: count }: { label: string; value: number }) {
  return <div className="rounded-lg border border-[var(--line)] bg-slate-50 p-2 text-xs"><strong className="block text-sm tabular-nums">{count}</strong><span className="text-[11px] text-slate-500">{label}</span></div>;
}

function OrdersTable({ rows }: { rows: SnapshotCell[] }) {
  return <div className="overflow-auto rounded-xl border border-[var(--line)]"><table className="w-full min-w-[980px] text-xs"><thead className="sticky top-0 bg-slate-50"><tr><th className="p-2 text-left font-black">{ordersLabels.customerPN}</th><th className="p-2 text-left font-black">{ordersLabels.internalPN}</th><th className="p-2 text-left font-black">Date</th><th className="p-2 text-left font-black">{ordersLabels.type}</th><th className="p-2 text-right font-black">Quantity</th><th className="p-2 text-left font-black">修订记录</th></tr></thead><tbody>{rows.map((row) => <SnapshotRow key={`${row.rowKey}:${row.colKey}`} row={row}/>)}</tbody></table></div>;
}

function SnapshotRow({ row }: { row: SnapshotCell }) {
  const history = row.revisionHistory;
  const revision = row.cellRevision;
  const hasHistory = revision > 1 || history.some((item) => item.previousValue !== null && item.previousValue !== undefined);
  return <tr className="border-t border-[var(--line)] align-top"><td className="p-2">{displayValue(row.customerPartNumber)}</td><td className="p-2">{displayValue(row.internalPartNumber)}</td><td className="p-2 tabular-nums">{displayValue(row.date)}</td><td className="p-2"><Badge variant={row.classification === "confirmed" ? undefined : "blue"}>{classificationText(row.classification)}</Badge></td><td className="p-2 text-right font-semibold tabular-nums">{displayQuantity(row.quantity)}</td><td className="p-2"><details className="min-w-44"><summary className="cursor-pointer font-semibold text-[var(--forvia-blue)]">{t.revisionLabel(revision)} · {hasHistory ? t.hasHistory : t.initialValue}</summary><div className="mt-2 space-y-2 border-l border-[var(--line)] pl-2">{history.length ? history.map((item, index) => <div key={`${item.revision}-${index}`} className="leading-4 text-slate-500"><strong className="block text-[var(--ink)]">{t.revisionEntry(item.revision)} · {displayQuantity(item.value)}</strong><span>{displayChangedAt(item.changedAt)} · {sourceTypeLabel(item.sourceType)}</span>{item.previousValue !== null && item.previousValue !== undefined && <span className="block">{t.previousValueLabel(displayQuantity(item.previousValue))}</span>}</div>) : <span className="text-slate-400">{t.noRevisionDetail}</span>}</div></details></td></tr>;
}

function ExecutionProgress({ run }: { run: SkillRun }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setElapsed((cur) => cur + 1), 1000); return () => window.clearInterval(timer); }, []);
  return <div className="min-h-72 rounded-xl border border-[var(--forvia-blue-border)] bg-[var(--forvia-blue-soft)] p-6" role="status" aria-live="polite"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-black text-[var(--forvia-blue)]"><LoaderCircle className="animate-spin" size={18}/>{t.executing}</div><span className="text-[11px] tabular-nums text-slate-500">{t.executingTimer(elapsed)}</span></div><p className="mt-4 text-xs text-slate-600">{phaseLabels[run.phase]}</p><p className="mt-6 text-[11px] leading-5 text-slate-500">{t.executingHint}</p></div>;
}

function CorrectionTable({ corrections, drafts, selected, materials, allowedClassifications, savingId, customerName, onDraft, onSave, onToggle }: {
  corrections: SkillCorrection[]; drafts: Record<string, EditDraft>; selected: string[]; materials: CustomerConfig["materialMappings"];
  allowedClassifications: ("forecast" | "confirmed")[]; savingId: string | null; customerName: string;
  onDraft: (id: string, value: Partial<EditDraft>) => void; onSave: (item: SkillCorrection) => Promise<void>; onToggle: (id: string) => void;
}) {
  if (!corrections.length) return <div className="rounded-xl border border-dashed border-[var(--line)] p-8 text-center text-xs text-slate-400">{t.noFilteredCorrections}</div>;
  return <div className="overflow-auto rounded-xl border border-[var(--line)]"><table className="w-full min-w-[1260px] text-xs"><thead className="bg-slate-50"><tr><th className="p-3">{t.colSelect}</th><th className="p-3 text-left">{t.colCustomer}</th><th className="p-3 text-left">{t.colBefore}</th><th className="p-3 text-left">{t.colAfter}</th><th className="p-3 text-left">{t.colValidation}</th><th className="p-3">{t.colAction}</th></tr></thead><tbody>{corrections.map((item) => {
    const draft = drafts[item.id];
    const blocked = item.status !== "valid";
    const hasCollision = item.issues.some((issue) => issue.code === "TARGET_COLLISION") || !!item.collisionResolution;
    const dateType = item.source.timeGranularity === "day" ? "date" : item.source.timeGranularity === "week" ? "week" : "month";
    const changes = correctionChangeDetails(item, draft);
    const changed = new Set(changes.map((change) => change.key));
    const material = materials.find((c) => c.internalPartNumber === draft.internalPartNumber && c.customerPartNumber === draft.customerPartNumber);
    const relocated = !!item.target && (item.target.rowKey !== item.source.rowKey || item.target.colKey !== item.source.colKey);
    const disabled = item.status === "merged";
    const errorIssues = item.issues.filter((i) => i.severity === "error");
    const warningIssues = item.issues.filter((i) => i.severity === "warning");
    const isNoChange = item.issues.some((i) => i.code === "NO_EFFECTIVE_CHANGE");
    const rowBg = item.status === "blocked" ? "bg-red-50/40" : item.status === "merged" ? "bg-slate-50 text-slate-500" : isNoChange ? "bg-amber-50/40" : "";
    return <tr key={item.id} className={`border-t border-[var(--line)] align-middle ${rowBg}`}>
      <td className="p-3 text-center"><input type="checkbox" disabled={disabled} checked={selected.includes(item.id)} onChange={() => onToggle(item.id)}/></td>
      <td className="p-3 font-semibold">{customerName}</td>
      <td className="p-3"><div className="min-w-56 space-y-1.5">
        <ValueLine label={t.materialLabel} value={`${item.source.internalPartNumber} · ${item.source.customerPartNumber || "—"}`}/>
        <ValueLine label={t.dateLabel} value={item.source.date}/>
        <ValueLine label={t.quantityLabel} value={displayQuantity(item.source.quantity)}/>
        <ValueLine label={t.typeLabel} value={classificationText(item.source.classification)}/>
        {relocated && <p className="rounded-md bg-amber-50 px-2 py-1 text-[10px] text-amber-800">{t.restoreHint(displayQuantity(item.source.quantity))}</p>}
      </div></td>
      <td className="p-3"><div className="min-w-[430px] space-y-2">
        <label className="grid grid-cols-[42px_1fr] items-center gap-2"><span className="text-[11px] text-slate-500">{t.materialLabel}</span><select disabled={disabled} className={`skill-select w-full ${changed.has("material") ? "border-blue-300 bg-blue-50" : ""}`} value={material?.mappingId ?? ""} onChange={(event) => {
          const next = materials.find((c) => c.mappingId === event.target.value);
          if (next) onDraft(item.id, { internalPartNumber: next.internalPartNumber, customerPartNumber: next.customerPartNumber, collisionResolution: "" });
        }}>{!material && <option value="" disabled>{draft.internalPartNumber} · {draft.customerPartNumber || t.selectMaterial}</option>}{materials.map((c) => <option key={c.mappingId} value={c.mappingId}>{c.internalPartNumber} · {c.customerPartNumber}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-2">
          <label className="grid grid-cols-[42px_1fr] items-center gap-2"><span className="text-[11px] text-slate-500">{t.dateLabel}</span>{dateType === "date" ? <DatePicker aria-label={t.dateLabel} disabled={disabled} className={changed.has("date") ? "border-blue-300 bg-blue-50" : ""} value={draft.date} onChange={(value) => onDraft(item.id, { date: value, collisionResolution: "" })}/> : <Input disabled={disabled} className={changed.has("date") ? "border-blue-300 bg-blue-50" : ""} type={dateType} value={draft.date} onChange={(event) => onDraft(item.id, { date: event.target.value, collisionResolution: "" })}/>}</label>
          <label className="grid grid-cols-[42px_1fr] items-center gap-2"><span className="text-[11px] text-slate-500">{t.quantityLabel}</span><Input disabled={disabled} className={`text-right tabular-nums ${changed.has("quantity") ? "border-blue-300 bg-blue-50" : ""}`} type="number" min={0} step={1} value={draft.quantity} onChange={(event) => onDraft(item.id, { quantity: event.target.value })}/></label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="grid grid-cols-[42px_1fr] items-center gap-2"><span className="text-[11px] text-slate-500">{t.typeLabel}</span><select disabled={disabled} className={`skill-select w-full ${changed.has("classification") ? "border-blue-300 bg-blue-50" : ""}`} value={draft.classification} onChange={(event) => onDraft(item.id, { classification: event.target.value as "forecast" | "confirmed" })}>{allowedClassifications.map((kind) => <option key={kind} value={kind}>{classificationText(kind)}</option>)}</select></label>
          {hasCollision && <label className="grid grid-cols-[42px_1fr] items-center gap-2"><span className="text-[11px] text-slate-500">{t.collisionLabel}</span><select disabled={disabled} className="skill-select w-full" value={draft.collisionResolution} onChange={(event) => onDraft(item.id, { collisionResolution: event.target.value as CollisionResolution | "" })}><option value="">{t.collisionPlaceholder}</option><option value="replace">{t.collisionReplace}</option><option value="increment">{t.collisionIncrement}</option></select></label>}
        </div>
        <div className="flex min-h-5 flex-wrap gap-1">{changes.map((change) => <span key={change.key} className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">{t.changeTag(change.label)}</span>)}</div>
      </div></td>
      <td className="max-w-xs p-3">
        {item.status === "merged" ? <Badge>{t.statusMerged}</Badge>
        : <>
          {item.status === "valid" && !warningIssues.length && <Badge variant="green">{t.statusValid}</Badge>}
          {item.status === "valid" && warningIssues.length > 0 && <Badge variant="amber">{t.needsReview}</Badge>}
          {errorIssues.length > 0 && <Badge variant="red">{t.errorBadge(errorIssues.length)}</Badge>}
          {item.issues.map((issue) => (
            <div key={`${item.id}-${issue.code}`} className={`mt-1 flex gap-1 text-[10px] leading-4 ${issue.severity === "error" ? "text-red-700" : "text-amber-700"}`}>
              <AlertTriangle className="mt-0.5 shrink-0" size={11}/>
              <span>{issue.code} · {issue.message}</span>
            </div>
          ))}
        </>}
      </td>
      <td className="p-3 text-center"><Button size="sm" disabled={disabled || savingId === item.id} onClick={() => void onSave(item)}>{savingId === item.id ? <LoaderCircle className="animate-spin" size={13}/> : <Save size={13}/>}{t.saveAndValidate}</Button></td>
    </tr>;
  })}</tbody></table></div>;
}

function ValueLine({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[36px_1fr] gap-2 leading-5"><span className="text-[11px] text-slate-400">{label}</span><strong className="font-medium text-slate-700">{value}</strong></div>;
}
