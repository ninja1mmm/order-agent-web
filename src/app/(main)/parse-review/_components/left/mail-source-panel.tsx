"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Bot, ChevronDown, FileSpreadsheet, FileText, Mail } from "lucide-react";
import type { MailTaskListResponse, WorkspaceMail, WorkspaceTask } from "@/services/inbox";
import { formatDateTime, type Locale, taskStatusLabel } from "../../../_components/shared";

type MailSourcePanelProps = {
  locale: Locale;
  mail: WorkspaceMail | undefined;
  tasks: WorkspaceTask[];
  selectedTaskId: string | undefined;
  activeBody: boolean;
  activeAttachmentId: string | null;
  taskList: MailTaskListResponse | null;
  busyTaskId: string | null;
  onSelectBody: () => void;
  onSelectAttachment: (attachmentId: string, sheetName?: string) => void;
  onSelectTask: (taskId: string) => void;
  onToggleExcluded: (taskId: string, excluded: boolean) => void;
};

export function MailSourcePanel({
  locale, mail, tasks, selectedTaskId, activeBody, activeAttachmentId, taskList,
  busyTaskId, onSelectBody, onSelectAttachment, onSelectTask, onToggleExcluded,
}: MailSourcePanelProps) {
  const taskMeta = useMemo(() => new Map((taskList?.tasks ?? []).map((task) => [task.id, task])), [taskList]);
  const bodyTasks = tasks.filter((task) => task.attachmentId === null);

  return (
    <aside className="panel scroll-panel parse-source-panel">
      <div className="panel-head parse-source-mail-head">
        <div className="source-tree-title"><strong title={mail?.subject}>{mail?.subject ?? "邮件解析确认"}</strong><span>{mail ? formatDateTime(mail.receivedAt, locale) : "未找到邮件"}</span></div>
      </div>
      <div className="panel-body source-tree scrollbar-hidden">
        {!mail ? <p className="item-meta">未找到邮件。</p> : null}
        {mail ? (
          <SourceGroup title="邮件正文" icon={<Mail className="h-3.5 w-3.5" />} subtitle="Email Body" active={activeBody} defaultOpen onActivate={onSelectBody}>
            {bodyTasks.length ? bodyTasks.map((task) => (
              <TaskNode key={task.id} locale={locale} task={task} selected={task.id === selectedTaskId} excluded={taskMeta.get(task.id)?.excluded ?? false} busy={busyTaskId === task.id} onSelect={onSelectTask} onToggleExcluded={onToggleExcluded} />
            )) : <p className="source-empty">正文没有解析任务</p>}
          </SourceGroup>
        ) : null}

        {mail?.attachments.filter((attachment) => !attachment.contentType?.startsWith("image/") && !isZip(attachment.fileName, attachment.contentType)).map((attachment) => {
          const attachmentTasks = tasks.filter((task) => task.attachmentId === attachment.attachmentId);
          const excel = isExcel(attachment.fileName);
          const summaryStatus = attachmentTaskStatus(attachmentTasks);

          return (
            <SourceGroup key={attachment.attachmentId} title={attachment.fileName} icon={excel ? <FileSpreadsheet className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />} subtitle={excel ? "Excel 附件" : isPdf(attachment.fileName, attachment.contentType) ? "PDF 附件" : "邮件附件"} statusLabel={summaryStatus ? taskStatusLabel(summaryStatus, locale) : undefined} status={summaryStatus} active={activeAttachmentId === attachment.attachmentId} defaultOpen={attachmentTasks.some((task) => task.id === selectedTaskId)} onActivate={() => onSelectAttachment(attachment.attachmentId)}>
              {attachmentTasks.map((task) => <TaskNode key={task.id} locale={locale} task={task} selected={task.id === selectedTaskId} excluded={taskMeta.get(task.id)?.excluded ?? false} busy={busyTaskId === task.id} onSelect={onSelectTask} onToggleExcluded={onToggleExcluded} />)}
              {attachmentTasks.length === 0 ? <p className="source-empty">此附件尚无解析任务</p> : null}
            </SourceGroup>
          );
        })}
      </div>
    </aside>
  );
}

function SourceGroup({ title, subtitle, statusLabel, status, icon, active, defaultOpen = false, onActivate, children }: { title: string; subtitle?: string; statusLabel?: string; status?: string | null; icon: ReactNode; active?: boolean; defaultOpen?: boolean; onActivate: () => void; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={`source-group${active ? " active" : ""}`}>
      <button type="button" className="source-group-head" aria-expanded={open} onClick={() => { onActivate(); setOpen((value) => !value); }}>{icon}<span className="source-group-copy"><strong title={title}>{title}</strong><span className="source-group-meta">{subtitle ? <small>{subtitle}</small> : null}<span className={`source-group-status ${status ?? ""}${statusLabel ? "" : " empty"}`}>{statusLabel}</span></span></span><ChevronDown className={`h-3.5 w-3.5${open ? " is-open" : ""}`} /></button>
      {open ? <div className="source-group-body">{children}</div> : null}
    </section>
  );
}

function TaskNode({ locale, task, selected, excluded, busy, onSelect, onToggleExcluded }: { locale: Locale; task: WorkspaceTask; selected: boolean; excluded: boolean; busy: boolean; onSelect: (taskId: string) => void; onToggleExcluded: (taskId: string, excluded: boolean) => void }) {
  return (
    <div className={`source-task${selected ? " selected" : ""}${excluded ? " excluded" : ""}`}>
      <button type="button" onClick={() => onSelect(task.id)}><Bot className="h-3.5 w-3.5" /><span className="source-task-copy"><span className="source-task-title">{task.targetSheetName || (task.attachmentId ? "附件解析" : "正文解析")}</span><small>{taskStatusLabel(task.status, locale)}</small></span></button>
      <div className="source-task-actions"><button type="button" className="source-scope-toggle" disabled={busy} onClick={() => onToggleExcluded(task.id, !excluded)}>{excluded ? "纳入" : "排除"}</button></div>
    </div>
  );
}

function isExcel(fileName: string) { return /\.(xlsx|xlsm|xls)$/i.test(fileName); }
function isPdf(fileName: string, contentType: string | null | undefined) { return contentType === "application/pdf" || /\.pdf$/i.test(fileName); }
function isZip(fileName: string, contentType: string | null | undefined) { return contentType === "application/zip" || /\.zip$/i.test(fileName); }

function attachmentTaskStatus(tasks: WorkspaceTask[]): string | null {
  if (tasks.length === 0) return null;
  if (tasks.every((task) => task.status === "completed" || task.status === "published")) return "completed";
  if (tasks.some((task) => task.status === "waiting_human_decision")) return "waiting_human_decision";
  if (tasks.some((task) => task.status === "failed")) return "failed";
  if (tasks.some((task) => task.status === "processing" || task.status === "running")) return "processing";
  return tasks[0].status;
}
