"use client";

import Link from "next/link";
import type { PendingTaskSummary } from "../../../services/inbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { type Locale, copy, taskStatusLabel, useWorkspacePolling } from "./shared";
import { CustomerHeatmap } from "./components";

export function LiveDashboard({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const { loading, error, mails, stats } = useWorkspacePolling();
  const pendingTasks = stats?.pendingTasks ?? [];
  const customerNames = stats?.customerNames ?? [];

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
              <div className="metric-value">{stats?.customerCount ?? 0}</div>
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
                {pendingTasks.map((item: PendingTaskSummary) => (
                  <div key={item.task_id}>
                    <CardTitle>{item.customer_name ?? item.file_name}</CardTitle>
                    <CardDescription>{item.reason}</CardDescription>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      </aside>
      <section className="panel scroll-panel">
        <CustomerHeatmap mails={mails} customerNames={customerNames} locale={locale} />
      </section>
      <aside className="panel scroll-panel">
        <div className="panel-head">
          <h2 className="panel-title">{t.pendingTasks}</h2>
          <Badge variant="red">{pendingTasks.length}</Badge>
        </div>
        <div className="panel-body stack">
          {pendingTasks.map((item) => (
            <Link className="list-item" href={`/parse-review?taskId=${item.task_id}`} key={item.task_id}>
              <p className="item-title">{item.file_name}</p>
              <p className="item-meta">
                {item.customer_name ?? "-"} · {taskStatusLabel(item.status, locale)} · {item.reason}
              </p>
            </Link>
          ))}
          {pendingTasks.length === 0 ? <p className="item-meta">暂无待处理任务</p> : null}
        </div>
      </aside>
    </div>
  );
}
