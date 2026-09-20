"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, FileText, Paperclip, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { BACKEND_URL } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WorkspaceMail, WorkspaceTask } from "@/services/inbox";
import { resyncMail } from "@/services/mail";
import {
  type Locale,
  copy,
  taskStatusLabel,
  translatePipelineSummary,
} from "../../../_components/shared";
import { docTypeBadge, docTypeLabel, parseReviewStatus, truncateMiddle } from "../workbench-utils";

type RightPanelProps = {
  locale: Locale;
  mail: WorkspaceMail | undefined;
  tasks: WorkspaceTask[];
  parsingIds: Set<string>;
  onParse: (mailId: string, attachmentIds: string[]) => void;
  onRefresh: () => void;
};

export function RightPanel({ locale, mail, tasks, parsingIds, onParse, onRefresh }: RightPanelProps) {
  const t = copy[locale];
  const mailId = mail?.id;
  const [isSyncing, setIsSyncing] = useState(false);
  const bodyTasks = tasks.filter((task) => task.attachmentId === null);
  const visibleAttachments = [...(mail?.attachments.filter((attachment) => !attachment.contentType?.startsWith("image/")) ?? [])]
    .sort((a, b) => Number(isArchiveAttachment(a.fileName, a.contentType)) - Number(isArchiveAttachment(b.fileName, b.contentType)));
  const archiveAttachmentIds = new Set(visibleAttachments.filter((attachment) => isArchiveAttachment(attachment.fileName, attachment.contentType)).map((attachment) => attachment.attachmentId));
  const pendingCount = tasks.filter((task) => !task.attachmentId || !archiveAttachmentIds.has(task.attachmentId)).filter((task) => task.status === "waiting_human_decision" || task.status === "failed").length;

  const handleResync = async () => {
    if (!mailId || isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await resyncMail(mailId);
      toast.success(result.message);
      onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "同步失败");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <aside className="panel scroll-panel">
      <div className="panel-head">
        <h2 className="panel-title"><Paperclip className="h-4 w-4" />本邮件解析结果</h2>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Badge variant={pendingCount ? "amber" : "slate"}>{pendingCount ? `${pendingCount} 待确认` : `${tasks.length} 个任务`}</Badge>
          {mailId ? (
            <Button variant="default" size="icon-sm" className="workbench-icon-button" aria-label="同步邮件" title="从邮件服务器重新同步" disabled={isSyncing} onClick={handleResync}>
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            </Button>
          ) : null}
        </span>
      </div>
      <div className="panel-body stack">
        {bodyTasks.length ? bodyTasks.map((task) => (
            <BodyTaskResult key={task.id} locale={locale} mailId={mail?.id} task={task} onParse={onParse} />
          )) : mail ? <BodySourceResult bodyText={mail.bodyText} /> : null}
        {visibleAttachments.map((attachment) => {
          const task = tasks.find((item) => item.attachmentId === attachment.attachmentId);
          const archive = isArchiveAttachment(attachment.fileName, attachment.contentType);
          if (archive) {
            return (
              <div className="result-block archive-result-block" key={attachment.attachmentId}>
                <div className="result-title">
                  <Paperclip className="result-type-icon" aria-hidden="true" />
                  <span className="result-name" title={attachment.fileName}>{truncateMiddle(attachment.fileName)}</span>
                </div>
                <div className="result-footer archive-result-footer">
                  <span className="item-meta">压缩附件</span>
                  {attachment.fileArtifactId ? (
                    <a className="archive-download-button" href={`${BACKEND_URL}/api/files/${attachment.fileArtifactId}/content`} download={attachment.fileName} aria-label={`${t.download} ${attachment.fileName}`}><Download className="h-3.5 w-3.5" />{t.download}</a>
                  ) : <span className="item-meta">文件不可下载</span>}
                </div>
              </div>
            );
          }
          const dtype = attachment.documentType || task?.taskType?.replace("extract_", "") || null;
          const isSkipped = attachment.status === "skipped" || task?.status === "skipped";
          const targetLabel = dtype && docTypeLabel[dtype] ? docTypeLabel[dtype][locale] : null;
          const targetBadgeVariant = dtype && docTypeBadge[dtype] ? docTypeBadge[dtype] : "slate";
          const isParsing = parsingIds.has(attachment.attachmentId);
          const canStartParse = task?.status === "waiting_human_decision";
          const canReparse = task?.status === "completed" || attachment.status === "published" || task?.status === "failed" || task?.status === "cancelled";
          const showParseButton = canStartParse || canReparse || isParsing;
          const reviewHref = task?.id && mailId
            ? `/parse-review?mailId=${encodeURIComponent(mailId)}&attachmentId=${encodeURIComponent(attachment.attachmentId)}&taskId=${encodeURIComponent(task.id)}&status=${encodeURIComponent(parseReviewStatus(task.status))}`
            : "";
          const reviewLabel = task?.status === "completed" || task?.status === "published" ? "查看合并结果" : "进入解析确认";

          return (
            <div className="result-block" key={attachment.attachmentId}>
              <div className="result-title">
                <Paperclip className="result-type-icon" aria-hidden="true" />
                <span className="result-name" title={attachment.fileName}>
                  {truncateMiddle(attachment.fileName)}
                  <a
                    className="icon-link"
                    href={attachment.fileArtifactId ? `${BACKEND_URL}/api/files/${attachment.fileArtifactId}/content` : "#"}
                    download={attachment.fileName}
                    aria-label={`${t.download} ${attachment.fileName}`}
                  >
                    <Download className="h-3 w-3" />
                  </a>
                </span>
                {targetLabel && !isSkipped && (
                  <Badge variant={targetBadgeVariant}>{targetLabel}</Badge>
                )}
              </div>
              {task?.status === "waiting_human_decision" && task.reviewSummary?.reason ? (
                <div className="review-reason-hint">{translatePipelineSummary(task.reviewSummary.reason)}</div>
              ) : null}
              {isSkipped ? <div className="result-scope-note">已保留为邮件附件，可下载，不参与本次订单解析。</div> : null}
              <div className="result-footer">
                <span className="item-meta">{taskStatusLabel(task?.status ?? attachment.status, locale)}</span>
                <div className="result-actions">
                  {showParseButton && mailId ? (
                    <Button
                      variant={isParsing ? "primary" : "default"}
                      size="sm"
                      className={`workbench-pill-button${isParsing ? " btn-parsing" : ""}`}
                      onClick={() => onParse(mailId, [attachment.attachmentId])}
                    >
                      {isParsing ? "解析中..." : canReparse ? t.reparse : t.trigger}
                    </Button>
                  ) : null}
                  {reviewHref ? (
                    <Link href={reviewHref}>
                      <Button variant={task?.status === "waiting_human_decision" ? "primary" : "default"} size="sm" className="workbench-pill-button">{reviewLabel}</Button>
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function BodySourceResult({ bodyText }: { bodyText: string | null | undefined }) {
  return (
    <div className="result-block body-source-result">
      <div className="result-title">
        <FileText className="result-type-icon" aria-hidden="true" />
        <span className="result-name">Email Body</span>
      </div>
      <div className="result-footer">
        <span className="item-meta">{bodyText?.trim() ? "未生成解析任务" : "正文为空"}</span>
      </div>
    </div>
  );
}

function isArchiveAttachment(fileName: string, contentType: string | null | undefined) {
  return /\.(zip|rar|7z|tar|gz)$/i.test(fileName) || /(zip|compressed|archive|x-7z|x-rar)/i.test(contentType ?? "");
}

function BodyTaskResult({
  locale,
  mailId,
  task,
  onParse,
}: {
  locale: Locale;
  mailId: string | undefined;
  task: WorkspaceTask;
  onParse: (mailId: string, attachmentIds: string[]) => void;
}) {
  const t = copy[locale];
  const dtype = task.taskType?.replace("extract_", "") || null;
  const targetLabel = dtype && docTypeLabel[dtype] ? docTypeLabel[dtype][locale] : null;
  const targetBadgeVariant = dtype && docTypeBadge[dtype] ? docTypeBadge[dtype] : "slate";
  const canReparse = task.status === "completed" || task.status === "published" || task.status === "failed" || task.status === "cancelled";
  const canStartParse = task.status === "waiting_human_decision";
  const showParseButton = canStartParse || canReparse;
  const reviewHref = task.id
    ? `/parse-review?mailId=${encodeURIComponent(mailId ?? "")}&taskId=${encodeURIComponent(task.id)}&status=${encodeURIComponent(parseReviewStatus(task.status))}`
    : "";
  const reviewLabel = task.status === "completed" || task.status === "published" ? "查看合并结果" : "进入解析确认";

  return (
    <div className="result-block">
      <div className="result-title">
        <FileText className="result-type-icon" aria-hidden="true" />
        <span className="result-name">Email Body</span>
        {targetLabel && (
          <Badge variant={targetBadgeVariant}>{targetLabel}</Badge>
        )}
      </div>
      {task.status === "waiting_human_decision" && task.reviewSummary?.reason ? (
        <div className="review-reason-hint">{translatePipelineSummary(task.reviewSummary.reason)}</div>
      ) : null}
      <div className="result-footer">
        <span className="item-meta">{taskStatusLabel(task.status, locale)}</span>
        <div className="result-actions">
          {showParseButton && mailId ? (
            <Button variant="default" size="sm" className="workbench-pill-button" onClick={() => onParse(mailId, [])}>
              {canReparse ? t.reparse : t.trigger}
            </Button>
          ) : null}
          {reviewHref ? (
            <Link href={reviewHref}>
              <Button variant={task.status === "waiting_human_decision" ? "primary" : "default"} size="sm" className="workbench-pill-button">{reviewLabel}</Button>
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
