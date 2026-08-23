"use client";

import Link from "next/link";
import { ArrowRight, Mail, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WorkspaceMail, WorkspaceTask } from "@/services/inbox";
import type { CustomerConfig } from "@/services/settings";
import { type Locale, customerLabelFromId, formatDateTime } from "../../../_components/shared";

type PendingMailsPanelProps = {
  locale: Locale;
  mails: WorkspaceMail[];
  tasks: WorkspaceTask[];
  customers: CustomerConfig[];
  onRefresh: () => void;
};

const ACTIVE_STATUSES = new Set(["queued", "running", "processing", "waiting_human_decision", "failed"]);

export function PendingMailsPanel({ locale, mails, tasks, customers, onRefresh }: PendingMailsPanelProps) {
  const pendingMails = mails
    .map((mail) => ({ mail, tasks: tasks.filter((task) => task.mailMessageId === mail.id) }))
    .filter((item) => item.tasks.some((task) => ACTIVE_STATUSES.has(task.status)))
    .sort((a, b) => priority(b.tasks) - priority(a.tasks));

  return (
    <aside className="panel scroll-panel">
      <div className="panel-head">
        <h2 className="panel-title"><Mail className="h-4 w-4" />{locale === "en" ? "Pending mails" : "待处理邮件"}</h2>
        <div className="panel-head-actions">
          <Badge variant={pendingMails.length > 0 ? "amber" : "default"}>{pendingMails.length}</Badge>
          <Button variant="ghost" size="icon" aria-label="刷新" onClick={onRefresh}><RefreshCw className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      <div className="panel-body stack">
        {pendingMails.map(({ mail, tasks: mailTasks }) => {
          const activeTasks = mailTasks.filter((task) => ACTIVE_STATUSES.has(task.status));
          const focusTask = [...activeTasks].sort((a, b) => priority([b]) - priority([a]))[0];
          const href = `/parse-review?mailId=${encodeURIComponent(mail.id)}${focusTask ? `&taskId=${encodeURIComponent(focusTask.id)}` : ""}`;

          return (
            <article className="pending-mail-card" key={mail.id}>
              <div className="pending-mail-card-head">
                <div className="min-w-0">
                  <p className="pending-mail-subject" title={mail.subject}>{mail.subject || "(无主题)"}</p>
                  <p className="item-meta">{customerLabelFromId(customers, mail.customerId, mail.customerName)} · {formatDateTime(mail.receivedAt, locale)}</p>
                </div>
                <Badge variant="slate">{mailStage(mailTasks, locale)}</Badge>
              </div>
              <div className="result-footer">
                <span className="pending-mail-task-count">{locale === "en" ? `${activeTasks.length} pending task(s)` : `${activeTasks.length} 个待处理任务`}</span>
                <Link className="pending-mail-link" href={href}>{locale === "en" ? "Process tasks" : "处理任务"}<ArrowRight className="h-3.5 w-3.5" /></Link>
              </div>
            </article>
          );
        })}
        {pendingMails.length === 0 ? <p className="item-meta">{locale === "en" ? "No pending mail." : "暂无待处理邮件"}</p> : null}
      </div>
    </aside>
  );
}

function priority(tasks: WorkspaceTask[]) {
  if (tasks.some((task) => task.status === "failed")) return 4;
  if (tasks.some((task) => task.status === "waiting_human_decision")) return 3;
  if (tasks.some((task) => task.status === "processing" || task.status === "running")) return 2;
  return 1;
}

function mailStage(tasks: WorkspaceTask[], locale: Locale) {
  if (tasks.some((task) => task.status === "failed")) return locale === "en" ? "Failed" : "解析失败";
  const review = tasks.find((task) => task.status === "waiting_human_decision");
  if (review?.pipelineStep === "ready_to_publish") return locale === "en" ? "Ready to merge" : "待合并确认";
  if (review) return locale === "en" ? "Needs review" : "待人工确认";
  if (tasks.some((task) => task.status === "processing" || task.status === "running")) return locale === "en" ? "Processing" : "处理中";
  return locale === "en" ? "Queued" : "待处理";
}
