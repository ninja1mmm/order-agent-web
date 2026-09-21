"use client";

import Link from "next/link";
import React, { useCallback, useMemo, useState } from "react";
import { AlertTriangle, CloudDownload, LoaderCircle, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";

import { createManualMail, processMail } from "@/services/mail";
import { triggerMailboxSync } from "@/services/settings";
import {
  copy,
  beijingDateKey,
  useLocale,
  useCustomerConfig,
  useWorkspacePolling,
} from "../../_components/shared";
import { NewMailModal } from "../../_components/shared-components";
import { LeftPanel } from "./left/left-panel";
import { MiddlePanel } from "./middle/middle-panel";
import { RightPanel } from "./right/right-panel";
import { getWorkbenchMailStatus, type WorkbenchStatusFilter } from "./workbench-utils";

export function TaskWorkbenchPage() {
  const locale = useLocale();
  const params = useSearchParams();
  const { loading, error, mails, tasks, refresh } = useWorkspacePolling();
  const { customers } = useCustomerConfig();
  const [selectedMailId, setSelectedMailId] = useState<string>(() => params.get("mailId") ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [parsingIds, setParsingIds] = useState<Set<string>>(new Set());
  const [isSyncingMailbox, setIsSyncingMailbox] = useState(false);

  const handleParse = useCallback(async (mailId: string, attachmentIds: string[]) => {
    for (const id of attachmentIds) setParsingIds((prev) => new Set(prev).add(id));
    try {
      await processMail(mailId, attachmentIds.length > 0 ? attachmentIds : undefined);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Parse failed");
    } finally {
      setParsingIds((prev) => { const next = new Set(prev); for (const id of attachmentIds) next.delete(id); return next; });
    }
  }, [refresh]);

  const handleMailboxSync = useCallback(async () => {
    if (isSyncingMailbox) return;
    setIsSyncingMailbox(true);
    try {
      await triggerMailboxSync();
      toast.success("同步已触发，稍后自动刷新");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "同步失败");
    } finally {
      setIsSyncingMailbox(false);
    }
  }, [isSyncingMailbox, refresh]);

  const [customerFilter, setCustomerFilter] = useState("__all__");
  const [attachmentFilter, setAttachmentFilter] = useState("全部邮件");
  const [statusFilter, setStatusFilter] = useState<WorkbenchStatusFilter>("processing");
  const [customerSearch, setCustomerSearch] = useState("");
  const [timelineStartDate, setTimelineStartDate] = useState("");
  const [timelineEndDate, setTimelineEndDate] = useState("");
  const t = copy[locale];

  const filteredMails = useMemo(() => mails.filter((mail) => {
      const date = beijingDateKey(mail.receivedAt);
      if (timelineStartDate && date < timelineStartDate) return false;
      if (timelineEndDate && date > timelineEndDate) return false;
      const hasAttachment = mail.attachments.length > 0;
      if (attachmentFilter === "有附件" && !hasAttachment) return false;
      if (attachmentFilter === "无附件" && hasAttachment) return false;
      if (statusFilter !== "all") {
        if (getWorkbenchMailStatus(mail.processingState) !== statusFilter) return false;
      }
      return true;
  }), [attachmentFilter, mails, statusFilter, timelineEndDate, timelineStartDate]);

  const selectedCustomerMails = customerFilter === "__all__" ? filteredMails : filteredMails.filter((mail) => mail.customerId === customerFilter || (!mail.customerId && mail.customerName === customerFilter));
  const selectedMail = selectedCustomerMails.find((mail) => mail.id === selectedMailId) ?? selectedCustomerMails[0];
  const selectedTasks = tasks.filter((task) => task.mailMessageId === selectedMail?.id);

  const handleSelectCustomer = useCallback((customerId: string, firstMailId?: string) => {
    setCustomerFilter(customerId);
    if (firstMailId) setSelectedMailId(firstMailId);
  }, []);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    try {
      await createManualMail(formData);
      form.reset();
      setModalOpen(false);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "新增邮件失败，请稍后重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="workbench-toolbar-row">
        <nav className="subnav" aria-label="工作台模块">
          <Link className="active" href="/task-workbench">{t.inbox}</Link>
          <Link href="/orders">{t.order}</Link>
        </nav>
        <div className="workbench-page-actions">
          <Button variant="default" size="icon-sm" className="workbench-icon-button" aria-label="刷新" tooltip="刷新" disabled={loading} onClick={() => refresh()}>{loading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}</Button>
          <Button variant="default" size="sm" className="workbench-pill-button" aria-label="同步邮箱" tooltip="从邮件服务器拉取新邮件" disabled={isSyncingMailbox} onClick={handleMailboxSync}><CloudDownload className={`h-3.5 w-3.5 ${isSyncingMailbox ? "animate-spin" : ""}`} />同步邮箱</Button>
          <Button variant="default" size="sm" className="workbench-pill-button" onClick={() => setModalOpen(true)}><Plus className="h-3.5 w-3.5" />新增邮件</Button>
        </div>
      </div>
      {error ? (
        <div className="mx-3 mt-3 flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          <span className="flex min-w-0 items-center gap-2"><AlertTriangle className="h-4 w-4 shrink-0" />工作台数据加载失败，当前内容可能不是最新。</span>
          <Button variant="default" size="sm" disabled={loading} onClick={() => void refresh()}>重试</Button>
        </div>
      ) : null}
      <div className="inbox-grid screen-fill">
        <LeftPanel
          locale={locale}
          mails={filteredMails}
          customers={customers}
          customerFilter={customerFilter}
          attachmentFilter={attachmentFilter}
          statusFilter={statusFilter}
          customerSearch={customerSearch}
          timelineStartDate={timelineStartDate}
          timelineEndDate={timelineEndDate}
          onAttachmentFilterChange={setAttachmentFilter}
          onStatusFilterChange={(value) => setStatusFilter(value as WorkbenchStatusFilter)}
          onCustomerSearchChange={setCustomerSearch}
          onTimelineStartDateChange={setTimelineStartDate}
          onTimelineEndDateChange={setTimelineEndDate}
          onSelectCustomer={handleSelectCustomer}
        />
        <MiddlePanel locale={locale} mail={selectedMail} timelineMails={selectedCustomerMails} customers={customers} onSelectMail={setSelectedMailId} />
        <RightPanel
          locale={locale}
          mail={selectedMail}
          tasks={selectedTasks}
          parsingIds={parsingIds}
          onParse={handleParse}
          onRefresh={refresh}
        />
      </div>
      <NewMailModal
        open={modalOpen}
        locale={locale}
        customers={customers}
        submitting={submitting}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
      />
    </>
  );
}
