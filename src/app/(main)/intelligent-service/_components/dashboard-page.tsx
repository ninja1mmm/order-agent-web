"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCustomerConfig, useLocale, useWorkspacePolling } from "../../_components/shared";
import { SummaryPanel } from "./left/summary-panel";
import { CustomerRhythmPanel } from "./middle/customer-rhythm-panel";
import { PendingMailsPanel } from "./right/pending-tasks-panel";
import type { MailFilter, PendingCategory } from "./mail-filters";
import { useDashboardMails } from "./use-dashboard-mails";

export function DashboardPage() {
  const [mailFilter, setMailFilter] = useState<MailFilter>(null);
  const locale = useLocale();
  const workspace = useWorkspacePolling();
  const { customers } = useCustomerConfig();
  const mailQuery = useMemo(() => {
    const customerDay = mailFilter?.kind === "customer-day" ? mailFilter : null;
    const customerId = customerDay?.customerKey.startsWith("id:") ? customerDay.customerKey.slice(3) : undefined;
    return {
      processingState: "processing" as const,
      pendingCategory: mailFilter?.kind === "category" ? mailFilter.category : undefined,
      customerId,
      dateFrom: customerDay?.date,
      dateTo: customerDay?.date,
    };
  }, [mailFilter]);
  const dashboardMails = useDashboardMails(mailQuery);

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

  function refresh() {
    void Promise.all([workspace.refresh(), dashboardMails.refresh()]);
  }

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
          loading={dashboardMails.loading && dashboardMails.stats === null}
          error={dashboardMails.error}
          stats={dashboardMails.stats}
          filter={mailFilter}
          onSelectCategory={selectCategory}
        />
        <CustomerRhythmPanel locale={locale} mails={workspace.mails} tasks={workspace.tasks} customers={customers} filter={mailFilter} onSelectCustomerDay={selectCustomerDay} />
        <PendingMailsPanel
          key={filterKey}
          locale={locale}
          mails={dashboardMails.mails}
          customers={customers}
          filter={mailFilter}
          total={dashboardMails.total}
          loading={dashboardMails.loading}
          loadingMore={dashboardMails.loadingMore}
          error={dashboardMails.error}
          hasMore={dashboardMails.hasMore}
          onClearFilter={() => setMailFilter(null)}
          onRefresh={() => void dashboardMails.refresh()}
          onLoadMore={() => void dashboardMails.loadMore()}
        />
      </div>
    </div>
  );
}
