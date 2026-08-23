"use client";

import type { WorkspaceMail, WorkspaceTask } from "@/services/inbox";
import { Card } from "@/components/ui/card";
import { ClipboardList } from "lucide-react";
import { type Locale, copy } from "../../../_components/shared";

type SummaryPanelProps = {
  locale: Locale;
  loading: boolean;
  error: string | null;
  mails: WorkspaceMail[];
  tasks: WorkspaceTask[];
};

export function SummaryPanel({
  locale,
  loading,
  error,
  mails,
  tasks,
}: SummaryPanelProps) {
  const t = copy[locale];
  const pendingMailIds = new Set(tasks.filter((task) => ["queued", "running", "processing", "waiting_human_decision", "failed"].includes(task.status)).map((task) => task.mailMessageId));
  const failedMailIds = new Set(tasks.filter((task) => task.status === "failed").map((task) => task.mailMessageId));
  const reviewMailIds = new Set(tasks.filter((task) => task.status === "waiting_human_decision" && task.pipelineStep !== "ready_to_publish").map((task) => task.mailMessageId));
  const mergeMailIds = new Set(tasks.filter((task) => task.status === "waiting_human_decision" && task.pipelineStep === "ready_to_publish").map((task) => task.mailMessageId));
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
          <div className="metric">
            <div className="metric-value">{mergeMailIds.size}</div>
            <div className="metric-label">待合并确认</div>
          </div>
        </div>
        <Card>
          <p className="mini-title">当前待办</p>
          <div className="service-priority-list">
            <div><span>解析失败</span><strong>{failedMailIds.size}</strong><small>优先检查文件与 Sheet</small></div>
            <div><span>待业务确认</span><strong>{reviewMailIds.size}</strong><small>核对物料、日期和数量</small></div>
            <div><span>可生成预览</span><strong>{mergeMailIds.size}</strong><small>确认后手动 Merge</small></div>
          </div>
        </Card>
      </div>
    </aside>
  );
}
