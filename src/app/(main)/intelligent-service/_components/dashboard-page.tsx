"use client";

import { useState } from "react";
import Link from "next/link";
import { Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCustomerConfig, useLocale, useWorkspacePolling } from "../../_components/shared";
import { SummaryPanel } from "./left/summary-panel";
import { CustomerRhythmPanel } from "./middle/customer-rhythm-panel";
import { PendingMailsPanel } from "./right/pending-tasks-panel";
import type { MailFilter, PendingCategory } from "./mail-filters";

export function DashboardPage() {
  const [mailFilter, setMailFilter] = useState<MailFilter>(null);
  const locale = useLocale();
  const { loading, error, mails, tasks, refresh } = useWorkspacePolling();
  const { customers } = useCustomerConfig();
  function selectCategory(category: PendingCategory) {
    setMailFilter((current) => current?.kind === "category" && current.category === category ? null : { kind: "category", category });
  }

  function selectCustomerDay(customerKey: string, customerLabel: string, date: string) {
    setMailFilter((current) => current?.kind === "customer-day" && current.customerKey === customerKey && current.date === date
      ? null
      : { kind: "customer-day", customerKey, customerLabel, date });
  }

  const filterKey = mailFilter?.kind === "category"
    ? `category:${mailFilter.category}`
    : mailFilter?.kind === "customer-day"
      ? `day:${mailFilter.customerKey}:${mailFilter.date}`
      : "all";
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
          filter={mailFilter}
          onSelectCategory={selectCategory}
        />
        <CustomerRhythmPanel locale={locale} mails={mails} tasks={tasks} customers={customers} filter={mailFilter} onSelectCustomerDay={selectCustomerDay} />
        <PendingMailsPanel key={filterKey} locale={locale} mails={mails} tasks={tasks} customers={customers} filter={mailFilter} onClearFilter={() => setMailFilter(null)} onRefresh={refresh} />
      </div>
    </div>
  );
}
