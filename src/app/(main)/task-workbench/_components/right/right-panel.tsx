"use client";

import Link from "next/link";
import { Download, FileText, Paperclip } from "lucide-react";
import { BACKEND_URL } from "@/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WorkspaceMail, WorkspaceTask } from "@/services/inbox";
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
};

export function RightPanel({ locale, mail, tasks, parsingIds, onParse }: RightPanelProps) {
  const t = copy[locale];

  return (
    <aside className="panel scroll-panel">
      <div className="panel-head">
        <h2 className="panel-title">{t.aiAttachmentResults}</h2>
      </div>
      <div className="panel-body stack">
        {mail?.attachments.filter((attachment) => !attachment.contentType?.startsWith("image/")).map((attachment) => {
          const task = tasks.find((item) => item.attachmentId === attachment.attachmentId);
          const dtype = attachment.documentType || task?.taskType?.replace("extract_", "") || null;
          const isSkipped = attachment.status === "skipped" || task?.status === "skipped";
          const targetLabel = dtype && docTypeLabel[dtype] ? docTypeLabel[dtype][locale] : null;
          const targetBadgeVariant = dtype && docTypeBadge[dtype] ? docTypeBadge[dtype] : "slate";
          const isParsing = parsingIds.has(attachment.attachmentId);
          const canStartParse = task?.status === "waiting_human_decision";
          const canReparse = task?.status === "completed" || attachment.status === "published" || task?.status === "failed";
          const showParseButton = canStartParse || canReparse || isParsing;
          const reviewHref = task?.id
            ? `/parse-review?taskId=${encodeURIComponent(task.id)}&status=${encodeURIComponent(parseReviewStatus(task.status))}`
            : "";
          const reviewLabel = task?.status === "completed" || task?.status === "published" ? t.review : t.view;

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
              <div className="result-footer">
                <Badge variant="slate">{task ? taskStatusLabel(task.status, locale) : attachment.status}</Badge>
                <div className="result-actions">
                  {showParseButton ? (
                    <Button
                      variant={isParsing ? "primary" : "default"}
                      size="sm"
                      className={isParsing ? "btn-parsing" : ""}
                      onClick={() => onParse(mail.id, [attachment.attachmentId])}
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
            </div>
          );
        })}
        {tasks
          .filter((task) => task.attachmentId === null)
          .map((task) => (
            <BodyTaskResult key={task.id} locale={locale} mailId={mail?.id} task={task} onParse={onParse} />
          ))}
      </div>
    </aside>
  );
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
  const canReparse = task.status === "completed" || task.status === "published" || task.status === "failed";
  const canStartParse = task.status === "waiting_human_decision";
  const showParseButton = canStartParse || canReparse;
  const reviewHref = task.id
    ? `/parse-review?taskId=${encodeURIComponent(task.id)}&status=${encodeURIComponent(parseReviewStatus(task.status))}`
    : "";
  const reviewLabel = task.status === "completed" || task.status === "published" ? t.review : t.view;

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
        <Badge variant="slate">{taskStatusLabel(task.status, locale)}</Badge>
        <div className="result-actions">
          {showParseButton && mailId ? (
            <Button variant="default" size="sm" onClick={() => onParse(mailId, [])}>
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
    </div>
  );
}
