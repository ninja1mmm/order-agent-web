"use client";

import Link from "next/link";
import React, { useCallback, useMemo, useState } from "react";

import { createManualMail, processMail } from "@/services/mail";
import {
  copy,
  customerLabel,
  backendDateMs,
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
  const { mails, tasks, refresh } = useWorkspacePolling();
  const { customers } = useCustomerConfig();
  const [selectedMailId, setSelectedMailId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [parsingIds, setParsingIds] = useState<Set<string>>(new Set());

  const handleParse = useCallback(async (mailId: string, attachmentIds: string[]) => {
    for (const id of attachmentIds) setParsingIds((prev) => new Set(prev).add(id));
    try {
      await processMail(mailId, attachmentIds.length > 0 ? attachmentIds : undefined);
      await refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Parse failed");
    } finally {
      setParsingIds((prev) => { const next = new Set(prev); for (const id of attachmentIds) next.delete(id); return next; });
    }
  }, [refresh]);
  const [customerFilter, setCustomerFilter] = useState("__all__");
  const [timeFilter, setTimeFilter] = useState("最近 30 天");
  const [attachmentFilter, setAttachmentFilter] = useState("全部邮件");
  const [statusFilter, setStatusFilter] = useState("全部状态");
  const [referenceTime] = useState(() => Date.now());
  const t = copy[locale];

  const selectedMail = mails.find((mail) => mail.id === selectedMailId) ?? mails[0];
  const selectedTasks = tasks.filter((task) => task.mailMessageId === selectedMail?.id);

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
      <div className="subnav">
        <Link className="active" href="/task-workbench">
          {t.inbox}
        </Link>
        <Link href="/parse-review">{t.parse}</Link>
        <Link href="/mail-workbench">Mail Workbench</Link>
        <Link href="/orders">{t.order}</Link>
      </div>
      <div className="inbox-grid screen-fill">
        <LeftPanel
          locale={locale}
          mails={filteredMails}
          customers={customers}
          selectedMailId={selectedMail?.id}
          customerFilter={customerFilter}
          timeFilter={timeFilter}
          attachmentFilter={attachmentFilter}
          statusFilter={statusFilter}
          customerOptions={customerOptions}
          onCustomerFilterChange={setCustomerFilter}
          onTimeFilterChange={setTimeFilter}
          onAttachmentFilterChange={setAttachmentFilter}
          onStatusFilterChange={setStatusFilter}
          onSelectMail={setSelectedMailId}
          onRefresh={refresh}
          onAddMail={() => setModalOpen(true)}
        />
        <MiddlePanel locale={locale} mail={selectedMail} customers={customers} />
        <RightPanel
          locale={locale}
          mail={selectedMail}
          tasks={selectedTasks}
          parsingIds={parsingIds}
          onParse={handleParse}
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
