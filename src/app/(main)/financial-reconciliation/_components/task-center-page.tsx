"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, Eye, FileX, LoaderCircle, Play, Plus, RefreshCcw, RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { FilterSelect, SearchableFilterSelect } from "@/components/ui/select";
import { useCustomerConfig } from "../../_components/shared";
import {
  cancelReconciliationTask,
  listReconciliationTasks,
  regenerateReconciliationMatches,
  reopenReconciliationTask,
  startReconciliationTask,
  voidReconciliationTask,
  type ReconciliationTask,
} from "@/services/reconciliation";
import { customerOptions, formatDateTime, PAGE_SIZE } from "./reconciliation-utils";
import { taskStatusOptions } from "./reconciliation-types";
import { ReconciliationPagination } from "./reconciliation-pagination";
import { TaskCreateSheet } from "./task-create-sheet";

const TASK_STATUS_PRIORITY: Record<string, number> = {
  draft: 0,
  in_progress: 0,
  closed: 1,
  cancelled: 2,
  voided: 2,
};

function taskTimestamp(task: ReconciliationTask): number {
  const value = task.updatedAt ?? task.createdAt;
  return value ? Date.parse(value) || 0 : 0;
}

function sortTasksForDisplay(tasks: ReconciliationTask[]): ReconciliationTask[] {
  return [...tasks].sort((left, right) => {
    const priorityDifference = (TASK_STATUS_PRIORITY[left.status] ?? 1) - (TASK_STATUS_PRIORITY[right.status] ?? 1);
    if (priorityDifference !== 0) return priorityDifference;
    return taskTimestamp(right) - taskTimestamp(left);
  });
}

export function TaskCenterPage() {
  const { customers, loading: loadingCustomers } = useCustomerConfig();
  const [customerId, setCustomerId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [tasks, setTasks] = useState<ReconciliationTask[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const options = useMemo(() => customerOptions(customers), [customers]);

  const loadTasks = useCallback(async () => {
    if (loadingCustomers) return;
    setLoading(true);
    try {
      const response = await listReconciliationTasks({
        page,
        size: PAGE_SIZE,
        customerId: customerId || undefined,
        status: status || undefined,
      }, customers);
      // Keep the current page correctly grouped even while an older backend
      // process is still serving its previous created-at ordering.
      setTasks(sortTasksForDisplay(response.tasks));
      setTotal(response.total);
    } catch {
      setTasks([]);
      setTotal(0);
      toast.error("加载对账任务失败");
    } finally {
      setLoading(false);
    }
  }, [customerId, customers, loadingCustomers, page, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadTasks(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadTasks, reloadKey]);

  async function runAction(task: ReconciliationTask, action: "start" | "regenerate" | "reopen" | "cancel" | "void") {
    setBusyId(task.id);
    try {
      if (action === "start") await startReconciliationTask(task.id, customers);
      if (action === "regenerate") await regenerateReconciliationMatches(task.id);
      if (action === "reopen") await reopenReconciliationTask(task.id, customers);
      if (action === "cancel") await cancelReconciliationTask(task.id, customers);
      if (action === "void") await voidReconciliationTask(task.id, "由前端任务中心作废", customers);
      toast.success(action === "regenerate" ? "重新对账已完成" : "任务状态已更新");
      setReloadKey((value) => value + 1);
    } catch {
      toast.error(action === "regenerate" ? "重新对账失败" : "任务操作失败");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="panel scroll-panel screen-fill recon-page">
      <div className="panel-head">
        <h2 className="panel-title">对账任务中心</h2>
        <div className="list-actions">
          <Button variant="default" size="sm" onClick={() => setReloadKey((value) => value + 1)}>
            <RefreshCw className="h-3.5 w-3.5" /> 刷新
          </Button>
          <Button variant="primary" size="sm" onClick={() => setSheetOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> 新增任务
          </Button>
        </div>
      </div>
      <div className="panel-body recon-body">
        <div className="task-center-toolbar">
          <SearchableFilterSelect label="客户" value={customerId} options={options} onChange={(value) => { setCustomerId(value); setPage(1); }} />
          <FilterSelect label="任务状态" value={status} options={taskStatusOptions} onChange={(value) => { setStatus(value); setPage(1); }} />
        </div>
        <div className="scroll-x recon-table-wrap">
          <table className="table recon-table task-center-table">
            <thead>
              <tr>
                <th>任务号</th>
                <th>客户</th>
                <th>对账起始日</th>
                <th>对账结束日</th>
                <th className="num">总数量</th>
                <th className="num">一致数量</th>
                <th className="num">异常数量</th>
                <th>对账状态</th>
                <th>更新时间</th>
                <th className="recon-actions-col">操作</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td className="font-black">{task.taskNo}</td>
                  <td>{task.customerName}</td>
                  <td>{task.periodFrom}</td>
                  <td>{task.periodTo}</td>
                  <td className="num">{task.totalRecordCount}</td>
                  <td className="num">{task.matchedRecordCount}</td>
                  <td className="num">{task.exceptionRecordCount}</td>
                  <td>
                    <span className="task-status-cell">
                      <Badge variant={task.statusVariant}>{task.statusLabel}</Badge>
                      {task.isTransitioning ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-label="任务处理中" /> : null}
                    </span>
                  </td>
                  <td>{formatDateTime(task.updatedAt ?? task.createdAt)}</td>
                  <td>
                    <div className="recon-row-actions task-center-actions">
                      <Link
                        className={`${buttonVariants({ variant: "default", size: "icon-sm" })} recon-action-link`}
                        href={`/financial-reconciliation/tasks/${task.id}`}
                        title="查看详情"
                        aria-label={`查看任务 ${task.taskNo}`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                      {task.status === "draft" && !task.isTransitioning ? (
                        <Button size="icon-sm" title="开始对账" aria-label={`开始对账任务 ${task.taskNo}`} disabled={busyId === task.id} onClick={() => { void runAction(task, "start"); }}>
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      {task.status === "closed" && !task.isTransitioning ? (
                        <Button size="icon-sm" title="重开任务" aria-label={`重开任务 ${task.taskNo}`} disabled={busyId === task.id} onClick={() => { void runAction(task, "reopen"); }}>
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      {task.status === "in_progress" && !task.isTransitioning ? (
                        <Button size="icon-sm" title="重新对账" aria-label={`重新对账任务 ${task.taskNo}`} disabled={busyId === task.id} onClick={() => { void runAction(task, "regenerate"); }}>
                          <RefreshCcw className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      {(task.status === "draft" || task.status === "in_progress") && !task.isTransitioning ? (
                        <Button variant="destructive" size="icon-sm" title="取消任务" aria-label={`取消任务 ${task.taskNo}`} disabled={busyId === task.id} onClick={() => { void runAction(task, "cancel"); }}>
                          <Ban className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      {task.status === "closed" && !task.isTransitioning ? (
                        <Button variant="destructive" size="icon-sm" title="作废任务" aria-label={`作废任务 ${task.taskNo}`} disabled={busyId === task.id} onClick={() => { void runAction(task, "void"); }}>
                          <FileX className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loading ? (
            <div className="recon-state"><LoaderCircle className="h-4 w-4 animate-spin" /> 加载任务...</div>
          ) : null}
          {!loading && tasks.length === 0 ? (
            <div className="recon-state">暂无对账任务</div>
          ) : null}
        </div>

        <ReconciliationPagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
      </div>
      <TaskCreateSheet
        open={sheetOpen}
        customers={customers}
        onOpenChange={setSheetOpen}
        onCreated={() => {
          setPage(1);
          setReloadKey((value) => value + 1);
        }}
      />
    </section>
  );
}
