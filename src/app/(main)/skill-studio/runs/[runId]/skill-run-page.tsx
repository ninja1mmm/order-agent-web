"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, Bot, Check, Download, LoaderCircle, Play, RefreshCw, RotateCcw, Save, Search, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listCustomers, type CustomerConfig } from "@/services/settings";
import {
  applyCorrections, deleteSkillRun, downloadSkillResult, executeSkillRun, getSkillRun, patchSkillCorrection,
  recreateSkillRun, selectSkillRunSnapshot, validateSkillRun,
  type CollisionResolution, type OrdersFilter, type SkillCorrection, type SkillRun,
} from "@/services/skills";
import { orderCopy } from "../../../orders/_components/order-utils";

const ordersLabels = orderCopy["zh-CN"];
const today = new Date().toISOString().slice(0, 10);
const later = new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10);

type EditDraft = {
  internal_part_number: string;
  customer_part_number: string;
  date: string;
  quantity: string;
  classification: "forecast" | "confirmed";
  collision_resolution: CollisionResolution | "";
};

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "请求失败";
}

type SnapshotRevision = {
  revision?: number;
  value?: number | null;
  previousValue?: number | null;
  changedAt?: string | null;
  sourceType?: string | null;
};

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
  if (sourceType === "pipeline") return "系统导入";
  if (sourceType === "manual_edit") return "人工修改";
  if (sourceType === "skill_correction") return "Skill 合并";
  return sourceType || "未知来源";
}

function draftFor(item: SkillCorrection): EditDraft {
  return {
    internal_part_number: item.proposal.internal_part_number,
    customer_part_number: item.proposal.customer_part_number ?? "",
    date: item.proposal.date,
    quantity: String(item.proposal.quantity),
    classification: item.proposal.classification,
    collision_resolution: item.collision_resolution ?? "",
  };
}

export function SkillRunPage({ runId }: { runId: string }) {
  const router = useRouter();
  const [run, setRun] = useState<SkillRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [viewingStep, setViewingStep] = useState<1 | 2 | 3>(2);
  const [selected, setSelected] = useState<string[]>([]);
  const [applying, setApplying] = useState(false);
  const [validating, setValidating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "valid" | "blocked" | "merged">("all");
  const [drafts, setDrafts] = useState<Record<string, EditDraft>>({});
  const [customers, setCustomers] = useState<CustomerConfig[]>([]);
  const [scope, setScope] = useState<OrdersFilter>({ time_from: today, time_to: later, internal_part_numbers: [] });
  const [materialSearch, setMaterialSearch] = useState("");
  const [snapshotting, setSnapshotting] = useState(false);
  const [snapshotDirty, setSnapshotDirty] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const initialized = useRef(false);
  const mergeKey = useRef<{ signature: string; key: string } | null>(null);

  const acceptRun = useCallback((next: SkillRun) => {
    setRun(next);
    setExecuting(next.status === "running");
    setDrafts(Object.fromEntries(next.corrections.map((item) => [item.id, draftFor(item)])));
    setSelected((current) => {
      const selectable = new Set(next.corrections.filter((item) => item.status === "valid").map((item) => item.id));
      const retained = current.filter((id) => selectable.has(id));
      return retained.length ? retained : [...selectable];
    });
    return next;
  }, []);

  const load = useCallback(async () => acceptRun(await getSkillRun(runId)), [acceptRun, runId]);

  /* eslint-disable react-hooks/set-state-in-effect -- API-backed initial state */
  useEffect(() => {
    void load().then((next) => {
      if (!initialized.current) {
        initialized.current = true;
        if (next.filters.time_from && next.filters.time_to) {
          setScope({ time_from: next.filters.time_from, time_to: next.filters.time_to, internal_part_numbers: next.filters.internal_part_numbers ?? [] });
          setSnapshotDirty(!next.input_cell_count);
        }
      }
    }).catch((error) => toast.error(errorText(error))).finally(() => setLoading(false));
    void listCustomers().then(setCustomers).catch(() => undefined);
  }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!executing) return;
    const timer = window.setInterval(() => {
      void load().then((next) => {
        if (next.status === "succeeded" || next.status === "failed") window.clearInterval(timer);
      }).catch((error) => {
        window.clearInterval(timer);
        setExecuting(false);
        toast.error(errorText(error));
      });
    }, 1500);
    return () => window.clearInterval(timer);
  }, [executing, load]);

  const customer = customers.find((item) => item.id === run?.filters.customer_id);
  const activeMaterials = useMemo(() => (customer?.materialMappings ?? []).filter((item) => item.status === "active"), [customer]);
  const matchingMaterials = activeMaterials.filter((item) => `${item.internalPartNumber} ${item.customerPartNumber} ${item.designation ?? ""}`.toLowerCase().includes(materialSearch.toLowerCase()));
  const filteredCorrections = useMemo(() => run?.corrections.filter((item) => filter === "all" || item.status === filter) ?? [], [filter, run?.corrections]);

  async function execute() {
    if (!run || executing || snapshotDirty || !run.input_cell_count || run.input_issues.length) return;
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
    if (!run || snapshotting || scope.time_from > scope.time_to) return;
    setSnapshotting(true);
    try {
      const next = acceptRun(await selectSkillRunSnapshot(run.id, scope));
      setSnapshotDirty(false);
      toast.success(`已载入 ${next.input_cell_count} 个单元格`);
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
      toast.error("数量必须是非负整数");
      return;
    }
    setSavingId(item.id);
    try {
      acceptRun(await patchSkillCorrection(run.id, item.id, {
        review_revision: run.review_revision,
        internal_part_number: draft.internal_part_number,
        ...(draft.customer_part_number ? { customer_part_number: draft.customer_part_number } : {}),
        date: draft.date,
        quantity,
        classification: draft.classification,
        collision_resolution: draft.collision_resolution || null,
      }));
      mergeKey.current = null;
      toast.success("修正项已保存并重新校验");
    } catch (error) {
      toast.error(errorText(error));
      await load().catch(() => undefined);
    } finally {
      setSavingId(null);
    }
  }

  async function revalidate(goToMerge = false) {
    if (!run || validating) return;
    setValidating(true);
    try {
      const next = acceptRun(await validateSkillRun(run.id));
      if (goToMerge) setViewingStep(3);
      toast.success(`校验完成：${next.validation_summary.valid} 项可合并，${next.validation_summary.blocked} 项异常`);
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
    const signature = `${run.id}:${run.review_revision}:${[...selected].sort().join(",")}`;
    if (mergeKey.current?.signature !== signature) mergeKey.current = { signature, key: crypto.randomUUID() };
    const selectedIds = [...selected];
    const idempotencyKey = mergeKey.current.key;
    setApplying(true);
    try {
      const result = await applyCorrections(run.id, selectedIds, run.review_revision, idempotencyKey);
      const committedBatch = result.run.merge_batches.find((batch) => batch.id === result.batch_id);
      const mergedIds = new Set(result.run.corrections.filter((item) => item.merged_batch_id === result.batch_id && item.status === "merged").map((item) => item.id));
      if (result.status !== "committed" || !committedBatch || !selectedIds.every((id) => mergedIds.has(id))) {
        throw new Error("服务端尚未确认本批写入，请刷新后重试");
      }
      acceptRun(result.run);
      mergeKey.current = null;
      toast.success(`已写入 Orders，并生成修订记录（${result.changeset_id}）`);
    } catch (error) {
      const latest = await load().catch(() => null);
      const recoveredBatch = latest?.merge_batches.find((batch) => batch.idempotency_key === idempotencyKey);
      const recoveredIds = new Set(latest?.corrections.filter((item) => item.merged_batch_id === recoveredBatch?.id && item.status === "merged").map((item) => item.id));
      if (recoveredBatch && selectedIds.every((id) => recoveredIds.has(id))) {
        mergeKey.current = null;
        toast.success(`已确认写入 Orders，并生成修订记录（${recoveredBatch.changeset_id}）`);
      } else {
        toast.error(errorText(error));
        setViewingStep(2);
      }
    } finally {
      setApplying(false);
    }
  }

  async function removeRun() {
    if (!run || deleting || run.merge_batches.length) return;
    if (!window.confirm("该运行尚未合并，确认删除？")) return;
    setDeleting(true);
    try {
      await deleteSkillRun(run.id);
      toast.success("运行已删除");
      router.push("/skill-studio");
    } catch (error) {
      toast.error(errorText(error));
      setDeleting(false);
    }
  }

  if (loading) return <div className="grid flex-1 place-items-center"><LoaderCircle className="animate-spin text-[var(--forvia-blue)]" /></div>;
  if (!run) return <div className="grid flex-1 place-items-center text-sm text-slate-500">未找到 Skill 运行</div>;

  const activeStep = run.status === "queued" ? 1 : run.status === "running" ? 2 : viewingStep;
  const customerName = String(run.input_snapshot[0]?.customer_name ?? customer?.name ?? run.filters.customer_id);
  const invalidDates = !scope.time_from || !scope.time_to || scope.time_from > scope.time_to;
  const title = String(run.skill_snapshot.name ?? "Skill Run");
  const selectedCorrections = run.corrections.filter((item) => selected.includes(item.id));
  const restoreCount = selectedCorrections.filter((item) => item.target && (item.target.row_key !== item.source.row_key || item.target.col_key !== item.source.col_key)).length;
  function updateScope(next: OrdersFilter) { setScope(next); setSnapshotDirty(true); }
  function toggleMaterial(part: string) { updateScope({ ...scope, internal_part_numbers: scope.internal_part_numbers.includes(part) ? scope.internal_part_numbers.filter((item) => item !== part) : [...scope.internal_part_numbers, part] }); }
  function updateDraft(id: string, changes: Partial<EditDraft>) { setDrafts((current) => ({ ...current, [id]: { ...current[id], ...changes } })); }

  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
    <header className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-4 py-3">
      <div className="min-w-0"><Link href="/skill-studio" className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-[var(--forvia-blue)]"><ArrowLeft size={15}/>返回 Skill Studio</Link><h1 className="mt-1 truncate text-lg font-black">{title}</h1></div>
      <div className="flex shrink-0 items-center gap-3 text-[11px] text-slate-500"><span>{run.mode === "formal" ? "正式运行" : "试运行"} · {run.input_cell_count} 个单元格</span><Badge variant={run.status === "succeeded" ? "green" : run.status === "failed" ? "red" : "amber"}>{run.status}</Badge>{!run.merge_batches.length && <Button size="sm" variant="destructive" disabled={deleting} onClick={() => void removeRun()}>{deleting ? <LoaderCircle className="animate-spin" size={13}/> : <Trash2 size={13}/>}删除运行</Button>}</div>
    </header>
    <div className="grid min-h-0 flex-1 grid-cols-[270px_minmax(560px,1fr)] overflow-hidden max-[900px]:block max-[900px]:overflow-auto">
      <aside className="min-h-0 overflow-auto border-r border-[var(--line)] p-4">
        <h2 className="text-sm font-black">运行摘要</h2>
        <dl className="mt-4 grid grid-cols-[72px_1fr] gap-x-3 gap-y-3 text-xs"><dt className="text-slate-500">客户</dt><dd className="font-semibold">{customerName}</dd><dt className="text-slate-500">日期</dt><dd>{run.filters.time_from ? <>{run.filters.time_from}<br/>{run.filters.time_to}</> : "待选择"}</dd><dt className="text-slate-500">类型</dt><dd>{run.filters.classifications.join(" / ")}</dd><dt className="text-slate-500">物料</dt><dd>{run.filters.time_from ? run.filters.internal_part_numbers?.length ? `${run.filters.internal_part_numbers.length} 项` : "全部物料" : "待选择"}</dd></dl>
        {run.status === "succeeded" && <div className="mt-5 grid grid-cols-3 gap-2 text-center text-[11px]"><SummaryStat label="可合并" value={run.validation_summary.valid}/><SummaryStat label="异常" value={run.validation_summary.blocked}/><SummaryStat label="已合并" value={run.validation_summary.merged}/></div>}
        <details className="mt-6 rounded-xl border border-[var(--line)]"><summary className="cursor-pointer px-3 py-2 text-xs font-black">Skill Spec</summary><pre className="max-h-[45vh] overflow-auto whitespace-pre-wrap border-t border-[var(--line)] bg-slate-950 p-3 text-[10px] leading-5 text-slate-200">{JSON.stringify(run.skill_snapshot.skill_spec ?? {}, null, 2)}</pre></details>
      </aside>
      <section className="min-h-0 overflow-auto p-5">
        <div className="mb-5 grid grid-cols-3 gap-2">{["确认数据", "执行与校验", "合并 / 导出"].map((label, index) => {
          const step = (index + 1) as 1 | 2 | 3;
          const enabled = run.status === "queued" ? step === 1 : run.status === "running" ? step === 2 : step < 3 || run.status === "succeeded";
          const complete = step === 1 ? run.status !== "queued" : step === 2 ? run.status === "succeeded" : run.merge_batches.length > 0;
          return <button type="button" key={label} disabled={!enabled} onClick={() => setViewingStep(step)} aria-current={activeStep === step ? "step" : undefined} className={`rounded-xl border px-3 py-3 text-left text-xs ${activeStep === step ? "border-[var(--forvia-blue)] bg-[var(--forvia-blue-soft)]" : "border-[var(--line)]"} ${!enabled ? "cursor-default opacity-50" : "hover:border-slate-300"}`}><span className={`mr-2 inline-grid h-5 w-5 place-items-center rounded-full ${complete ? "bg-emerald-500 text-white" : "bg-slate-100"}`}>{complete ? <Check size={12}/> : step}</span>{label}</button>;
        })}</div>

        {activeStep === 1 && <StepOne run={run} scope={scope} setScope={updateScope} invalidDates={invalidDates} snapshotting={snapshotting} snapshotDirty={snapshotDirty} materialSearch={materialSearch} setMaterialSearch={setMaterialSearch} materials={matchingMaterials} toggleMaterial={toggleMaterial} previewSnapshot={previewSnapshot} execute={execute} executing={executing}/>} 

        {activeStep === 2 && <div>
          <div className="mb-3 flex items-center justify-between gap-3"><div><h2 className="text-sm font-black">Step 2 · 执行、校验并修正</h2><p className="mt-1 text-xs text-slate-500">客户固定为 {customerName}；编辑物料、日期和数量时会自动带入该客户信息。</p></div><div className="flex gap-2">{run.status === "succeeded" && <Button disabled={validating} onClick={() => void revalidate()}>{validating ? <LoaderCircle className="animate-spin" size={14}/> : <RefreshCw size={14}/>}重新校验</Button>}{run.status === "failed" && <Button onClick={() => void (async () => { try { const next = await recreateSkillRun(run.id); router.push(`/skill-studio/runs/${next.id}`); } catch (error) { toast.error(errorText(error)); } })()}><RotateCcw size={14}/>重新创建运行</Button>}</div></div>
          {executing || run.status === "running" ? <ExecutionProgress run={run}/> : run.status === "failed" ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><strong>执行失败</strong><p className="mt-1">{run.error || "模型执行异常"}</p></div> : <>
            <AiAuditPanel summary={run.summary} corrections={run.corrections}/>
            {run.corrections.length === 0 ? <div className="rounded-xl border border-[var(--line)] bg-slate-50 p-6 text-center text-sm"><strong>模型未返回修正项</strong><p className="mt-1 text-xs text-slate-500">请结合上方 AI 审计结论和服务端原始输出日志确认业务规则是否被正确理解。</p><Button className="mt-4" onClick={() => void revalidate(true)}>查看导出操作</Button></div> : <>
              <div className="mb-3 flex flex-wrap gap-2">{(["all", "valid", "blocked", "merged"] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-lg border px-3 py-1.5 text-xs ${filter === item ? "border-[var(--forvia-blue)] bg-[var(--forvia-blue-soft)] text-[var(--forvia-blue)]" : "border-[var(--line)]"}`}>{item === "all" ? "全部" : item === "valid" ? "可合并" : item === "blocked" ? "异常" : "已合并"}</button>)}</div>
              <CorrectionTable corrections={filteredCorrections} drafts={drafts} selected={selected} materials={activeMaterials} allowedClassifications={run.filters.classifications} savingId={savingId} onDraft={updateDraft} onSave={saveCorrection} onToggle={(id) => setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])}/>
              <div className="mt-4 flex justify-end"><Button variant="primary" disabled={validating} onClick={() => void revalidate(true)}>{validating && <LoaderCircle className="animate-spin" size={14}/>}校验并进入下一步</Button></div>
            </>}
          </>}
        </div>}

        {activeStep === 3 && <StepThree run={run} selectedCorrections={selectedCorrections} restoreCount={restoreCount} applying={applying} onDownload={download} onMerge={merge}/>}
      </section>
    </div>
  </div>;
}

function AiAuditPanel({ summary, corrections }: { summary: string | null; corrections: SkillCorrection[] }) {
  const advice = [...new Map(corrections.map((item) => [item.reason, item])).values()];
  return <section className="mb-3 overflow-hidden rounded-xl border border-[var(--forvia-blue-border)] bg-[var(--forvia-blue-soft)]/40">
    <div className="flex items-center gap-2 border-b border-[var(--forvia-blue-border)] px-3 py-2">
      <span className="grid h-6 w-6 place-items-center rounded-lg bg-[var(--forvia-blue)] text-white"><Bot size={14}/></span>
      <h3 className="text-xs font-black text-[var(--ink)]">AI 审计结论</h3>
    </div>
    <div className="space-y-3 px-3 py-3 text-xs leading-5">
      <p className="text-slate-700">{summary || "模型未提供审计摘要。"}</p>
      <div>
        <h4 className="font-black text-[var(--ink)]">处理建议</h4>
        {advice.length ? <ul className="mt-1.5 space-y-1.5 text-slate-600">
          {advice.map((item) => <li key={item.id} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--forvia-blue)]"/><span><strong className="font-semibold text-slate-800">{item.proposal.internal_part_number} · {item.proposal.date}</strong>：{item.reason}</span></li>)}
        </ul> : <p className="mt-1.5 text-slate-500">模型未提供具体修正建议。</p>}
      </div>
    </div>
  </section>;
}

function classificationText(value: "forecast" | "confirmed") {
  return value === "confirmed" ? "Firm" : "Forecast";
}

type ChangeDetail = { key: string; label: string; before: string; after: string };

function correctionChangeDetails(item: SkillCorrection, draft: EditDraft = draftFor(item)): ChangeDetail[] {
  const changes: ChangeDetail[] = [];
  const beforeMaterial = `${item.source.internal_part_number} · ${item.source.customer_part_number || "—"}`;
  const afterMaterial = `${draft.internal_part_number} · ${draft.customer_part_number || "—"}`;
  if (beforeMaterial !== afterMaterial) changes.push({ key: "material", label: "物料", before: beforeMaterial, after: afterMaterial });
  if (item.source.date !== draft.date) changes.push({ key: "date", label: "日期", before: item.source.date, after: draft.date || "—" });
  if (String(item.source.quantity ?? "") !== draft.quantity) changes.push({ key: "quantity", label: "数量", before: displayQuantity(item.source.quantity), after: draft.quantity === "" ? "—" : displayQuantity(Number(draft.quantity)) });
  if (item.source.classification !== draft.classification) changes.push({ key: "classification", label: "类型", before: classificationText(item.source.classification), after: classificationText(draft.classification) });
  return changes;
}

function StepThree({ run, selectedCorrections, restoreCount, applying, onDownload, onMerge }: {
  run: SkillRun; selectedCorrections: SkillCorrection[]; restoreCount: number; applying: boolean;
  onDownload: () => Promise<void>; onMerge: () => Promise<void>;
}) {
  return <div>
    <h2 className="text-sm font-black">Step 3 · 合并或导出</h2>
    <p className="mt-1 text-xs text-slate-500">确认本批变更后写入 Orders；提交时会再次核对实时修订号。</p>
    <div className="mt-4 grid max-w-3xl grid-cols-5 gap-2 max-[1100px]:grid-cols-3">
      <SummaryStat label="本批选中" value={selectedCorrections.length}/>
      <SummaryStat label="预计写入记录" value={selectedCorrections.length + restoreCount}/>
      <SummaryStat label="源位置恢复" value={restoreCount}/>
      <SummaryStat label="待处理异常" value={run.validation_summary.blocked}/>
      <SummaryStat label="已提交批次" value={run.merge_batches.length}/>
    </div>
    <section className="mt-4 overflow-hidden rounded-xl border border-[var(--line)]">
      <div className="border-b border-[var(--line)] bg-slate-50 px-3 py-2"><h3 className="text-xs font-black">即将写入 Orders</h3></div>
      {selectedCorrections.length ? <div className="divide-y divide-[var(--line)]">{selectedCorrections.map((item) => {
        const changes = correctionChangeDetails(item);
        return <div key={item.id} className="grid grid-cols-[minmax(150px,220px)_1fr] gap-4 px-3 py-2.5 text-xs max-[800px]:grid-cols-1">
          <div><strong>{item.proposal.customer_name}</strong><span className="block text-[11px] text-slate-500">{item.source.internal_part_number} · {item.source.date}</span></div>
          <div className="flex flex-wrap gap-2">{changes.map((change) => <span key={change.key} className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[11px] text-blue-800"><strong>{change.label}</strong>{change.before}<ArrowRight size={11}/>{change.after}</span>)}</div>
        </div>;
      })}</div> : <p className="px-3 py-6 text-center text-xs text-slate-400">尚未选择可合并项，请返回 Step 2 选择。</p>}
    </section>
    <div className="mt-4 flex flex-wrap gap-2">
      <Button onClick={() => void onDownload()}><Download size={14}/>导出结果</Button>
      {run.mode === "formal" && <Button variant="primary" disabled={!selectedCorrections.length || applying} onClick={() => void onMerge()}>{applying ? <LoaderCircle className="animate-spin" size={14}/> : <Upload size={14}/>}确认合并并写入 Orders ({selectedCorrections.length})</Button>}
    </div>
    {run.mode !== "formal" && <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">当前为试运行，仅用于预览、校验和调整；如需写入 Orders，请返回 Skill Studio 创建正式运行。</div>}
    {run.merge_batches.length > 0 && <section className="mt-5"><h3 className="text-xs font-black">合并记录</h3><div className="mt-2 divide-y divide-[var(--line)] rounded-xl border border-[var(--line)]">{run.merge_batches.map((batch) => <div key={batch.id} className="grid grid-cols-[1fr_auto] items-center gap-3 px-3 py-2 text-xs"><span><strong>已提交 · {batch.correction_ids.length} 项</strong><span className="ml-2 text-slate-500">审阅修订 {batch.review_revision} · {displayChangedAt(batch.created_at)}</span></span><span className="font-mono text-[10px] text-slate-500">{batch.changeset_id}</span></div>)}</div></section>}
  </div>;
}

function SummaryStat({ label, value: count }: { label: string; value: number }) {
  return <div className="rounded-lg border border-[var(--line)] bg-slate-50 p-2 text-xs"><strong className="block text-sm tabular-nums">{count}</strong><span className="text-[11px] text-slate-500">{label}</span></div>;
}

function StepOne({ run, scope, setScope, invalidDates, snapshotting, snapshotDirty, materialSearch, setMaterialSearch, materials, toggleMaterial, previewSnapshot, execute, executing }: {
  run: SkillRun; scope: OrdersFilter; setScope: (value: OrdersFilter) => void; invalidDates: boolean; snapshotting: boolean; snapshotDirty: boolean;
  materialSearch: string; setMaterialSearch: (value: string) => void; materials: CustomerConfig["materialMappings"];
  toggleMaterial: (value: string) => void; previewSnapshot: () => Promise<void>; execute: () => Promise<void>; executing: boolean;
}) {
  return <div><div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-black">Step 1 · 选择并确认数据</h2><p className="mt-1 text-xs text-slate-500">载入快照后先检查客户、物料、日期、数量和预测类型。</p></div>{run.status === "queued" ? <Button variant="primary" disabled={executing || snapshotDirty || !run.input_cell_count || !!run.input_issues.length} onClick={() => void execute()}><Play size={14}/>确认并执行</Button> : <Badge variant="green">不可变执行快照</Badge>}</div>
    {run.status === "queued" && <div className="mb-4 rounded-xl border border-[var(--line)] bg-slate-50 p-4"><div className="grid grid-cols-[minmax(280px,1fr)_minmax(260px,1fr)_auto] items-end gap-3 max-[1100px]:grid-cols-1"><label className="skill-field">日期范围<span className="grid grid-cols-2 gap-2"><Input type="date" value={scope.time_from} onChange={(event) => setScope({ ...scope, time_from: event.target.value })}/><Input type="date" value={scope.time_to} onChange={(event) => setScope({ ...scope, time_to: event.target.value })}/></span>{invalidDates && <small className="text-red-600">开始日期不能晚于结束日期</small>}</label><div className="skill-field"><span>物料（可选）</span><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400"/><Input className="pl-8" value={materialSearch} onChange={(event) => setMaterialSearch(event.target.value)} placeholder="搜索当前客户的有效物料"/></div></div><Button disabled={invalidDates || snapshotting} onClick={() => void previewSnapshot()}>{snapshotting && <LoaderCircle className="animate-spin" size={14}/>}载入选择结果</Button></div><div className="mt-3 flex flex-wrap gap-1">{scope.internal_part_numbers.map((part) => <button key={part} onClick={() => toggleMaterial(part)} className="inline-flex items-center gap-1 rounded-full bg-[var(--forvia-blue-soft)] px-2 py-1 text-[11px] text-[var(--forvia-blue)]">{part}<X size={11}/></button>)}</div>{materialSearch && <div className="mt-2 max-h-36 overflow-auto rounded-lg border border-[var(--line)] bg-white">{materials.map((item) => <button key={item.mappingId} onClick={() => toggleMaterial(item.internalPartNumber)} className="block w-full border-b border-[var(--line)] px-3 py-2 text-left text-xs last:border-0 hover:bg-slate-50"><strong>{item.internalPartNumber}</strong><span className="ml-2 text-slate-500">{item.customerPartNumber}</span></button>)}{!materials.length && <p className="p-3 text-xs text-slate-400">没有匹配的有效物料</p>}</div>}<p className="mt-2 text-[11px] text-slate-500">未选择物料表示全部。修改范围后需重新载入快照。</p></div>}
    {snapshotDirty && run.input_cell_count > 0 && <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">范围已修改，下方仍是上一次快照；请重新载入后再执行。</div>}
    {run.input_issues.length > 0 && <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"><strong>快照存在 {run.input_issues.length} 个阻断问题</strong>{run.input_issues.map((issue, index) => <p key={`${issue.code}-${index}`} className="mt-1">{issue.code} · {issue.message}</p>)}</div>}
    {run.input_cell_count ? <OrdersTable rows={run.input_snapshot}/> : <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-[var(--line)] text-center text-xs text-slate-400"><div><Search className="mx-auto mb-2" size={20}/><strong className="block text-slate-600">尚未载入数据</strong><span>设置范围后点击“载入选择结果”查看完整快照</span></div></div>}
  </div>;
}

function OrdersTable({ rows }: { rows: Array<Record<string, unknown>> }) {
  return <div className="overflow-auto rounded-xl border border-[var(--line)]"><table className="w-full min-w-[980px] text-xs"><thead className="sticky top-0 bg-slate-50"><tr><th className="p-2 text-left font-black">{ordersLabels.customer}</th><th className="p-2 text-left font-black">{ordersLabels.customerPN}</th><th className="p-2 text-left font-black">{ordersLabels.internalPN}</th><th className="p-2 text-left font-black">Date</th><th className="p-2 text-left font-black">{ordersLabels.type}</th><th className="p-2 text-right font-black">Quantity</th><th className="p-2 text-left font-black">修订记录</th></tr></thead><tbody>{rows.map((row) => <SnapshotRow key={`${row.row_key}:${row.col_key}`} row={row}/>)}</tbody></table></div>;
}

function SnapshotRow({ row }: { row: Record<string, unknown> }) {
  const history = Array.isArray(row.revision_history) ? row.revision_history as SnapshotRevision[] : [];
  const revision = typeof row.cell_revision === "number" ? row.cell_revision : 0;
  const hasHistory = revision > 1 || history.some((item) => item.previousValue !== null && item.previousValue !== undefined);
  return <tr className="border-t border-[var(--line)] align-top"><td className="p-2 font-semibold">{displayValue(row.customer_name)}</td><td className="p-2">{displayValue(row.customer_part_number)}</td><td className="p-2">{displayValue(row.internal_part_number)}</td><td className="p-2 tabular-nums">{displayValue(row.date)}</td><td className="p-2"><Badge variant={row.classification === "confirmed" ? undefined : "blue"}>{row.classification === "confirmed" ? "Firm" : "Forecast"}</Badge></td><td className="p-2 text-right font-semibold tabular-nums">{displayQuantity(row.quantity)}</td><td className="p-2"><details className="min-w-44"><summary className="cursor-pointer font-semibold text-[var(--forvia-blue)]">r{revision} · {hasHistory ? "有历史变更" : "初始值"}</summary><div className="mt-2 space-y-2 border-l border-[var(--line)] pl-2">{history.length ? history.map((item, index) => <div key={`${item.revision ?? "revision"}-${index}`} className="leading-4 text-slate-500"><strong className="block text-[var(--ink)]">修订 {item.revision ?? "—"} · {displayQuantity(item.value)}</strong><span>{displayChangedAt(item.changedAt)} · {sourceTypeLabel(item.sourceType)}</span>{item.previousValue !== null && item.previousValue !== undefined && <span className="block">原值 {displayQuantity(item.previousValue)}</span>}</div>) : <span className="text-slate-400">暂无修订明细</span>}</div></details></td></tr>;
}

const phaseOrder: SkillRun["execution_phase"][] = ["snapshot_locked", "building_prompt", "model_running", "parsing_output", "validating_corrections", "completed"];
const phaseLabels: Record<SkillRun["execution_phase"], string> = { waiting_for_snapshot: "等待选择数据", snapshot_locked: "锁定运行快照", building_prompt: "组合 Prompt 与 Skill Spec", model_running: "调用 skill-agent-test", parsing_output: "解析结构化输出", validating_corrections: "校验并生成修正项", completed: "执行完成" };

function ExecutionProgress({ run }: { run: SkillRun }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setElapsed((current) => current + 1), 1000); return () => window.clearInterval(timer); }, []);
  const phase = Math.max(0, phaseOrder.indexOf(run.execution_phase));
  return <div className="min-h-72 rounded-xl border border-[var(--forvia-blue-border)] bg-[var(--forvia-blue-soft)] p-6" role="status" aria-live="polite"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-black text-[var(--forvia-blue)]"><LoaderCircle className="animate-spin" size={18}/>skill-agent-test 正在执行</div><span className="text-[11px] tabular-nums text-slate-500">{elapsed}s / 180s</span></div><div className="mt-6 space-y-4">{phaseOrder.slice(0, -1).map((step, index) => <div key={step} className={`flex items-center gap-3 text-xs ${index <= phase ? "text-[var(--ink)]" : "text-slate-400"}`}><span className={`grid h-6 w-6 place-items-center rounded-full border text-[10px] ${index < phase ? "border-emerald-500 bg-emerald-500 text-white" : index === phase ? "border-[var(--forvia-blue)] bg-white text-[var(--forvia-blue)]" : "border-slate-300"}`}>{index < phase ? <Check size={12}/> : index + 1}</span><span>{phaseLabels[step]}</span></div>)}</div><p className="mt-6 text-[11px] leading-5 text-slate-500">格式校验失败会在三分钟总时限内自动重试；刷新页面会从服务端恢复真实阶段。</p></div>;
}

function CorrectionTable({ corrections, drafts, selected, materials, allowedClassifications, savingId, onDraft, onSave, onToggle }: {
  corrections: SkillCorrection[]; drafts: Record<string, EditDraft>; selected: string[]; materials: CustomerConfig["materialMappings"];
  allowedClassifications: ("forecast" | "confirmed")[]; savingId: string | null;
  onDraft: (id: string, value: Partial<EditDraft>) => void; onSave: (item: SkillCorrection) => Promise<void>; onToggle: (id: string) => void;
}) {
  if (!corrections.length) return <div className="rounded-xl border border-dashed border-[var(--line)] p-8 text-center text-xs text-slate-400">当前筛选没有修正项</div>;
  return <div className="overflow-auto rounded-xl border border-[var(--line)]"><table className="w-full min-w-[1260px] text-xs"><thead className="bg-slate-50"><tr><th className="p-3">选择</th><th className="p-3 text-left">客户</th><th className="p-3 text-left">修改前</th><th className="p-3 text-left">修改后（可编辑）</th><th className="p-3 text-left">校验</th><th className="p-3">操作</th></tr></thead><tbody>{corrections.map((item) => {
    const draft = drafts[item.id] ?? draftFor(item);
    const blocked = item.status !== "valid";
    const hasCollision = item.issues.some((issue) => issue.code === "TARGET_COLLISION") || !!item.collision_resolution;
    const dateType = item.proposal.time_granularity === "day" ? "date" : item.proposal.time_granularity === "week" ? "week" : "month";
    const changes = correctionChangeDetails(item, draft);
    const changed = new Set(changes.map((change) => change.key));
    const material = materials.find((candidate) => candidate.internalPartNumber === draft.internal_part_number && candidate.customerPartNumber === draft.customer_part_number);
    const relocated = !!item.target && (item.target.row_key !== item.source.row_key || item.target.col_key !== item.source.col_key);
    const disabled = item.status === "merged";
    return <tr key={item.id} className={`border-t border-[var(--line)] align-middle ${item.status === "blocked" ? "bg-red-50/40" : item.status === "merged" ? "bg-slate-50 text-slate-500" : ""}`}>
      <td className="p-3 text-center"><input type="checkbox" disabled={blocked} checked={selected.includes(item.id)} onChange={() => onToggle(item.id)}/></td>
      <td className="p-3 font-semibold">{item.proposal.customer_name}</td>
      <td className="p-3"><div className="min-w-56 space-y-1.5">
        <ValueLine label="物料" value={`${item.source.internal_part_number} · ${item.source.customer_part_number || "—"}`}/>
        <ValueLine label="日期" value={item.source.date}/>
        <ValueLine label="数量" value={displayQuantity(item.source.quantity)}/>
        <ValueLine label="类型" value={classificationText(item.source.classification)}/>
        {relocated && <p className="rounded-md bg-amber-50 px-2 py-1 text-[10px] text-amber-800">原位置将恢复为 {displayQuantity(item.source.previous_value)}</p>}
      </div></td>
      <td className="p-3"><div className="min-w-[430px] space-y-2">
        <label className="grid grid-cols-[42px_1fr] items-center gap-2"><span className="text-[11px] text-slate-500">物料</span><select disabled={disabled} className={`skill-select w-full ${changed.has("material") ? "border-blue-300 bg-blue-50" : ""}`} value={material?.mappingId ?? ""} onChange={(event) => {
          const next = materials.find((candidate) => candidate.mappingId === event.target.value);
          if (next) onDraft(item.id, { internal_part_number: next.internalPartNumber, customer_part_number: next.customerPartNumber, collision_resolution: "" });
        }}>{!material && <option value="" disabled>{draft.internal_part_number} · {draft.customer_part_number || "请选择客户料号"}</option>}{materials.map((candidate) => <option key={candidate.mappingId} value={candidate.mappingId}>{candidate.internalPartNumber} · {candidate.customerPartNumber}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-2">
          <label className="grid grid-cols-[42px_1fr] items-center gap-2"><span className="text-[11px] text-slate-500">日期</span><Input disabled={disabled} className={changed.has("date") ? "border-blue-300 bg-blue-50" : ""} type={dateType} value={draft.date} onChange={(event) => onDraft(item.id, { date: event.target.value, collision_resolution: "" })}/></label>
          <label className="grid grid-cols-[42px_1fr] items-center gap-2"><span className="text-[11px] text-slate-500">数量</span><Input disabled={disabled} className={`text-right tabular-nums ${changed.has("quantity") ? "border-blue-300 bg-blue-50" : ""}`} type="number" min={0} step={1} value={draft.quantity} onChange={(event) => onDraft(item.id, { quantity: event.target.value })}/></label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="grid grid-cols-[42px_1fr] items-center gap-2"><span className="text-[11px] text-slate-500">类型</span><select disabled={disabled} className={`skill-select w-full ${changed.has("classification") ? "border-blue-300 bg-blue-50" : ""}`} value={draft.classification} onChange={(event) => onDraft(item.id, { classification: event.target.value as "forecast" | "confirmed" })}>{allowedClassifications.map((kind) => <option key={kind} value={kind}>{classificationText(kind)}</option>)}</select></label>
          {hasCollision && <label className="grid grid-cols-[42px_1fr] items-center gap-2"><span className="text-[11px] text-slate-500">冲突</span><select disabled={disabled} className="skill-select w-full" value={draft.collision_resolution} onChange={(event) => onDraft(item.id, { collision_resolution: event.target.value as CollisionResolution | "" })}><option value="">请选择处理方式</option><option value="replace">覆盖目标</option><option value="increment">累加目标</option></select></label>}
        </div>
        <div className="flex min-h-5 flex-wrap gap-1">{changes.map((change) => <span key={change.key} className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">{change.label}变更</span>)}</div>
      </div></td>
      <td className="max-w-xs p-3">{item.status === "valid" ? <Badge variant="green">可合并</Badge> : item.status === "merged" ? <Badge>已合并</Badge> : <><Badge variant="red">{item.issues.length} 项异常</Badge>{item.issues.map((issue) => <div key={`${item.id}-${issue.code}`} className="mt-1 flex gap-1 text-[10px] leading-4 text-red-700"><AlertTriangle className="mt-0.5 shrink-0" size={11}/><span>{issue.code} · {issue.message}</span></div>)}</>}</td>
      <td className="p-3 text-center"><Button size="sm" disabled={disabled || savingId === item.id} onClick={() => void onSave(item)}>{savingId === item.id ? <LoaderCircle className="animate-spin" size={13}/> : <Save size={13}/>}保存并校验</Button></td>
    </tr>;
  })}</tbody></table></div>;
}

function ValueLine({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-[36px_1fr] gap-2 leading-5"><span className="text-[11px] text-slate-400">{label}</span><strong className="font-medium text-slate-700">{value}</strong></div>;
}
