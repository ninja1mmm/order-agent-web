"use client";

import Link from "next/link";
import React, { useCallback, useMemo, useState } from "react";
import { CloudDownload, History, Mail, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSearchParams } from "next/navigation";

import { createManualMail, processMail } from "@/services/mail";
import { triggerMailboxSync } from "@/services/settings";
import {
  copy,
  customerLabel,
  backendDateMs,
  beijingDateKey,
  useLocale,
  useCustomerConfig,
  useWorkspacePolling,
} from "../../_components/shared";
import { NewMailModal } from "../../_components/shared-components";
import { LeftPanel } from "./left/left-panel";
import { MiddlePanel } from "./middle/middle-panel";
import { RightPanel } from "./right/right-panel";

export function TaskWorkbenchPage() {
  const locale = useLocale();
  const params = useSearchParams();
  const { mails, tasks, refresh } = useWorkspacePolling();
  const { customers } = useCustomerConfig();
  const [selectedMailId, setSelectedMailId] = useState<string>(() => params.get("mailId") ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [parsingIds, setParsingIds] = useState<Set<string>>(new Set());
  const [isSyncingMailbox, setIsSyncingMailbox] = useState(false);
  const [viewMode, setViewMode] = useState<"mail" | "customer">(() => params.get("view") === "customer" ? "customer" : "mail");

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
  const [timeFilter, setTimeFilter] = useState("最近 30 天");
  const [attachmentFilter, setAttachmentFilter] = useState("全部邮件");
  const [statusFilter, setStatusFilter] = useState("全部状态");
  const [customerSearch, setCustomerSearch] = useState("");
  const [timelineStartDate, setTimelineStartDate] = useState("");
  const [timelineEndDate, setTimelineEndDate] = useState("");
  const [referenceTime] = useState(() => Date.now());
  const t = copy[locale];

  const customerOptions = useMemo(
    () => [
      { value: "__all__", label: t.all },
      ...customers.map((customer) => ({ value: customer.id, label: customerLabel(customer) })),
    ],
    [customers, t.all],
  );

  const filteredMails = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000;
    const timeLimit =
      timeFilter === "今天"
        ? dayMs
        : timeFilter === "最近 7 天"
          ? 7 * dayMs
          : timeFilter === "最近 60 天"
            ? 60 * dayMs
            : 30 * dayMs;

    return mails.filter((mail) => {
      if (customerFilter !== "__all__" && mail.customerId !== customerFilter) return false;
      if (referenceTime - backendDateMs(mail.receivedAt) > timeLimit) return false;
      const hasAttachment = mail.attachments.length > 0;
      if (attachmentFilter === "有附件" && !hasAttachment) return false;
      if (attachmentFilter === "无附件" && hasAttachment) return false;
      if (statusFilter !== "全部状态") {
        const mailTasks = tasks.filter((task) => task.mailMessageId === mail.id);
        const statusMap: Record<string, string[]> = {
          待处理: ["queued"],
          处理中: ["running"],
          待人工确认: ["waiting_human_decision"],
          已完成: ["completed"],
          处理失败: ["failed"],
        };
        const allowed = statusMap[statusFilter] ?? [];
        if (allowed.length && !mailTasks.some((task) => allowed.includes(task.status))) return false;
      }
      return true;
    });
  }, [attachmentFilter, customerFilter, mails, referenceTime, statusFilter, tasks, timeFilter]);

  const timelineMails = useMemo(() => mails.filter((mail) => {
    const date = beijingDateKey(mail.receivedAt);
    if (timelineStartDate && date < timelineStartDate) return false;
    if (timelineEndDate && date > timelineEndDate) return false;
    return true;
  }), [mails, timelineEndDate, timelineStartDate]);
  const selectedCustomerMails = customerFilter === "__all__" ? timelineMails : timelineMails.filter((mail) => mail.customerId === customerFilter || (!mail.customerId && mail.customerName === customerFilter));
  const activeMails = viewMode === "customer" ? selectedCustomerMails : filteredMails;
  const selectedMail = activeMails.find((mail) => mail.id === selectedMailId) ?? activeMails[0] ?? (viewMode === "mail" ? mails[0] : undefined);
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
          <div className="workbench-view-controls" role="group" aria-label="工作台视图">
            <Button variant="default" size="icon-sm" className={viewMode === "mail" ? "is-active" : ""} aria-label="邮件视图" aria-pressed={viewMode === "mail"} title="邮件视图" onClick={() => setViewMode("mail")}><Mail className="h-3.5 w-3.5" /></Button>
            <Button variant="default" size="icon-sm" className={viewMode === "customer" ? "is-active" : ""} aria-label="客户时间轴" aria-pressed={viewMode === "customer"} title="客户时间轴" onClick={() => setViewMode("customer")}><History className="h-3.5 w-3.5" /></Button>
          </div>
          <Button variant="default" size="sm" aria-label="同步邮箱" title="从邮件服务器拉取新邮件" disabled={isSyncingMailbox} onClick={handleMailboxSync}><CloudDownload className={`h-3.5 w-3.5 ${isSyncingMailbox ? "animate-spin" : ""}`} />同步邮箱</Button>
          <Button variant="default" size="icon-sm" aria-label="刷新" title="刷新" onClick={() => refresh()}><RefreshCw className="h-3.5 w-3.5" /></Button>
          <Button variant="default" size="sm" onClick={() => setModalOpen(true)}><Plus className="h-3.5 w-3.5" />新增邮件</Button>
        </div>
      </div>
      <div className="inbox-grid screen-fill">
        <LeftPanel
          locale={locale}
          viewMode={viewMode}
          mails={viewMode === "mail" ? filteredMails : timelineMails}
          tasks={tasks}
          customers={customers}
          selectedMailId={selectedMail?.id}
          customerFilter={customerFilter}
          timeFilter={timeFilter}
          attachmentFilter={attachmentFilter}
          statusFilter={statusFilter}
          customerSearch={customerSearch}
          timelineStartDate={timelineStartDate}
          timelineEndDate={timelineEndDate}
          customerOptions={customerOptions}
          onCustomerFilterChange={setCustomerFilter}
          onTimeFilterChange={setTimeFilter}
          onAttachmentFilterChange={setAttachmentFilter}
          onStatusFilterChange={setStatusFilter}
          onCustomerSearchChange={setCustomerSearch}
          onTimelineStartDateChange={setTimelineStartDate}
          onTimelineEndDateChange={setTimelineEndDate}
          onSelectCustomer={handleSelectCustomer}
          onSelectMail={setSelectedMailId}
        />
        <MiddlePanel locale={locale} viewMode={viewMode} mail={selectedMail} timelineMails={selectedCustomerMails} tasks={tasks} customers={customers} onSelectMail={setSelectedMailId} />
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
