"use client";

import { useMemo } from "react";
import DOMPurify from "dompurify";
import { History } from "lucide-react";
import { BACKEND_URL } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import type { WorkspaceMail, WorkspaceTask } from "@/services/inbox";
import type { CustomerConfig } from "@/services/settings";
import {
  type Locale,
  copy,
  customerLabelFromId,
  formatDateTime,
} from "../../../_components/shared";

type MiddlePanelProps = {
  locale: Locale;
  viewMode: "mail" | "customer";
  mail: WorkspaceMail | undefined;
  timelineMails: WorkspaceMail[];
  tasks: WorkspaceTask[];
  customers: CustomerConfig[];
  onSelectMail: (mailId: string) => void;
};

export function MiddlePanel({ locale, viewMode, mail, timelineMails, tasks, customers, onSelectMail }: MiddlePanelProps) {
  const t = copy[locale];
  const timelineCustomerNames = new Set(timelineMails.map((item) => customerLabelFromId(customers, item.customerId, item.customerName)));
  const customerName = timelineCustomerNames.size === 1 ? Array.from(timelineCustomerNames)[0] : "全部客户";

  if (viewMode === "customer") {
    return (
      <section className="panel scroll-panel customer-mail-workspace">
        <div className="panel-head">
          <h2 className="panel-title"><History className="h-4 w-4" />{customerName} · 邮件时间线</h2>
          <Badge variant="slate">{timelineMails.length} 封</Badge>
        </div>
        <div className="customer-timeline-workspace">
          <div className="vertical-mail-timeline scrollbar-hidden" aria-label={`${customerName} 邮件时间线`}>
            {timelineMails.map((item) => (
              <button type="button" className={item.id === mail?.id ? "selected" : ""} key={item.id} onClick={() => onSelectMail(item.id)}>
                <span className="timeline-dot" aria-hidden="true" />
                <span className="workbench-mail-copy"><strong title={item.subject}>{item.subject || "(无主题)"}</strong><small>{formatDateTime(item.receivedAt, locale)} · {item.attachments.length} 个附件</small></span>
              </button>
            ))}
            {timelineMails.length === 0 ? <p className="item-meta">该客户在当前日期范围内没有邮件。</p> : null}
          </div>
          <div className="customer-mail-detail">
            {mail ? (
              <>
                <div className="customer-detail-head">
                  <div className="min-w-0"><strong title={mail.subject}>{mail.subject}</strong><span>From: {mail.fromEmail} · 收件：{formatDateTime(mail.receivedAt, locale)}</span></div>
                  <Badge variant="slate">{mailStatus(tasks.filter((task) => task.mailMessageId === mail.id))}</Badge>
                </div>
                <div className="customer-mail-body">
                  {mail.bodyHtml ? <SafeHtmlBody mail={mail} /> : <>{normalizeMailBody(mail.bodyText) || "邮件正文为空；本次业务内容由附件提供。"}<MailImages mail={mail} /></>}
                </div>
              </>
            ) : <p className="item-meta">请选择一封邮件。</p>}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="panel scroll-panel">
      <div className="panel-head">
        <h2 className="panel-title">{t.mailBody}</h2>
      </div>
      <div className="panel-body stack">
        {mail ? (
          <>
            <Card>
              <div className="row">
                <CardTitle>{mail.subject}</CardTitle>
                {(mail.customerName || mail.customerId) && (
                  <Badge variant="blue">{customerLabelFromId(customers, mail.customerId, mail.customerName)}</Badge>
                )}
              </div>
              <CardDescription>
                From: {mail.fromEmail} · {t.receivedAt}: {formatDateTime(mail.receivedAt, locale)}
              </CardDescription>
            </Card>
            <div className="mail-body" style={mail.bodyHtml ? undefined : { whiteSpace: "pre-line" }}>
              {mail.bodyHtml ? <SafeHtmlBody mail={mail} /> : <>{normalizeMailBody(mail.bodyText) || "邮件正文为空；本次业务内容由附件提供。"}<MailImages mail={mail} /></>}
            </div>
          </>
        ) : (
          <p className="item-meta">{t.noMail}</p>
        )}
      </div>
    </section>
  );
}

function SafeHtmlBody({ mail }: { mail: WorkspaceMail }) {
  const sanitized = useMemo(() => {
    let html = mail.bodyHtml;
    const cidMap = new Map<string, string>();
    for (const img of mail.inlineImages ?? []) {
      cidMap.set(img.imageId, `${BACKEND_URL}/api/files/${img.fileArtifactId}/content`);
    }
    html = html.replace(/src=["']cid:([^"']+)["']/gi, (match, cid: string) => {
      const url = cidMap.get(cid);
      return url ? `src="${url}"` : match;
    });
    return DOMPurify.sanitize(html, {
      ADD_TAGS: ["style"],
      ADD_ATTR: ["target"],
      FORBID_TAGS: ["script", "iframe", "object", "embed", "form"],
      FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
    });
  }, [mail.bodyHtml, mail.inlineImages]);

  return <div className="mail-html-viewer" dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

function mailStatus(tasks: WorkspaceTask[]) {
  if (tasks.some((task) => task.status === "failed")) return "解析失败";
  if (tasks.some((task) => task.status === "waiting_human_decision")) return "待人工确认";
  if (tasks.some((task) => task.status === "processing" || task.status === "running")) return "处理中";
  if (tasks.some((task) => task.status === "completed" || task.status === "published")) return "已生成草稿";
  return "待处理";
}

function normalizeMailBody(value: string | null | undefined) {
  return (value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/^[^\S\n]+$/gm, "")
    .replace(/\n{2,}/g, "\n\n")
    .trim();
}

function MailImages({ mail }: { mail: WorkspaceMail }) {
  const seenIds = new Set<string>();
  const allImages: { key: string; artifactId: string; alt: string }[] = [];

  for (const img of mail.inlineImages ?? []) {
    if (!seenIds.has(img.fileArtifactId)) {
      seenIds.add(img.fileArtifactId);
      allImages.push({ key: img.imageId, artifactId: img.fileArtifactId, alt: "inline" });
    }
  }

  for (const att of mail.attachments) {
    if (att.contentType?.startsWith("image/") && att.fileArtifactId && !seenIds.has(att.fileArtifactId)) {
      seenIds.add(att.fileArtifactId);
      allImages.push({ key: att.attachmentId, artifactId: att.fileArtifactId, alt: att.fileName });
    }
  }

  if (allImages.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
      {allImages.map((img) => (
        // eslint-disable-next-line @next/next/no-img-element -- Email artifact URLs and dimensions are only known at runtime; preserve the original image response without Next.js optimization.
        <img
          key={img.key}
          src={`${BACKEND_URL}/api/files/${img.artifactId}/content`}
          alt={img.alt}
          style={{ maxWidth: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 4, alignSelf: "flex-start" }}
        />
      ))}
    </div>
  );
}
