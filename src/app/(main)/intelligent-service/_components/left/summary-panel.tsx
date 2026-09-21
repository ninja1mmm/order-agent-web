"use client";

import { ClipboardList } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { WorkspaceStats } from "@/services/inbox";
import type { Locale } from "../../../_components/shared";
import type { MailFilter, PendingCategory } from "../mail-filters";

type SummaryPanelProps = {
  locale: Locale;
  loading: boolean;
  error: string | null;
  stats: WorkspaceStats | null;
  filter: MailFilter;
  onSelectCategory: (category: PendingCategory) => void;
};

export function SummaryPanel({ locale, loading, error, stats, filter, onSelectCategory }: SummaryPanelProps) {
  const isEnglish = locale === "en";
  const processing = stats?.processingMailCount ?? 0;
  const completed = stats?.completedMailCount ?? 0;
  const customers = stats?.customerCount ?? 0;
  const failed = stats?.failedMailCount ?? 0;
  const review = stats?.reviewMailCount ?? 0;
  const merge = stats?.mergeMailCount ?? 0;

  return (
    <aside className="panel scroll-panel">
      <div className="panel-head">
        <h2 className="panel-title"><ClipboardList className="h-4 w-4" />{isEnglish ? "Mail overview" : "邮件处理概览"}</h2>
      </div>
      <div className="panel-body stack scrollbar-hidden">
        {loading ? <p className="item-meta">{isEnglish ? "Loading..." : "正在加载..."}</p> : null}
        {error ? <p className="item-meta" role="alert">{error}</p> : null}
        <div className="metric-grid">
          <div className="metric"><div className="metric-value">{completed}</div><div className="metric-label">{isEnglish ? "Completed mails" : "累计处理完成"}</div></div>
          <div className="metric"><div className="metric-value">{customers}</div><div className="metric-label">{isEnglish ? "Customers" : "涉及客户"}</div></div>
          <div className="metric"><div className="metric-value">{processing}</div><div className="metric-label">{isEnglish ? "Pending mails" : "待处理邮件"}</div></div>
          <div className="metric"><div className="metric-value">{merge}</div><div className="metric-label">{isEnglish ? "Awaiting merge" : "待合并数据"}</div></div>
        </div>
        <Card>
          <p className="mini-title">{isEnglish ? "Current queue" : "当前待办"}</p>
          <div className="service-priority-list">
            <button type="button" className={filter?.kind === "category" && filter.category === "failed" ? "selected" : ""} aria-pressed={filter?.kind === "category" && filter.category === "failed"} onClick={() => onSelectCategory("failed")}><span>{isEnglish ? "Parse failed" : "解析失败"}</span><strong>{failed}</strong><small>{isEnglish ? "Check the source file or sheet" : "优先检查文件与 Sheet"}</small></button>
            <button type="button" className={filter?.kind === "category" && filter.category === "review" ? "selected" : ""} aria-pressed={filter?.kind === "category" && filter.category === "review"} onClick={() => onSelectCategory("review")}><span>{isEnglish ? "Needs handling" : "待人工处理"}</span><strong>{review}</strong><small>{isEnglish ? "Review extracted business data" : "核对解析结果、物料、日期和数量"}</small></button>
            <button type="button" className={filter?.kind === "category" && filter.category === "merge" ? "selected" : ""} aria-pressed={filter?.kind === "category" && filter.category === "merge"} onClick={() => onSelectCategory("merge")}><span>{isEnglish ? "Awaiting merge" : "待合并数据"}</span><strong>{merge}</strong><small>{isEnglish ? "Review and confirm the final merge" : "核对预览后完成合并确认"}</small></button>
          </div>
        </Card>
      </div>
    </aside>
  );
}
