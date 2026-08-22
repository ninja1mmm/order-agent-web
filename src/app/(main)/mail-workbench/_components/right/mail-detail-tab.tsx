"use client";

import { Badge } from "@/components/ui/badge";
import type { WorkspaceMail, MailTaskSummary } from "@/types/models/inbox";
import type { Locale } from "../../../_components/shared";
import { taskStatusLabel } from "../../../_components/shared";
import type { TabItem } from "../mail-workbench-page";

type Props = {
  mail: WorkspaceMail | null;
  tasks: MailTaskSummary[];
  locale: Locale;
  onOpenTab: (tab: TabItem) => void;
};

export function MailDetailTab({ mail, tasks, locale, onOpenTab }: Props) {
  if (!mail) {
    return (
      <div style={{ padding: 24, color: "var(--muted)", fontSize: 13 }}>
        {locale === "en" ? "Select a mail to view details" : "选择一封邮件查看详情"}
      </div>
    );
  }

  const bodyTask = tasks.find((t) => t.attachmentId === null);

  const handleBodyClick = () => {
    if (!bodyTask) return;
    onOpenTab({
      id: `body-${mail.id}`,
      label: locale === "en" ? "Mail Body" : "邮件原文",
      type: "body",
      taskId: bodyTask.id,
    });
  };

  const handleAttachmentClick = (attachmentId: string, fileName: string) => {
    const attTask = tasks.find((t) => t.attachmentId === attachmentId);
    onOpenTab({
      id: `att-${attachmentId}`,
      label: fileName,
      type: "attachment",
      attachmentId,
      taskId: attTask?.id,
    });
  };

  return (
    <div className="mail-detail-layout">
      <div className="mail-detail-body-section">
        <div
          className={`mail-detail-body${bodyTask ? " clickable" : ""}`}
          onClick={bodyTask ? handleBodyClick : undefined}
        >
          {mail.bodyText || (locale === "en" ? "(empty body)" : "(空邮件正文)")}
        </div>
      </div>

      {mail.attachments.length > 0 && (
        <div className="mail-detail-attachments-section">
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 8 }}>
            {locale === "en" ? "Attachments" : "附件"} ({mail.attachments.length})
          </div>
          <div className="mail-detail-attachments">
            {mail.attachments.map((att) => {
              const attTasks = tasks.filter((t) => t.attachmentId === att.attachmentId);
              return (
                <div
                  key={att.attachmentId}
                  className="attachment-info-card"
                  onClick={() => handleAttachmentClick(att.attachmentId, att.fileName)}
                >
                  <div>
                    <div className="att-name">{att.fileName}</div>
                    <div className="att-meta">{att.contentType}</div>
                  </div>
                  <div className="att-tasks">
                    {attTasks.map((t) => (
                      <Badge
                        key={t.id}
                        variant={statusBadgeVariant(t.status)}
                        style={{ fontSize: 10 }}
                      >
                        {t.targetSheetName ? `${t.targetSheetName}: ` : ""}
                        {taskStatusLabel(t.status, locale)}
                      </Badge>
                    ))}
                    {attTasks.length === 0 && (
                      <Badge variant="slate" style={{ fontSize: 10 }}>
                        {locale === "en" ? "Not parsed" : "未解析"}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function statusBadgeVariant(status: string): "green" | "red" | "amber" | "blue" | "slate" {
  switch (status) {
    case "completed":
    case "published":
      return "green";
    case "failed":
      return "red";
    case "waiting_human_decision":
      return "amber";
    case "processing":
    case "running":
      return "blue";
    default:
      return "slate";
  }
}
