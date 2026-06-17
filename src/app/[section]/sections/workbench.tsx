"use client";

import Link from "next/link";
import React, { useCallback, useMemo, useState } from "react";
import { RefreshCw, Plus, Download } from "lucide-react";

import { BACKEND_URL } from "../../../api/client";
import { createManualMail, parseAttachment } from "../../../services/mail";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterSelect } from "@/components/ui/select";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { type Locale, copy, formatDateTime, taskStatusLabel, useWorkspacePolling } from "./shared";
import { NewMailModal } from "./components";

export function LiveWorkbench({ locale }: { locale: Locale }) {
  const { mails, tasks, refresh } = useWorkspacePolling();
  const [selectedMailId, setSelectedMailId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [parsingIds, setParsingIds] = useState<Set<string>>(new Set());

  const handleParse = useCallback(async (attachmentId: string) => {
    setParsingIds((prev) => new Set(prev).add(attachmentId));
    try {
      await parseAttachment(attachmentId);
      await refresh();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Parse failed");
    } finally {
      setParsingIds((prev) => { const next = new Set(prev); next.delete(attachmentId); return next; });
    }
  }, [refresh]);
  const [customerFilter, setCustomerFilter] = useState("全部");
  const [timeFilter, setTimeFilter] = useState("最近 30 天");
  const [attachmentFilter, setAttachmentFilter] = useState("全部邮件");
  const [statusFilter, setStatusFilter] = useState("全部状态");
  const [referenceTime] = useState(() => Date.now());
  const t = copy[locale];

  const selectedMail = mails.find((mail) => mail.mail_id === selectedMailId) ?? mails[0];
  const selectedTasks = tasks.filter((task) => task.mail_id === selectedMail?.mail_id);

  const customers = useMemo(
    () => ["全部", ...Array.from(new Set(mails.map((mail) => mail.customer_name || mail.customer_id).filter(Boolean) as string[]))],
    [mails],
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
      const customerName = mail.customer_name || mail.customer_id || "";
      if (customerFilter !== "全部" && customerName !== customerFilter) return false;
      if (referenceTime - new Date(mail.received_at).getTime() > timeLimit) return false;
      const hasAttachment = mail.attachments.length > 0;
      if (attachmentFilter === "有附件" && !hasAttachment) return false;
      if (attachmentFilter === "无附件" && hasAttachment) return false;
      if (statusFilter !== "全部状态") {
        const mailTasks = tasks.filter((task) => task.mail_id === mail.mail_id);
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
        <Link href="/orders">{t.order}</Link>
      </div>
      <div className="inbox-grid screen-fill">
        <aside className="panel scroll-panel">
          <div className="panel-head">
            <h2 className="panel-title">{t.mailList}</h2>
            <div className="panel-head-actions">
              <Button variant="primary" size="icon" aria-label={t.refresh} title={t.refresh} onClick={refresh}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> {t.add}
              </Button>
            </div>
          </div>
          <div className="panel-body stack">
            <div className="filter-bar">
              <FilterSelect label={t.filterCustomer} value={customerFilter} options={customers} onChange={setCustomerFilter} />
              <FilterSelect
                label={t.filterTime}
                value={timeFilter}
                options={["今天", "最近 7 天", "最近 30 天", "最近 60 天"]}
                onChange={setTimeFilter}
              />
              <FilterSelect
                label={t.filterAttachment}
                value={attachmentFilter}
                options={["全部邮件", "有附件", "无附件"]}
                onChange={setAttachmentFilter}
              />
              <FilterSelect
                label={t.filterStatus}
                value={statusFilter}
                options={["全部状态", "待处理", "处理中", "待人工确认", "已完成", "处理失败"]}
                onChange={setStatusFilter}
              />
            </div>
            {filteredMails.map((mail) => (
              <button
                type="button"
                className={`mail-card ${mail.mail_id === selectedMail?.mail_id ? "selected" : ""}`}
                key={mail.mail_id}
                onClick={() => setSelectedMailId(mail.mail_id)}
              >
                <div className="mail-sender">{mail.sender}</div>
                <div className="mail-subject">{mail.subject}</div>
                <div className="mail-time">
                  {t.receivedAt}：{formatDateTime(mail.received_at, locale)}
                </div>
                {mail.customer_name || mail.customer_id ? (
                  <Badge variant="blue" className="mt-2">{mail.customer_name || mail.customer_id}</Badge>
                ) : null}
              </button>
            ))}
          </div>
        </aside>
        <section className="panel scroll-panel">
          <div className="panel-head">
            <h2 className="panel-title">{t.mailBody}</h2>
          </div>
          <div className="panel-body stack">
            {selectedMail ? (
              <>
                <Card>
                  <div className="row">
                    <CardTitle>{selectedMail.subject}</CardTitle>
                    {(selectedMail.customer_name || selectedMail.customer_id) && (
                      <Badge variant="blue">{selectedMail.customer_name || selectedMail.customer_id}</Badge>
                    )}
                  </div>
                  <CardDescription>
                    From: {selectedMail.sender} · {t.receivedAt}: {formatDateTime(selectedMail.received_at, locale)}
                  </CardDescription>
                </Card>
                <div className="mail-body">{selectedMail.body_text}</div>
              </>
            ) : (
              <p className="item-meta">{t.noMail}</p>
            )}
          </div>
        </section>
        <aside className="panel scroll-panel">
          <div className="panel-head">
            <h2 className="panel-title">{t.aiAttachmentResults}</h2>
          </div>
          <div className="panel-body stack">
            {selectedMail?.attachments.map((attachment) => {
              const task = selectedTasks.find((item) => item.attachment_id === attachment.attachment_id);
              return (
                <div className="result-block" key={attachment.attachment_id}>
                  <div className="result-title">
                    <span className="result-name">
                      {attachment.file_name}
                      <a
                        className="icon-link"
                        href={`${BACKEND_URL}/api/files/${attachment.attachment_id}`}
                        download={attachment.file_name}
                        aria-label={`${t.download} ${attachment.file_name}`}
                      >
                        <Download className="h-3 w-3" />
                      </a>
                    </span>
                    <Badge variant="slate">{task ? taskStatusLabel(task.status, locale) : attachment.status}</Badge>
                  </div>
                  <div className="result-actions">
                    <Button
                      variant={parsingIds.has(attachment.attachment_id) ? "primary" : "default"}
                      size="sm"
                      className={parsingIds.has(attachment.attachment_id) ? "btn-parsing" : ""}
                      onClick={() => handleParse(attachment.attachment_id)}
                    >
                      {parsingIds.has(attachment.attachment_id) ? "解析中..." : t.trigger}
                    </Button>
                    {task?.task_id ? (
                      <Link className="btn small" href={`/parse-review?taskId=${task.task_id}`}>
                        {t.review}
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
      <NewMailModal open={modalOpen} locale={locale} submitting={submitting} onClose={() => setModalOpen(false)} onSubmit={handleCreate} />
    </>
  );
}
