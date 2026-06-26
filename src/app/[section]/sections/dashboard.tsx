"use client";

import Link from "next/link";
import type { PendingTaskSummary } from "../../../services/inbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { type Locale, copy, customerLabel, customerLabelFromId, taskStatusLabel, useCustomerConfig, useWorkspacePolling } from "./shared";
import { CustomerHeatmap } from "./components";

function statusBadgeVariant(status: string): "amber" | "red" | "blue" | "default" {
  switch (status) {
    case "waiting_human_decision": return "amber";
    case "failed": return "red";
    case "processing": return "blue";
    default: return "default";
  }
}

export function LiveDashboard({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const { loading, error, mails, stats } = useWorkspacePolling();
  const { customers } = useCustomerConfig();
  const pendingTasks = stats?.pendingTasks ?? [];
  const customerNames = customers.map(customerLabel);

  return (
    <div className="grid-3 screen-fill">
      <aside className="panel scroll-panel">
        <div className="panel-head">
          <h2 className="panel-title">{t.yesterdaySummary}</h2>
        </div>
        <div className="panel-body stack">
          {loading ? <p className="item-meta">Loading...</p> : null}
          {error ? <p className="item-meta">{error}</p> : null}
          <div className="metric-grid">
            <div className="metric">
              <div className="metric-value">{stats?.completedCount ?? 0}</div>
              <div className="metric-label">{t.completedParse}</div>
            </div>
            <div className="metric">
              <div className="metric-value">{customers.length || stats?.customerCount || 0}</div>
              <div className="metric-label">{t.involvedCustomers}</div>
            </div>
            <div className="metric">
              <div className="metric-value">{stats?.pendingCount ?? 0}</div>
              <div className="metric-label">{t.enteredTodo}</div>
            </div>
            <div className="metric">
              <div className="metric-value">{stats?.followUpCount ?? 0}</div>
              <div className="metric-label">{t.needFollowUp}</div>
            </div>
          </div>
          {stats?.aiSummary ? (
            <Card>
              <CardTitle>{stats.aiSummary.title}</CardTitle>
              <CardDescription>{stats.aiSummary.detail}</CardDescription>
            </Card>
          ) : null}
          {customerNames.length > 0 ? (
            <Card>
              <p className="mini-title">{t.involvedCustomerTitle}</p>
              <div className="chip-wrap">
                {customerNames.map((name) => (
                  <Badge variant="slate" key={name}>{name}</Badge>
                ))}
              </div>
            </Card>
          ) : null}
          {pendingTasks.length > 0 ? (
            <Card>
              <p className="mini-title">{t.yesterdayPending}</p>
              <div className="stack">
                {pendingTasks.map((item: PendingTaskSummary, idx: number) => (
                  <div key={item.taskId || `pending-${idx}`}>
                    <CardTitle title={customerLabelFromId(customers, null, item.customerName ?? item.fileName)}>
                      {customerLabelFromId(customers, null, item.customerName ?? item.fileName)}
                    </CardTitle>
                    <CardDescription>{item.reason}</CardDescription>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      </aside>
      <section className="panel scroll-panel">
        <CustomerHeatmap mails={mails} customers={customers} locale={locale} />
      </section>
      <aside className="panel scroll-panel">
        <div className="panel-head">
          <h2 className="panel-title">{t.pendingTasks}</h2>
          <Badge variant={pendingTasks.length > 0 ? "red" : "default"}>{pendingTasks.length}</Badge>
        </div>
        <div className="panel-body stack">
          {pendingTasks.map((item, idx) => (
            <Link className="list-item" href={`/parse-review?taskId=${item.taskId}`} key={item.taskId || `task-${idx}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <p className="item-title" style={{ flex: 1, margin: 0 }} title={item.fileName}>{item.fileName}</p>
                <Badge variant={statusBadgeVariant(item.status)}>{taskStatusLabel(item.status, locale)}</Badge>
              </div>
              <p className="item-meta">
                {customerLabelFromId(customers, null, item.customerName)}
                {item.reason ? ` · ${item.reason}` : ""}
              </p>
            </Link>
          ))}
          {pendingTasks.length === 0 ? <p className="item-meta">暂无待处理任务</p> : null}
        </div>
      </aside>
    </div>
  );
}
