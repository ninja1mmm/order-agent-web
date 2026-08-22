"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { copy, useCustomerConfig, useLocale } from "../../_components/shared";
import { useMailList, useMailTasks } from "./mail-workbench-hooks";
import { CustomerPanel } from "./left/customer-panel";
import { MailStrip } from "./right/mail-strip";
import { TabBar } from "./right/tab-bar";
import { MailDetailTab } from "./right/mail-detail-tab";
import { ParseReviewTab } from "./right/parse-review-tab";
import { PipelineBar } from "./right/pipeline-bar";
import "./mail-workbench.css";

export type TabItem = {
  id: string;
  label: string;
  type: "mail-detail" | "attachment" | "body";
  attachmentId?: string;
  taskId?: string;
};

const MAIL_DETAIL_TAB: TabItem = {
  id: "__mail_detail__",
  label: "Mail Detail",
  type: "mail-detail",
};

export function MailWorkbenchPage() {
  const locale = useLocale();
  const t = copy[locale];
  const { customers } = useCustomerConfig();

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedMailId, setSelectedMailId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const filters = useMemo(
    () => ({
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [dateFrom, dateTo],
  );

  const { mails, total, stats, page, loading, setPage, refresh } = useMailList(filters);
  const { tasks, loading: tasksLoading, refresh: refreshTasks } = useMailTasks(selectedMailId);

  const [openTabs, setOpenTabs] = useState<TabItem[]>([MAIL_DETAIL_TAB]);
  const [activeTabId, setActiveTabId] = useState(MAIL_DETAIL_TAB.id);

  const selectedMail = mails.find((m) => m.id === selectedMailId) ?? null;

  const handleSelectCustomer = useCallback((customerId: string | null) => {
    setSelectedCustomerId(customerId);
    setSelectedMailId(null);
    setOpenTabs([MAIL_DETAIL_TAB]);
    setActiveTabId(MAIL_DETAIL_TAB.id);
  }, []);

  const handleSelectMail = useCallback((mailId: string) => {
    setSelectedMailId(mailId);
    setOpenTabs([MAIL_DETAIL_TAB]);
    setActiveTabId(MAIL_DETAIL_TAB.id);
  }, []);

  const handleOpenTab = useCallback((tab: TabItem) => {
    setOpenTabs((prev) => {
      const exists = prev.find((t) => t.id === tab.id);
      if (exists) return prev;
      return [...prev, tab];
    });
    setActiveTabId(tab.id);
  }, []);

  const handleCloseTab = useCallback((tabId: string) => {
    setOpenTabs((prev) => {
      const next = prev.filter((t) => t.id !== tabId);
      return next;
    });
    setActiveTabId((prev) => (prev === tabId ? MAIL_DETAIL_TAB.id : prev));
  }, []);

  const activeTab = openTabs.find((t) => t.id === activeTabId) ?? MAIL_DETAIL_TAB;

  const [pipelineTask, setPipelineTask] = useState<import("@/types/models/inbox").MailTaskSummary | null>(null);
  const [pipelineState, setPipelineState] = useState<{ isProceedLoading: boolean; canProceed: boolean; taskStaleState: import("@/types/models/tasks").TaskStaleState; onProceed: () => void } | null>(null);

  const customerMails = useMemo(() => {
    if (!selectedCustomerId) return mails;
    return mails.filter((m) => m.customerId === selectedCustomerId);
  }, [mails, selectedCustomerId]);

  return (
    <>
      <div className="mail-workbench-topbar">
        <div className="subnav subnav-card">
          <Link href="/task-workbench">{t.inbox}</Link>
          <Link href="/parse-review">{t.parse}</Link>
          <Link className="active" href="/mail-workbench">Mail Workbench</Link>
          <Link href="/orders">{t.order}</Link>
        </div>
        <div className="mail-strip-card-wrapper">
          <MailStrip
            mails={customerMails}
            selectedMailId={selectedMailId}
            onSelectMail={handleSelectMail}
            locale={locale}
          />
          <PipelineBar
            task={pipelineTask}
            locale={locale}
            taskStaleState={pipelineState?.taskStaleState}
            isProceedLoading={pipelineState?.isProceedLoading}
            onProceed={pipelineState?.onProceed}
            onRefreshTasks={refreshTasks}
          />
        </div>
      </div>
      <div className="mail-workbench-grid screen-fill">
        <CustomerPanel
          locale={locale}
          mails={mails}
          customers={customers}
          selectedCustomerId={selectedCustomerId}
          customerSearch={customerSearch}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onSelectCustomer={handleSelectCustomer}
          onSearchChange={setCustomerSearch}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
          stats={stats}
        />
        <div className="mail-workbench-right">
          <TabBar
            tabs={openTabs}
            activeTabId={activeTabId}
            onSelectTab={setActiveTabId}
            onCloseTab={handleCloseTab}
          />
          <div className="mail-workbench-tab-content">
            {activeTab.type === "mail-detail" && (
              <MailDetailTab
                mail={selectedMail}
                tasks={tasks}
                locale={locale}
                onOpenTab={handleOpenTab}
              />
            )}
            {(activeTab.type === "attachment" || activeTab.type === "body") && (
              <ParseReviewTab
                key={activeTab.id}
                tab={activeTab}
                mail={selectedMail}
                tasks={tasks}
                locale={locale}
                onRefreshTasks={refreshTasks}
                onActiveTaskChange={setPipelineTask}
                onPipelineState={setPipelineState}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
