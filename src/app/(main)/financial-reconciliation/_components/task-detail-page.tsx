"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, LoaderCircle, LockKeyhole, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCustomerConfig } from "../../_components/shared";
import {
  closeReconciliationTask,
  bulkConfirmReconciliationMatches,
  getReconciliationMatchSummary,
  getReconciliationTask,
  listReceiptRecords,
  listReconciliationMatches,
  listShipmentRecords,
  regenerateReconciliationMatches,
  startReconciliationTask,
  type CommitPreviewRow,
  type MatchGroup,
  type MatchSummary,
  type ReceiptRecord,
  type ReconciliationMatch,
  type ReconciliationTask,
  type ShipmentRecord,
} from "@/services/reconciliation";
import { buildCommitPreviewRows } from "@/lib/transforms/reconciliation";
import { CommitPreviewStep } from "./commit-preview-step";
import { MatchConfirmationStep } from "./match-confirmation-step";
import { TaskCompleteStep } from "./task-complete-step";
import { formatDateTime } from "./reconciliation-utils";

type StepKey = "match" | "preview" | "complete";
type MatchWorkState = "starting" | "regenerating" | "loading" | null;
const POOL_PAGE_SIZE = 100;
const OPEN_RECORD_STATUSES = new Set(["unmatched", "partial"]);
const RECORDS_COMMITTED_TASK_STATUSES = new Set(["closed"]);

function matchIsHighConfidenceNoDiff(match: ReconciliationMatch) {
  return (
    match.status === "candidate"
    && Boolean(match.receiptRecordId)
    && (match.differenceQty ?? Number.NaN) === 0
    && (match.confidenceScore ?? 0) >= 0.9
  );
}

async function listAllShipmentRecords(task: ReconciliationTask, customers: Parameters<typeof listShipmentRecords>[1]) {
  const records: ShipmentRecord[] = [];
  let total = 0;
  let page = 1;
  const includeCommittedRecords = RECORDS_COMMITTED_TASK_STATUSES.has(task.status);
  do {
    const response = await listShipmentRecords({
      page,
      size: POOL_PAGE_SIZE,
      customerId: task.customerId,
      taskId: task.id,
    }, customers);
    records.push(...response.records.filter((record) => (
      includeCommittedRecords || OPEN_RECORD_STATUSES.has(record.reconciliationStatus)
    )));
    total = response.total;
    if (response.records.length === 0) break;
    page += 1;
  } while (records.length < total);
  return records;
}

async function listAllReceiptRecords(task: ReconciliationTask, customers: Parameters<typeof listReceiptRecords>[1]) {
  const records: ReceiptRecord[] = [];
  let total = 0;
  let page = 1;
  const includeCommittedRecords = RECORDS_COMMITTED_TASK_STATUSES.has(task.status);
  do {
    const response = await listReceiptRecords({
      page,
      size: POOL_PAGE_SIZE,
      customerId: task.customerId,
      taskId: task.id,
      dateFrom: task.periodFrom,
      dateTo: task.periodTo,
    }, customers);
    records.push(...response.records.filter((record) => (
      includeCommittedRecords || OPEN_RECORD_STATUSES.has(record.reconciliationStatus)
    )));
    total = response.total;
    if (response.records.length === 0) break;
    page += 1;
  } while (records.length < total);
  return records;
}

export function TaskDetailPage({ taskId }: { taskId: string }) {
  const { customers, loading: loadingCustomers } = useCustomerConfig();
  const [task, setTask] = useState<ReconciliationTask | null>(null);
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [groups, setGroups] = useState<MatchGroup[]>([]);
  const [summary, setSummary] = useState<MatchSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchWorkState, setMatchWorkState] = useState<MatchWorkState>(null);
  const [closing, setClosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [bulkConfirming, setBulkConfirming] = useState(false);
  const [step, setStep] = useState<StepKey>("match");
  const [reloadKey, setReloadKey] = useState(0);
  const skipNextAutoMatchLoad = useRef(false);

  const previewRows: CommitPreviewRow[] = useMemo(
    () => buildCommitPreviewRows(shipments, receipts, summary, task?.status === "closed", groups),
    [groups, receipts, shipments, summary, task?.status],
  );
  const highConfidenceNoDiffCandidateIds = useMemo(
    () => groups
      .flatMap((group) => group.matches)
      .filter(matchIsHighConfidenceNoDiff)
      .map((match) => match.id),
    [groups],
  );
  const actionBusy = busy || bulkConfirming || closing;
  const canCloseTask = Boolean(task && !task.isTransitioning && task.status === "in_progress" && (summary?.confirmedCount ?? 0) > 0);

  const loadTask = useCallback(async () => {
    if (loadingCustomers) return;
    setLoading(true);
    try {
      const loadedTask = await getReconciliationTask(taskId, customers);
      setTask(loadedTask);
    } catch (error) {
      setTask(null);
      console.error("Failed to load reconciliation task", error);
      toast.error(error instanceof Error ? `加载对账任务失败：${error.message}` : "加载对账任务失败");
    } finally {
      setLoading(false);
    }
  }, [customers, loadingCustomers, taskId]);

  const loadPoolsAndMatches = useCallback(async (
    currentTask: ReconciliationTask,
    workState: MatchWorkState = "loading",
  ) => {
    setMatchLoading(true);
    setMatchWorkState(workState);
    try {
      const [shipmentResult, receiptResult, matchSummary] = await Promise.all([
        listAllShipmentRecords(currentTask, customers),
        listAllReceiptRecords(currentTask, customers),
        getReconciliationMatchSummary(currentTask.id),
      ]);
      setShipments(shipmentResult);
      setReceipts(receiptResult);
      setSummary(matchSummary);
      const matchList = await listReconciliationMatches({
        taskId: currentTask.id,
        shipments: shipmentResult,
        receipts: receiptResult,
      });
      setGroups(matchList.groups);
    } catch (error) {
      console.error("Failed to load reconciliation match details", error);
      setGroups([]);
      setSummary(null);
      toast.error(error instanceof Error ? `加载匹配明细失败：${error.message}` : "加载匹配明细失败");
    } finally {
      setMatchLoading(false);
      setMatchWorkState(null);
    }
  }, [customers]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadTask(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadTask, reloadKey]);

  useEffect(() => {
    if (!task) return;
    if (skipNextAutoMatchLoad.current) {
      skipNextAutoMatchLoad.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void loadPoolsAndMatches(task);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadPoolsAndMatches, task]);

  async function handleStart() {
    if (!task) return;
    setBusy(true);
    setMatchLoading(true);
    setMatchWorkState("starting");
    setStep("match");
    try {
      const updated = await startReconciliationTask(task.id, customers);
      toast.success("任务已开始并生成匹配候选");
      skipNextAutoMatchLoad.current = true;
      setTask(updated);
      await loadPoolsAndMatches(updated, "starting");
    } catch {
      toast.error("开始任务失败");
      setMatchLoading(false);
      setMatchWorkState(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleRegenerate() {
    if (!task) return;
    setBusy(true);
    setMatchLoading(true);
    setMatchWorkState("regenerating");
    setStep("match");
    try {
      await regenerateReconciliationMatches(task.id);
      toast.success("匹配候选已重新生成");
      await loadPoolsAndMatches(task, "regenerating");
    } catch {
      toast.error("重新生成匹配失败");
      setMatchLoading(false);
      setMatchWorkState(null);
    } finally {
      setBusy(false);
    }
  }

  async function handleBulkConfirm() {
    if (!task || highConfidenceNoDiffCandidateIds.length === 0) return;
    setBulkConfirming(true);
    try {
      const result = await bulkConfirmReconciliationMatches(task.id, highConfidenceNoDiffCandidateIds);
      toast.success(`已批量确认 ${result.confirmed} 条可确认候选`);
      await loadPoolsAndMatches(task);
    } catch {
      toast.error("批量确认失败");
    } finally {
      setBulkConfirming(false);
    }
  }

  async function handleCloseTask() {
    if (!task) return;
    setClosing(true);
    try {
      await closeReconciliationTask(task.id);
      toast.success("任务已关闭，记录状态已写回");
      setReloadKey((value) => value + 1);
      setStep("complete");
    } catch {
      toast.error("关闭任务失败，请确认仍有未处理差异或后端校验错误");
    } finally {
      setClosing(false);
    }
  }

  return (
    <section className="panel scroll-panel screen-fill recon-page">
      <div className="panel-head">
        <h2 className="panel-title">
          <Link className="recon-back-link" href="/financial-reconciliation/tasks">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <span className="recon-title-inline">
            <span>{task?.taskNo ?? "任务详情"}</span>
            {task ? <small>{task.customerName} · {task.periodLabel}</small> : null}
          </span>
        </h2>
        {task ? (
          <div className="recon-detail-actions list-actions">
            <Button variant="default" size="sm" disabled={actionBusy} onClick={() => setReloadKey((value) => value + 1)}>
              <RefreshCw className="h-3.5 w-3.5" /> 刷新
            </Button>
            <Button variant="default" size="sm" disabled={!task || task.isTransitioning || actionBusy || task.status !== "in_progress"} onClick={handleRegenerate}>
              {busy && matchWorkState === "regenerating" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              重新生成
            </Button>
            <Button variant="primary" size="sm" disabled={!task || task.isTransitioning || actionBusy || task.status !== "draft"} onClick={handleStart}>
              {busy && matchWorkState === "starting" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              {busy && matchWorkState === "starting" ? "正在开始" : "开始任务"}
            </Button>
            {step === "match" ? (
              <Button variant="primary" size="sm" disabled={!task || task.isTransitioning || busy || bulkConfirming || matchLoading || task.status !== "in_progress" || highConfidenceNoDiffCandidateIds.length === 0} onClick={handleBulkConfirm}>
                {bulkConfirming ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                批量确认一致项
              </Button>
            ) : null}
            {step === "preview" ? (
              <Button variant="primary" size="sm" disabled={!canCloseTask || closing} onClick={handleCloseTask}>
                {closing ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <LockKeyhole className="h-3.5 w-3.5" />}
                {closing ? "关闭中" : "关闭任务并写回"}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="panel-body recon-body">
        {loading ? <div className="recon-state inline"><LoaderCircle className="h-4 w-4 animate-spin" /> 加载任务...</div> : null}
        {task ? (
          <>
            <div className="recon-step-bar">
              <div className="recon-step-tabs">
                <button className={step === "match" ? "active" : ""} onClick={() => setStep("match")}>1 匹配确认</button>
                <button className={step === "preview" ? "active" : ""} onClick={() => setStep("preview")}>2 写回预览</button>
                <button className={step === "complete" ? "active" : ""} onClick={() => setStep("complete")}>3 完成输出</button>
              </div>
              <div className="recon-detail-meta">
                <span className="task-status-cell">
                  <Badge variant={task.statusVariant}>{task.statusLabel}</Badge>
                  {task.isTransitioning ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-label="任务处理中" /> : null}
                </span>
                <span>更新：{formatDateTime(task.updatedAt ?? task.createdAt)}</span>
              </div>
            </div>
            {step === "match" ? (
              <MatchConfirmationStep
                task={task}
                groups={groups}
                loading={matchLoading}
                loadingState={matchWorkState}
                onChanged={() => { void loadPoolsAndMatches(task); }}
              />
            ) : null}
            {step === "preview" ? (
              <CommitPreviewStep
                summary={summary}
                rows={previewRows}
              />
            ) : null}
            {step === "complete" ? <TaskCompleteStep task={task} /> : null}
          </>
        ) : null}
      </div>
    </section>
  );
}
