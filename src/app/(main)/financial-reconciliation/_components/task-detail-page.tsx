"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, LoaderCircle, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCustomerConfig } from "../../_components/shared";
import {
  closeReconciliationTask,
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
import { MatchAdjustSheet } from "./match-adjust-sheet";
import { MatchConfirmationStep } from "./match-confirmation-step";
import { TaskCompleteStep } from "./task-complete-step";
import { formatDateTime } from "./reconciliation-utils";

type StepKey = "match" | "preview" | "complete";

export function TaskDetailPage({ taskId }: { taskId: string }) {
  const { customers, loading: loadingCustomers } = useCustomerConfig();
  const [task, setTask] = useState<ReconciliationTask | null>(null);
  const [shipments, setShipments] = useState<ShipmentRecord[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [groups, setGroups] = useState<MatchGroup[]>([]);
  const [summary, setSummary] = useState<MatchSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [matchLoading, setMatchLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<StepKey>("match");
  const [adjustingMatch, setAdjustingMatch] = useState<ReconciliationMatch | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const previewRows: CommitPreviewRow[] = useMemo(
    () => buildCommitPreviewRows(shipments, receipts, summary),
    [receipts, shipments, summary],
  );

  const loadTask = useCallback(async () => {
    if (loadingCustomers) return;
    setLoading(true);
    try {
      const loadedTask = await getReconciliationTask(taskId, customers);
      setTask(loadedTask);
    } catch {
      setTask(null);
      toast.error("加载对账任务失败");
    } finally {
      setLoading(false);
    }
  }, [customers, loadingCustomers, taskId]);

  const loadPoolsAndMatches = useCallback(async (currentTask: ReconciliationTask) => {
    setMatchLoading(true);
    try {
      const [shipmentResult, receiptResult, matchSummary] = await Promise.all([
        listShipmentRecords({ page: 1, size: 100, customerId: currentTask.customerId }, customers),
        listReceiptRecords({
          page: 1,
          size: 100,
          customerId: currentTask.customerId,
          dateFrom: currentTask.periodFrom,
          dateTo: currentTask.periodTo,
        }, customers),
        getReconciliationMatchSummary(currentTask.id),
      ]);
      setShipments(shipmentResult.records);
      setReceipts(receiptResult.records);
      setSummary(matchSummary);
      const matchList = await listReconciliationMatches({
        taskId: currentTask.id,
        shipments: shipmentResult.records,
        receipts: receiptResult.records,
      });
      setGroups(matchList.groups);
    } catch {
      setGroups([]);
      setSummary(null);
      toast.error("加载匹配明细失败");
    } finally {
      setMatchLoading(false);
    }
  }, [customers]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadTask(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadTask, reloadKey]);

  useEffect(() => {
    if (!task) return;
    const timer = window.setTimeout(() => {
      void loadPoolsAndMatches(task);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadPoolsAndMatches, task]);

  async function handleStart() {
    if (!task) return;
    setBusy(true);
    try {
      const updated = await startReconciliationTask(task.id, customers);
      toast.success("任务已开始并生成匹配候选");
      setTask(updated);
      await loadPoolsAndMatches(updated);
    } catch {
      toast.error("开始任务失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleRegenerate() {
    if (!task) return;
    setBusy(true);
    try {
      await regenerateReconciliationMatches(task.id);
      toast.success("匹配候选已重新生成");
      await loadPoolsAndMatches(task);
    } catch {
      toast.error("重新生成匹配失败");
    } finally {
      setBusy(false);
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
          任务详情
        </h2>
        <div className="list-actions">
          <Button variant="default" size="sm" disabled={busy} onClick={() => setReloadKey((value) => value + 1)}>
            <RefreshCw className="h-3.5 w-3.5" /> 刷新
          </Button>
          <Button variant="default" size="sm" disabled={!task || busy || task.status === "closed"} onClick={handleRegenerate}>
            <RefreshCw className="h-3.5 w-3.5" /> 重新生成
          </Button>
          <Button variant="primary" size="sm" disabled={!task || busy || task.status !== "draft"} onClick={handleStart}>
            <Play className="h-3.5 w-3.5" /> 开始任务
          </Button>
        </div>
      </div>
      <div className="panel-body recon-body">
        {loading ? <div className="recon-state inline"><LoaderCircle className="h-4 w-4 animate-spin" /> 加载任务...</div> : null}
        {task ? (
          <>
            <div className="recon-detail-head">
              <div>
                <p className="eyebrow">Financial Reconciliation</p>
                <h1>{task.taskNo}</h1>
                <p className="subtitle">{task.customerName} · {task.periodLabel}</p>
              </div>
              <div className="recon-detail-meta">
                <Badge variant={task.statusVariant}>{task.statusLabel}</Badge>
                <span>更新：{formatDateTime(task.updatedAt ?? task.createdAt)}</span>
              </div>
            </div>
            <div className="recon-step-tabs">
              <button className={step === "match" ? "active" : ""} onClick={() => setStep("match")}>1 匹配确认</button>
              <button className={step === "preview" ? "active" : ""} onClick={() => setStep("preview")}>2 提交预览</button>
              <button className={step === "complete" ? "active" : ""} onClick={() => setStep("complete")}>3 完成输出</button>
            </div>
            {step === "match" ? (
              <MatchConfirmationStep
                task={task}
                groups={groups}
                loading={matchLoading}
                onAdjust={setAdjustingMatch}
                onChanged={() => { void loadPoolsAndMatches(task); }}
              />
            ) : null}
            {step === "preview" ? (
              <CommitPreviewStep
                summary={summary}
                rows={previewRows}
                closing={closing}
                disabled={task.status === "closed" || summary?.confirmedCount === 0}
                onCloseTask={() => { void handleCloseTask(); }}
              />
            ) : null}
            {step === "complete" ? <TaskCompleteStep task={task} /> : null}
          </>
        ) : null}
      </div>
      <MatchAdjustSheet
        taskId={taskId}
        match={adjustingMatch}
        onOpenChange={(open) => { if (!open) setAdjustingMatch(null); }}
        onSaved={() => { if (task) void loadPoolsAndMatches(task); }}
      />
    </section>
  );
}
