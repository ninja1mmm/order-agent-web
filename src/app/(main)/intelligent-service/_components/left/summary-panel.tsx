"use client";

import type { PendingTaskSummary, WorkspaceStats } from "@/services/inbox";
import type { CustomerConfig } from "@/services/settings";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import {
  type Locale,
  copy,
  customerLabelFromId,
  translatePipelineSummary,
} from "../../../_components/shared";

type SummaryPanelProps = {
  locale: Locale;
  loading: boolean;
  error: string | null;
  stats: WorkspaceStats | null;
  customers: CustomerConfig[];
  customerNames: string[];
  pendingTasks: PendingTaskSummary[];
};

export function SummaryPanel({
  locale,
  loading,
  error,
  stats,
  customers,
  customerNames,
  pendingTasks,
}: SummaryPanelProps) {
  const t = copy[locale];

  return (
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
              {pendingTasks.map((item, index) => (
                <div key={item.taskId || `pending-${index}`}>
                  <CardTitle title={customerLabelFromId(customers, null, item.customerName ?? item.fileName)}>
                    {customerLabelFromId(customers, null, item.customerName ?? item.fileName)}
                  </CardTitle>
                  <CardDescription>{translatePipelineSummary(item.reason) ?? item.reason}</CardDescription>
                </div>
              ))}
            </div>
          </Card>
        ) : null}
      </div>
    </aside>
  );
}
