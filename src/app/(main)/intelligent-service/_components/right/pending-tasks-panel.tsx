"use client";

import { useState } from "react";
import Link from "next/link";
import { XCircle } from "lucide-react";
import type { PendingTaskSummary } from "@/services/inbox";
import type { CustomerConfig } from "@/services/settings";
import { cancelTask } from "@/services/tasks";
import { Badge } from "@/components/ui/badge";
import {
  type Locale,
  copy,
  customerLabelFromId,
  taskStatusLabel,
  translatePipelineSummary,
} from "../../../_components/shared";

type PendingTasksPanelProps = {
  locale: Locale;
  pendingTasks: PendingTaskSummary[];
  customers: CustomerConfig[];
  onRefresh: () => void;
};

export function PendingTasksPanel({ locale, pendingTasks, customers, onRefresh }: PendingTasksPanelProps) {
  const t = copy[locale];
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleCancel = async (e: React.MouseEvent, taskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setCancellingId(taskId);
    try {
      await cancelTask(taskId);
      onRefresh();
    } catch (err) {
      console.error("Cancel failed:", err);
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <aside className="panel scroll-panel">
      <div className="panel-head">
        <h2 className="panel-title">{t.pendingTasks}</h2>
        <Badge variant={pendingTasks.length > 0 ? "red" : "default"}>{pendingTasks.length}</Badge>
      </div>
      <div className="panel-body stack">
        {pendingTasks.map((item, index) => (
          <Link
            className="result-block"
            href={`/parse-review?taskId=${item.taskId}`}
            key={item.taskId || `task-${index}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div className="result-title">
              <span className="result-name" title={item.fileName}>{item.fileName}</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Badge variant={statusBadgeVariant(item.status)}>{taskStatusLabel(item.status, locale)}</Badge>
                {(item.status === "processing" || item.status === "queued") ? (
                  <button
                    type="button"
                    title="终止任务"
                    disabled={cancellingId === item.taskId}
                    onClick={(e) => handleCancel(e, item.taskId)}
                    style={{
                      background: "none", border: "none", cursor: "pointer", padding: 2,
                      color: "var(--danger)", display: "inline-flex", alignItems: "center",
                      opacity: cancellingId === item.taskId ? 0.5 : 1,
                    }}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </span>
            </div>
            <div className="result-footer">
              <span className="item-meta" style={{ margin: 0 }}>
                {customerLabelFromId(customers, null, item.customerName)}
                {item.reason ? ` · ${translatePipelineSummary(item.reason) ?? item.reason}` : ""}
              </span>
            </div>
          </Link>
        ))}
        {pendingTasks.length === 0 ? <p className="item-meta">暂无待处理任务</p> : null}
      </div>
    </aside>
  );
}

function statusBadgeVariant(status: string): "amber" | "red" | "blue" | "default" {
  switch (status) {
    case "waiting_human_decision": return "amber";
    case "failed": return "red";
    case "processing": return "blue";
    default: return "default";
  }
}
