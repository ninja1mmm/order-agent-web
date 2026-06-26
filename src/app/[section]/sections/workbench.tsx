"use client";

import Link from "next/link";
import React, { useCallback, useMemo, useState } from "react";
import { RefreshCw, Plus, Download } from "lucide-react";

import { BACKEND_URL } from "../../../api/client";
import { createManualMail, processMail } from "../../../services/mail";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FilterSelect } from "@/components/ui/select";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import {
  type Locale,
  copy,
  customerLabel,
  customerLabelFromId,
  backendDateMs,
  formatDateTime,
  taskStatusLabel,
  useCustomerConfig,
  useWorkspacePolling,
} from "./shared";
import { NewMailModal } from "./components";

const docTypeLabel: Record<string, Record<Locale, string>> = {
  supplier_release: { "zh-CN": "Sales Forecast", "zh-TW": "Sales Forecast", en: "Sales Forecast" },
  forecast_excel: { "zh-CN": "Sales Forecast", "zh-TW": "Sales Forecast", en: "Sales Forecast" },
  shipping_plan_excel: { "zh-CN": "Shipping Plan", "zh-TW": "Shipping Plan", en: "Shipping Plan" },
  manifest: { "zh-CN": "Shipping Plan", "zh-TW": "Shipping Plan", en: "Shipping Plan" },
  pallet_label: { "zh-CN": "Shipping Plan", "zh-TW": "Shipping Plan", en: "Shipping Plan" },
};

const docTypeBadge: Record<string, "blue" | "green" | "amber" | "slate"> = {
  supplier_release: "blue",
  forecast_excel: "blue",
  shipping_plan_excel: "green",
  manifest: "green",
  pallet_label: "green",
};

function parseReviewStatus(status: string) {
  return status === "processing" ? "running" : status;
}

export function LiveWorkbench({ locale }: { locale: Locale }) {
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
              <FilterSelect label={t.filterCustomer} value={customerFilter} options={customerOptions} onChange={setCustomerFilter} />
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
                className={`mail-card ${mail.id === selectedMail?.id ? "selected" : ""}`}
                key={mail.id}
                onClick={() => setSelectedMailId(mail.id)}
              >
                <div className="mail-card-top">
                  <span className="mail-customer">{customerLabelFromId(customers, mail.customerId, mail.customerName)}</span>
                  <span className="mail-time">{formatDateTime(mail.receivedAt, locale)}</span>
                </div>
                <div className="mail-subject">{mail.subject}</div>
                <div className="mail-preview">{mail.bodyText || "-"}</div>
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
                    {(selectedMail.customerName || selectedMail.customerId) && (
                      <Badge variant="blue">{customerLabelFromId(customers, selectedMail.customerId, selectedMail.customerName)}</Badge>
                    )}
                  </div>
                  <CardDescription>
                    From: {selectedMail.fromEmail} · {t.receivedAt}: {formatDateTime(selectedMail.receivedAt, locale)}
                  </CardDescription>
                </Card>
                <div className="mail-body" style={{ whiteSpace: "pre-wrap" }}>
                  {selectedMail.bodyText}
                  {(() => {
                    const seenIds = new Set<string>();
                    const allImages: { key: string; artifactId: string; alt: string }[] = [];
                    for (const img of selectedMail.inlineImages ?? []) {
                      if (!seenIds.has(img.fileArtifactId)) {
                        seenIds.add(img.fileArtifactId);
                        allImages.push({ key: img.imageId, artifactId: img.fileArtifactId, alt: "inline" });
                      }
                    }
                    for (const att of selectedMail.attachments) {
                      if (att.contentType?.startsWith("image/") && att.fileArtifactId && !seenIds.has(att.fileArtifactId)) {
                        seenIds.add(att.fileArtifactId);
                        allImages.push({ key: att.attachmentId, artifactId: att.fileArtifactId, alt: att.fileName });
                      }
                    }
                    return allImages.length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                        {allImages.map((img) => (
                          <img
                            key={img.key}
                            src={`${BACKEND_URL}/api/files/${img.artifactId}/content`}
                            alt={img.alt}
                            style={{ maxWidth: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 4, alignSelf: "flex-start" }}
                          />
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
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
            {selectedMail?.attachments.filter(a => !a.contentType?.startsWith("image/")).map((attachment) => {
              const task = selectedTasks.find((item) => item.attachmentId === attachment.attachmentId);
              const dtype = attachment.documentType || task?.taskType?.replace("extract_", "") || null;
              const isSkipped = attachment.status === "skipped" || task?.status === "skipped";
              const targetLabel = dtype && docTypeLabel[dtype] ? docTypeLabel[dtype][locale] : null;
              const targetBadgeVariant = dtype && docTypeBadge[dtype] ? docTypeBadge[dtype] : "slate";
              const isParsing = parsingIds.has(attachment.attachmentId);
              const canStartParse = task?.status === "waiting_human_decision";
              const canReparse = task?.status === "completed" || attachment.status === "published";
              const showParseButton = canStartParse || canReparse || isParsing;
              const reviewHref = task?.id
                ? `/parse-review?taskId=${encodeURIComponent(task.id)}&status=${encodeURIComponent(parseReviewStatus(task.status))}`
                : "";
              const reviewLabel = task?.status === "completed" || task?.status === "published" ? t.review : t.view;
              return (
                <div className="result-block" key={attachment.attachmentId}>
                  <div className="result-title">
                    <span className="result-name" title={attachment.fileName}>
                      {attachment.fileName}
                      <a
                        className="icon-link"
                        href={attachment.fileArtifactId ? `${BACKEND_URL}/api/files/${attachment.fileArtifactId}/content` : "#"}
                        download={attachment.fileName}
                        aria-label={`${t.download} ${attachment.fileName}`}
                      >
                        <Download className="h-3 w-3" />
                      </a>
                    </span>
                    <Badge variant="slate">{task ? taskStatusLabel(task.status, locale) : attachment.status}</Badge>
                  </div>
                  {task?.status === "waiting_human_decision" && task.reviewSummary?.reason ? (
                    <div className="review-reason-hint">{task.reviewSummary.reason}</div>
                  ) : null}
                  {targetLabel && !isSkipped && (
                    <div style={{ marginTop: 6 }}>
                      <Badge variant={targetBadgeVariant}>{targetLabel}</Badge>
                    </div>
                  )}
                  <div className="result-actions">
                    {showParseButton ? (
                      <Button
                        variant={isParsing ? "primary" : "default"}
                        size="sm"
                        className={isParsing ? "btn-parsing" : ""}
                        onClick={() => handleParse(selectedMail.id, [attachment.attachmentId])}
                      >
                        {isParsing ? "解析中..." : canReparse ? t.reparse : t.trigger}
                      </Button>
                    ) : null}
                    {reviewHref ? (
                      <Link href={reviewHref}>
                        <Button variant="default" size="sm">{reviewLabel}</Button>
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })}
            {selectedTasks
              .filter((task) => task.attachmentId === null)
              .map((task) => {
                const dtype = task.taskType?.replace("extract_", "") || null;
                const targetLabel = dtype && docTypeLabel[dtype] ? docTypeLabel[dtype][locale] : null;
                const targetBadgeVariant = dtype && docTypeBadge[dtype] ? docTypeBadge[dtype] : "slate";
                const canReparse = task.status === "completed" || task.status === "published";
                const canStartParse = task.status === "waiting_human_decision";
                const showParseButton = canStartParse || canReparse;
                const reviewHref = task.id
                  ? `/parse-review?taskId=${encodeURIComponent(task.id)}&status=${encodeURIComponent(parseReviewStatus(task.status))}`
                  : "";
                const reviewLabel = task.status === "completed" || task.status === "published" ? t.review : t.view;
                return (
                  <div className="result-block" key={task.id}>
                    <div className="result-title">
                      <span className="result-name">Email Body</span>
                      <Badge variant="slate">{taskStatusLabel(task.status, locale)}</Badge>
                    </div>
                    {task.status === "waiting_human_decision" && task.reviewSummary?.reason ? (
                      <div className="review-reason-hint">{task.reviewSummary.reason}</div>
                    ) : null}
                    {targetLabel && (
                      <div style={{ marginTop: 6 }}>
                        <Badge variant={targetBadgeVariant}>{targetLabel}</Badge>
                      </div>
                    )}
                    <div className="result-actions">
                      {showParseButton && selectedMail ? (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleParse(selectedMail.id, [])}
                        >
                          {canReparse ? t.reparse : t.trigger}
                        </Button>
                      ) : null}
                      {reviewHref ? (
                        <Link href={reviewHref}>
                          <Button variant="default" size="sm">{reviewLabel}</Button>
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}
          </div>
        </aside>
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
