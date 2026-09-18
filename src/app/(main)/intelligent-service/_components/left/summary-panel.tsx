"use client";

import type { WorkspaceMail, WorkspaceTask } from "@/services/inbox";
import { Card } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import { type Locale, copy } from "../../../_components/shared";
import { ACTIVE_MAIL_STATUSES, mailPendingCategory, type MailFilter, type PendingCategory } from "../mail-filters";

type SummaryPanelProps = {
  locale: Locale;
  loading: boolean;
  error: string | null;
  mails: WorkspaceMail[];
  tasks: WorkspaceTask[];
  filter: MailFilter;
  onSelectCategory: (category: PendingCategory) => void;
};

export function SummaryPanel({
  locale,
  loading,
  error,
  mails,
  tasks,
  filter,
  onSelectCategory,
}: SummaryPanelProps) {
  const t = copy[locale];
  const loadedMailIds = new Set(mails.map((mail) => mail.id));
  const pendingMailIds = new Set(tasks.filter((task) => loadedMailIds.has(task.mailMessageId) && ACTIVE_MAIL_STATUSES.has(task.status)).map((task) => task.mailMessageId));
  const mailTasks = new Map<string, WorkspaceTask[]>();
  for (const task of tasks) {
    if (!loadedMailIds.has(task.mailMessageId)) continue;
    const grouped = mailTasks.get(task.mailMessageId) ?? [];
    grouped.push(task);
    mailTasks.set(task.mailMessageId, grouped);
  }
  const failedMailIds = new Set<string>();
  const reviewMailIds = new Set<string>();
  const mergeMailIds = new Set<string>();
  for (const [mailId, grouped] of mailTasks) {
    const category = mailPendingCategory(grouped);
    if (category === "failed") failedMailIds.add(mailId);
    else if (category === "review") reviewMailIds.add(mailId);
    else if (category === "merge") mergeMailIds.add(mailId);
  }
  const completedTasks = tasks.filter((task) => ["completed", "published"].includes(task.status)).length;
  const involvedCustomers = new Set(mails.map((mail) => mail.customerId || mail.customerName).filter(Boolean)).size;

  return (
    <aside className="panel scroll-panel">
      <div className="panel-head">
        <h2 className="panel-title"><ClipboardList className="h-4 w-4" />近期工作总结</h2>
      </div>
      <div className="panel-body stack">
        {loading ? <p className="item-meta">Loading...</p> : null}
        {error ? <p className="item-meta">{error}</p> : null}
        <div className="metric-grid">
          <div className="metric">
            <div className="metric-value">{completedTasks}</div>
            <div className="metric-label">累计完成解析</div>
          </div>
          <div className="metric">
            <div className="metric-value">{involvedCustomers}</div>
            <div className="metric-label">{t.involvedCustomers}</div>
          </div>
          <div className="metric">
            <div className="metric-value">{pendingMailIds.size}</div>
            <div className="metric-label">待处理邮件</div>
          </div>
          <div className="metric" title="流程已到最终合并前，请先核对预览并手动确认">
            <div className="metric-value">{mergeMailIds.size}</div>
            <div className="metric-label">待合并确认</div>
          </div>
        </div>
        <Card>
          <p className="mini-title">当前待办</p>
          <div className="service-priority-list">
            <button type="button" className={filter?.kind === "category" && filter.category === "failed" ? "selected" : ""} aria-pressed={filter?.kind === "category" && filter.category === "failed"} onClick={() => onSelectCategory("failed")}>
              <span>解析失败</span><strong>{failedMailIds.size}</strong><small>优先检查文件与 Sheet</small>
            </button>
            <button type="button" className={filter?.kind === "category" && filter.category === "review" ? "selected" : ""} aria-pressed={filter?.kind === "category" && filter.category === "review"} title="需要人工核对或处理，未必表示数据有错误" onClick={() => onSelectCategory("review")}>
              <span>待人工确认</span><strong>{reviewMailIds.size}</strong><small>核对解析结果、物料、日期和数量</small>
            </button>
            <button type="button" className={filter?.kind === "category" && filter.category === "merge" ? "selected" : ""} aria-pressed={filter?.kind === "category" && filter.category === "merge"} title="流程已到最终合并前，仍需人工核对预览" onClick={() => onSelectCategory("merge")}>
              <span>待合并确认</span><strong>{mergeMailIds.size}</strong><small>核对预览后手动合并</small>
            </button>
          </div>
        </Card>
      </div>
    </aside>
  );
}
