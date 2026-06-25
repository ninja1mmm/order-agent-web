"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { FileSearch, LoaderCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterSelect } from "@/components/ui/select";
import {
  type Locale,
  copy,
  backendDateMs,
  customerLabel,
  customerLabelFromId,
  formatDateTime,
  taskStatusLabel,
  useCustomerConfig,
  useWorkspacePolling,
} from "./shared";
import { PdfViewer, ExcelViewer } from "./components";

const DEFAULT_STATUS_FILTER = "__active__";
const DEFAULT_VISIBLE_STATUSES = new Set(["queued", "pending", "running", "processing", "waiting_human_decision"]);
type StatusBadgeVariant = "green" | "amber" | "red" | "slate";

function isExcelFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".xlsx") || lower.endsWith(".xlsm") || lower.endsWith(".xls");
}

function taskTime(value: string | null | undefined): number {
  return backendDateMs(value);
}

function statusFilterFromParam(status: string | null) {
  if (!status) return DEFAULT_STATUS_FILTER;
  if (status === "processing") return "running";
  if (status === "published") return "completed";
  return status;
}

function statusBadgeVariant(status: string): StatusBadgeVariant {
  if (status === "completed" || status === "published") return "green";
  if (status === "running" || status === "processing" || status === "waiting_human_decision") return "amber";
  if (status === "failed" || status === "cancelled") return "red";
  return "slate";
}

function resultTabForTask(taskType: string | undefined): "forecast" | "shipping" {
  return taskType === "extract_forecast" ? "forecast" : "shipping";
}

export function LiveParseReview({ locale }: { locale: Locale }) {
  const params = useSearchParams();
  const { tasks, mails, refresh } = useWorkspacePolling();
  const { customers } = useCustomerConfig();
  const t = copy[locale];
  const targetTaskId = params.get("taskId");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [hasUserSelected, setHasUserSelected] = useState(false);
  const [statusFilter, setStatusFilter] = useState(() => statusFilterFromParam(params.get("status")));
  const [timeFilter, setTimeFilter] = useState("最近 30 天");
  const [customerFilter, setCustomerFilter] = useState("__all__");
  const [referenceTime] = useState(() => Date.now());
  const effectiveTaskId = hasUserSelected ? selectedTaskId : (targetTaskId ?? selectedTaskId);

  const taskCustomers = useMemo(
    () => [
      { value: "__all__", label: t.all },
      ...customers.map((customer) => ({ value: customer.id, label: customerLabel(customer) })),
    ],
    [customers, t.all],
  );
  const statusOptions = useMemo(
    () => [
      { value: DEFAULT_STATUS_FILTER, label: t.all },
      { value: "queued", label: taskStatusLabel("queued", locale) },
      { value: "running", label: taskStatusLabel("running", locale) },
      { value: "waiting_human_decision", label: taskStatusLabel("waiting_human_decision", locale) },
      { value: "completed", label: taskStatusLabel("completed", locale) },
      { value: "failed", label: taskStatusLabel("failed", locale) },
      { value: "cancelled", label: taskStatusLabel("cancelled", locale) },
    ],
    [locale, t.all],
  );

  const filteredTasks = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000;
    const timeLimit =
      timeFilter === "今天"
        ? dayMs
        : timeFilter === "最近 7 天"
          ? 7 * dayMs
          : timeFilter === "最近 60 天"
            ? 60 * dayMs
            : 30 * dayMs;
    return tasks
      .filter((task) => {
        if (task.status === "skipped") return false;
        if (customerFilter !== "__all__" && task.customerId !== customerFilter) return false;
        if (statusFilter === DEFAULT_STATUS_FILTER) {
          if (!DEFAULT_VISIBLE_STATUSES.has(task.status)) return false;
        } else if (statusFilter === "running") {
          if (task.status !== "running" && task.status !== "processing") return false;
        } else if (task.status !== statusFilter) {
          return false;
        }
        if (task.receivedAt && referenceTime - backendDateMs(task.receivedAt) > timeLimit) return false;
        return true;
      })
      .sort((a, b) => {
        const taskTimeDelta = taskTime(b.requestedAt) - taskTime(a.requestedAt);
        if (taskTimeDelta !== 0) return taskTimeDelta;
        return taskTime(b.receivedAt) - taskTime(a.receivedAt);
      });
  }, [customerFilter, referenceTime, statusFilter, tasks, timeFilter]);
  const selectedTask =
    filteredTasks.find((task) => task.id === effectiveTaskId) ??
    (!hasUserSelected && targetTaskId ? tasks.find((task) => task.id === targetTaskId) : undefined) ??
    filteredTasks[0];
  const selectedMail = mails.find((mail) => mail.id === selectedTask?.mailMessageId);
  const selectedAttachment = selectedMail?.attachments.find((a) => a.attachmentId === selectedTask?.attachmentId);
  const rows = Object.values(selectedTask?.resultRows ?? {});
  const agentSteps = selectedTask?.agentSummary ?? [];
  const isTaskRunning = selectedTask?.status === "running" || selectedTask?.status === "processing";
  const isTaskCompleted = selectedTask?.status === "completed" || selectedTask?.status === "published";
  const resultHref = (() => {
    if (!selectedTask || !isTaskCompleted) return "";
    const resultParams = new URLSearchParams();
    const lang = params.get("lang");
    if (lang) resultParams.set("lang", lang);
    resultParams.set("tab", resultTabForTask(selectedTask.taskType));
    resultParams.set("sourceTaskId", selectedTask.id);
    if (selectedAttachment?.fileName) resultParams.set("sourceFile", selectedAttachment.fileName);
    return `/orders?${resultParams.toString()}`;
  })();

  return (
    <>
      <div className="subnav">
        <Link href="/task-workbench">{t.inbox}</Link>
        <Link className="active" href="/parse-review">
          {t.parse}
        </Link>
        <Link href="/orders">{t.order}</Link>
      </div>
      <div className="grid-3 screen-fill">
        <aside className="panel scroll-panel">
          <div className="panel-head">
            <h2 className="panel-title">{t.attachmentTasks}</h2>
            <Button variant="ghost" size="icon" aria-label={t.refresh} onClick={refresh}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="panel-body stack">
            <div className="filter-bar" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
              <FilterSelect label={t.filterCustomer} value={customerFilter} options={taskCustomers} onChange={setCustomerFilter} />
              <FilterSelect
                label={t.filterStatus}
                value={statusFilter}
                options={statusOptions}
                onChange={setStatusFilter}
              />
              <FilterSelect
                label={t.filterTime}
                value={timeFilter}
                options={["今天", "最近 7 天", "最近 30 天", "最近 60 天"]}
                onChange={setTimeFilter}
              />
            </div>
            {filteredTasks.map((task) => (
              <button
                type="button"
                key={task.id}
                className={`list-item ${task.id === selectedTask?.id ? "selected" : ""}`}
                onClick={() => { setSelectedTaskId(task.id); setHasUserSelected(true); }}
              >
                <p className="item-title task-filename" title={task.attachmentFileName ?? task.id}>{task.attachmentFileName ?? task.id}</p>
                <p className="item-meta task-status-desc">
                  {customerLabelFromId(customers, task.customerId, task.customerName)} · {t.receivedAt} {formatDateTime(task.receivedAt ?? task.mailCreatedAt, locale)} ·{" "}
                  {taskStatusLabel(task.status, locale)}
                </p>
              </button>
            ))}
          </div>
        </aside>
        <section className="panel scroll-panel">
          <div className="panel-head">
            <h2 className="panel-title truncate" title={selectedAttachment?.fileName}>{selectedAttachment?.fileName ?? t.attachmentPreview}</h2>
            <Badge variant="slate">{t.readonly}</Badge>
          </div>
          <div className="panel-body stack">
            {selectedAttachment?.fileArtifactId ? (
              isExcelFile(selectedAttachment.fileName)
                ? <ExcelViewer fileArtifactId={selectedAttachment.fileArtifactId} locale={locale} />
                : <PdfViewer fileArtifactId={selectedAttachment.fileArtifactId} fileName={selectedAttachment.fileName} locale={locale} />
            ) : (
              <p className="item-meta">{t.noAttachment}</p>
            )}
            {rows.length > 0 ? (
              <div className="scroll-x">
                {selectedTask?.taskType === "extract_forecast" ? (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Material Number</th>
                        <th>Designation</th>
                        <th>Week</th>
                        <th>Quantity</th>
                        <th>Sched. Agreement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => (
                        <tr key={idx}>
                          <td>{String(row.materialNumber ?? "")}</td>
                          <td>{String(row.designation ?? "")}</td>
                          <td>{String(row.weekKey ?? "")}</td>
                          <td>{String(row.quantity ?? "")}</td>
                          <td>{String(row.scheduleAgreement ?? "")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="table">
                    <thead>
                      <tr>
                        <th>materialNumber</th>
                        <th>designation</th>
                        <th>shippingDate</th>
                        <th>actualQty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, idx) => (
                        <tr key={idx}>
                          <td>{String(row.materialNumber ?? "")}</td>
                          <td>{String(row.designation ?? "")}</td>
                          <td>{String(row.shippingDate ?? "")}</td>
                          <td>{String(row.actualQty ?? "")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ) : null}
          </div>
        </section>
        <aside className="panel scroll-panel">
          <div className="panel-head">
            <h2 className="panel-title">{t.agentFlow}</h2>
            {selectedTask ? (
              <Badge variant={statusBadgeVariant(selectedTask.status)} className={isTaskRunning ? "agent-running-badge" : ""}>
                {taskStatusLabel(selectedTask.status, locale)}
              </Badge>
            ) : null}
          </div>
          <div className="panel-body stack timeline">
            {agentSteps.length > 0 ? (
              agentSteps.map((step, idx) => (
                <div className="step" key={`${step.title}-${idx}`}>
                  <div className="step-title">
                    {step.status === "running" ? <LoaderCircle className="step-spinner" aria-hidden="true" /> : null}
                    {step.title}
                    {step.status === "completed" ? (
                      <Badge variant="slate" style={{ marginLeft: 6 }}>done</Badge>
                    ) : step.status === "failed" ? (
                      <Badge variant="red" style={{ marginLeft: 6 }}>failed</Badge>
                    ) : step.status === "warning" ? (
                      <Badge variant="amber" style={{ marginLeft: 6 }}>warn</Badge>
                    ) : null}
                  </div>
                  <div className="step-meta">{step.description}</div>
                  {idx === agentSteps.length - 1 && isTaskRunning ? (
                    <div className="step-loading-row" role="status" aria-live="polite">
                      <LoaderCircle className="step-spinner" aria-hidden="true" />
                      <span>{taskStatusLabel(selectedTask.status, locale)}</span>
                    </div>
                  ) : null}
                  {idx === agentSteps.length - 1 && resultHref ? (
                    <div className="result-actions">
                      <Link className="btn small agent-result-link" href={resultHref}>
                        <FileSearch className="h-3.5 w-3.5" />
                        {t.viewResult}
                      </Link>
                    </div>
                  ) : null}
                </div>
              ))
            ) : selectedTask && isTaskRunning ? (
              <div className="step">
                <div className="step-title">
                  <LoaderCircle className="step-spinner" aria-hidden="true" />
                  Agent 正在执行
                </div>
                <div className="step-meta">正在等待解析步骤回传...</div>
              </div>
            ) : selectedTask ? (
              <p className="item-meta">暂无执行流数据</p>
            ) : null}
          </div>
        </aside>
      </div>
    </>
  );
}
