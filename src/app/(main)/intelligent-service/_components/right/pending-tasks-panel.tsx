"use client";

import Link from "next/link";
import type { PendingTaskSummary } from "@/services/inbox";
import type { CustomerConfig } from "@/services/settings";
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
};

export function PendingTasksPanel({ locale, pendingTasks, customers }: PendingTasksPanelProps) {
  const t = copy[locale];

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
              <Badge variant={statusBadgeVariant(item.status)}>{taskStatusLabel(item.status, locale)}</Badge>
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
