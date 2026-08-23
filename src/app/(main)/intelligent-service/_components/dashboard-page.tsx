"use client";

import Link from "next/link";
import { Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCustomerConfig, useLocale, useWorkspacePolling } from "../../_components/shared";
import { SummaryPanel } from "./left/summary-panel";
import { CustomerRhythmPanel } from "./middle/customer-rhythm-panel";
import { PendingMailsPanel } from "./right/pending-tasks-panel";

export function DashboardPage() {
  const locale = useLocale();
  const { loading, error, mails, tasks, refresh } = useWorkspacePolling();
  const { customers } = useCustomerConfig();
  return (
    <div className="service-page screen-fill">
      <div className="page-context-row">
        <div className="page-context-copy">
          <strong>智能客服工作概览</strong>
        </div>
        <div className="page-context-actions">
          <Button variant="default" size="sm" onClick={refresh}><RefreshCw className="h-3.5 w-3.5" />刷新</Button>
          <Link href="/task-workbench"><Button variant="primary" size="sm"><Inbox className="h-3.5 w-3.5" />打开客户收件箱</Button></Link>
        </div>
      </div>
      <div className="grid-3 service-grid screen-fill">
        <SummaryPanel
          locale={locale}
          loading={loading}
          error={error}
          mails={mails}
          tasks={tasks}
        />
        <CustomerRhythmPanel locale={locale} mails={mails} tasks={tasks} customers={customers} />
        <PendingMailsPanel locale={locale} mails={mails} tasks={tasks} customers={customers} onRefresh={refresh} />
      </div>
    </div>
  );
}
