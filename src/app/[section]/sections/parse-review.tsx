"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterSelect } from "@/components/ui/select";
import { type Locale, copy, formatDateTime, taskStatusLabel, useWorkspacePolling } from "./shared";
import { PdfViewer } from "./components";

export function LiveParseReview({ locale }: { locale: Locale }) {
  const params = useSearchParams();
  const { tasks, mails, refresh } = useWorkspacePolling();
  const t = copy[locale];
  const targetTaskId = params.get("taskId");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [hasUserSelected, setHasUserSelected] = useState(false);
  const [statusFilter, setStatusFilter] = useState("全部");
  const [timeFilter, setTimeFilter] = useState("最近 30 天");
  const [customerFilter, setCustomerFilter] = useState("全部");
  const [referenceTime] = useState(() => Date.now());
  const effectiveTaskId = hasUserSelected ? selectedTaskId : (targetTaskId ?? selectedTaskId);
  const selectedTask = tasks.find((task) => task.task_id === effectiveTaskId) ?? tasks[0];

  const taskCustomers = useMemo(
    () => ["全部", ...Array.from(new Set(tasks.map((task) => task.customer_name).filter(Boolean) as string[]))],
    [tasks],
  );
  const selectedMail = mails.find((mail) => mail.mail_id === selectedTask?.mail_id);
  const selectedAttachment = selectedMail?.attachments.find((a) => a.attachment_id === selectedTask?.attachment_id);
  const rows = Object.values(selectedTask?.result_rows ?? {});
  const agentSteps = selectedTask?.agent_summary ?? [];

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
    return tasks.filter((task) => {
      if (task.status === "skipped") return false;
      if (customerFilter !== "全部" && task.customer_name !== customerFilter) return false;
      if (statusFilter !== "全部") {
        const statusMap: Record<string, string> = {
          进行中: "running",
          等待中: "waiting_human_decision",
          已完成: "completed",
          失败: "failed",
        };
        if (statusMap[statusFilter] && task.status !== statusMap[statusFilter]) return false;
      }
      if (task.received_at && referenceTime - new Date(task.received_at).getTime() > timeLimit) return false;
      return true;
    });
  }, [customerFilter, referenceTime, statusFilter, tasks, timeFilter]);

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
                options={["全部", "进行中", "等待中", "已完成", "失败"]}
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
                key={task.task_id}
                className={`list-item ${task.task_id === selectedTask?.task_id ? "selected" : ""}`}
                onClick={() => { setSelectedTaskId(task.task_id); setHasUserSelected(true); }}
              >
                <p className="item-title task-filename">{task.attachment_file_name ?? task.task_id}</p>
                <p className="item-meta task-status-desc">
                  {task.customer_name ?? "-"} · {t.receivedAt} {formatDateTime(task.received_at, locale)} ·{" "}
                  {taskStatusLabel(task.status, locale)}
                </p>
              </button>
            ))}
          </div>
        </aside>
        <section className="panel scroll-panel">
          <div className="panel-head">
            <h2 className="panel-title">{selectedAttachment?.file_name ?? t.attachmentPreview}</h2>
            <Badge variant="slate">{t.readonly}</Badge>
          </div>
          <div className="panel-body stack">
            {selectedAttachment ? (
              <PdfViewer attachmentId={selectedAttachment.attachment_id} locale={locale} />
            ) : (
              <p className="item-meta">{t.noAttachment}</p>
            )}
            {rows.length > 0 ? (
              <div className="scroll-x">
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
              </div>
            ) : null}
          </div>
        </section>
        <aside className="panel scroll-panel">
          <div className="panel-head">
            <h2 className="panel-title">{t.agentFlow}</h2>
            {selectedTask ? <Badge variant="amber">{taskStatusLabel(selectedTask.status, locale)}</Badge> : null}
          </div>
          <div className="panel-body stack timeline">
            {agentSteps.map((step, idx) => (
              <div className="step" key={`${step.title}-${idx}`}>
                <div className="step-title">{step.title}</div>
                <div className="step-meta">{step.description}</div>
              </div>
            ))}
            {agentSteps.length === 0 && selectedTask ? (
              <p className="item-meta">暂无执行流数据</p>
            ) : null}
          </div>
        </aside>
      </div>
    </>
  );
}
