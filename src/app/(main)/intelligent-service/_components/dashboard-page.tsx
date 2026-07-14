"use client";

import { customerLabel, useCustomerConfig, useLocale, useWorkspacePolling } from "../../_components/shared";
import { SummaryPanel } from "./left/summary-panel";
import { CustomerRhythmPanel } from "./middle/customer-rhythm-panel";
import { PendingTasksPanel } from "./right/pending-tasks-panel";

export function DashboardPage() {
  const locale = useLocale();
  const { loading, error, mails, stats, refresh } = useWorkspacePolling();
  const { customers } = useCustomerConfig();
  const pendingTasks = stats?.pendingTasks ?? [];
  const customerNames = customers.map(customerLabel);

  return (
    <div className="grid-3 screen-fill">
      <SummaryPanel
        locale={locale}
        loading={loading}
        error={error}
        stats={stats}
        customers={customers}
        customerNames={customerNames}
        pendingTasks={pendingTasks}
      />
      <CustomerRhythmPanel locale={locale} mails={mails} customers={customers} />
      <PendingTasksPanel locale={locale} pendingTasks={pendingTasks} customers={customers} onRefresh={refresh} />
    </div>
  );
}
