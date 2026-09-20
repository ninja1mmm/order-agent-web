"use client";

import { useState, type UIEvent } from "react";
import Link from "next/link";
import { ArrowRight, Mail, RefreshCw, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WorkspaceMail, WorkspaceTask } from "@/services/inbox";
import type { CustomerConfig } from "@/services/settings";
import { backendDateMs, beijingDateKey, type Locale, customerLabelFromId, customerMailKey, formatDateTime } from "../../../_components/shared";
import { ACTIVE_MAIL_STATUSES, mailPendingCategory, type MailFilter } from "../mail-filters";

type PendingMailsPanelProps = {
  locale: Locale;
  mails: WorkspaceMail[];
  tasks: WorkspaceTask[];
  customers: CustomerConfig[];
  filter: MailFilter;
  onClearFilter: () => void;
  onRefresh: () => void;
};

const PAGE_SIZE = 20;

export function PendingMailsPanel({ locale, mails, tasks, customers, filter, onClearFilter, onRefresh }: PendingMailsPanelProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const tasksByMail = new Map<string, WorkspaceTask[]>();
  for (const task of tasks) {
    const mailTasks = tasksByMail.get(task.mailMessageId) ?? [];
    mailTasks.push(task);
    tasksByMail.set(task.mailMessageId, mailTasks);
  }
  const filteredMails = mails
    .map((mail) => ({ mail, tasks: tasksByMail.get(mail.id) ?? [] }))
    .filter(({ mail, tasks: mailTasks }) => {
      if (filter?.kind === "customer-day") {
        return customerMailKey(mail, customers) === filter.customerKey && beijingDateKey(mail.receivedAt) === filter.date;
      }
      if (filter?.kind === "category") return mailPendingCategory(mailTasks) === filter.category;
      return mailTasks.some((task) => ACTIVE_MAIL_STATUSES.has(task.status));
    })
    .sort((a, b) => backendDateMs(b.mail.receivedAt) - backendDateMs(a.mail.receivedAt) || b.mail.id.localeCompare(a.mail.id));
  const visibleMails = filteredMails.slice(0, visibleCount);
  const filterLabel = filter?.kind === "category"
    ? categoryLabel(filter.category, locale)
    : filter?.kind === "customer-day"
      ? `${filter.customerLabel} · ${filter.date}`
      : null;

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const panel = event.currentTarget;
    if (panel.scrollHeight - panel.scrollTop - panel.clientHeight < 120) {
      setVisibleCount((count) => Math.min(count + PAGE_SIZE, filteredMails.length));
    }
  }

  return (
    <aside className="panel scroll-panel">
      <div className="panel-head">
        <h2 className="panel-title"><Mail className="h-4 w-4" />{filter?.kind === "customer-day" ? (locale === "en" ? "Customer mails" : "客户邮件") : (locale === "en" ? "Pending mails" : "待处理邮件")}</h2>
        <div className="panel-head-actions">
          <Badge variant={filteredMails.length > 0 ? "amber" : "default"}>{filteredMails.length}</Badge>
          <Button variant="ghost" size="icon" aria-label="刷新" onClick={onRefresh}><RefreshCw className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      <div className="panel-body stack scrollbar-hidden" onScroll={handleScroll}>
        {filterLabel ? (
          <div className="pending-mail-filter">
            <span title={filterLabel}>{locale === "en" ? "Filter: " : "筛选："}{filterLabel}</span>
            <button type="button" onClick={onClearFilter}><X className="h-3.5 w-3.5" />{locale === "en" ? "Clear" : "清除筛选"}</button>
          </div>
        ) : null}
        {visibleMails.map(({ mail, tasks: mailTasks }) => {
          const activeTasks = mailTasks.filter((task) => ACTIVE_MAIL_STATUSES.has(task.status));
          const focusTask = [...activeTasks].sort((a, b) => taskPriority(b) - taskPriority(a))[0] ?? mailTasks[0];
          const href = `/parse-review?mailId=${encodeURIComponent(mail.id)}${focusTask ? `&taskId=${encodeURIComponent(focusTask.id)}` : ""}`;

          return (
            <article className="pending-mail-card" key={mail.id}>
              <div className="pending-mail-card-head">
                <div className="min-w-0">
                  <p className="pending-mail-subject" title={mail.subject}>{mail.subject || "(无主题)"}</p>
                  <p className="item-meta">{customerLabelFromId(customers, mail.customerId, mail.customerName)} · {formatDateTime(mail.receivedAt, locale)}</p>
                </div>
                <Badge variant="slate" title={mailStageDescription(mailTasks, locale)}>{mailStage(mailTasks, locale)}</Badge>
              </div>
              <div className="result-footer">
                <span className="pending-mail-task-count">{filter?.kind === "customer-day"
                  ? (locale === "en" ? `${mailTasks.length} task(s)` : `${mailTasks.length} 个任务`)
                  : (locale === "en" ? `${activeTasks.length} pending task(s)` : `${activeTasks.length} 个待处理任务`)}</span>
                <Link className="pending-mail-link" href={href}>{filter?.kind === "customer-day" ? (locale === "en" ? "View mail" : "查看邮件") : (locale === "en" ? "Process tasks" : "处理任务")}<ArrowRight className="h-3.5 w-3.5" /></Link>
              </div>
            </article>
          );
        })}
        {visibleCount < filteredMails.length ? (
          <p className="item-meta text-center" aria-live="polite">
            {locale === "en" ? `Showing ${visibleMails.length} of ${filteredMails.length}; scroll for more` : `已显示 ${visibleMails.length} / ${filteredMails.length} 封，向下滚动继续加载`}
          </p>
        ) : null}
        {filteredMails.length === 0 ? <p className="item-meta">{filter?.kind === "customer-day" ? (locale === "en" ? "No mail from this customer on this day." : "该客户当天暂无邮件") : (locale === "en" ? "No pending mail matches this filter." : "当前筛选下暂无待处理邮件")}</p> : null}
      </div>
    </aside>
  );
}

function taskPriority(task: WorkspaceTask) {
  if (task.status === "failed") return 4;
  if (task.status === "waiting_human_decision" && task.pipelineStep !== "ready_to_publish") return 3;
  if (task.status === "waiting_human_decision") return 2;
  if (task.status === "processing" || task.status === "running") return 1;
  return 0;
}

function mailStage(tasks: WorkspaceTask[], locale: Locale) {
  const category = mailPendingCategory(tasks);
  if (category === "failed") return locale === "en" ? "Failed" : "解析失败";
  if (category === "review") return locale === "en" ? "Needs review" : "待人工确认";
  if (category === "merge") return locale === "en" ? "Ready to merge" : "待合并确认";
  if (tasks.some((task) => task.status === "processing" || task.status === "running")) return locale === "en" ? "Processing" : "处理中";
  if (tasks.some((task) => task.status === "queued")) return locale === "en" ? "Queued" : "待处理";
  if (tasks.some((task) => task.status === "published")) return locale === "en" ? "Merged" : "已合并";
  if (tasks.some((task) => task.status === "completed")) return locale === "en" ? "Completed" : "已完成";
  return locale === "en" ? "No task" : "无任务";
}

function mailStageDescription(tasks: WorkspaceTask[], locale: Locale) {
  const category = mailPendingCategory(tasks);
  if (category === "review") return locale === "en" ? "A task needs manual review of extracted business data." : "有任务需人工核对解析结果或业务数据";
  if (category === "merge") return locale === "en" ? "Review the preview and confirm the final merge." : "请核对预览，确认后手动合并";
  return undefined;
}

function categoryLabel(category: "failed" | "review" | "merge", locale: Locale) {
  if (category === "failed") return locale === "en" ? "Failed" : "解析失败";
  if (category === "review") return locale === "en" ? "Needs review" : "待人工确认";
  return locale === "en" ? "Ready to merge" : "待合并确认";
}
