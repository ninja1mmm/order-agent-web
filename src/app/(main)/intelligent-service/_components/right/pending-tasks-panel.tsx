"use client";

import type { UIEvent } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle, Mail, RefreshCw, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WorkspaceMail } from "@/services/inbox";
import type { CustomerConfig } from "@/services/settings";
import { type Locale, customerLabelFromId, formatDateTime } from "../../../_components/shared";
import type { MailFilter } from "../mail-filters";

type PendingMailsPanelProps = {
  locale: Locale;
  mails: WorkspaceMail[];
  customers: CustomerConfig[];
  filter: MailFilter;
  total: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  onClearFilter: () => void;
  onRefresh: () => void;
  onLoadMore: () => void;
};

export function PendingMailsPanel({ locale, mails, customers, filter, total, loading, loadingMore, error, hasMore, onClearFilter, onRefresh, onLoadMore }: PendingMailsPanelProps) {
  const isEnglish = locale === "en";
  const filterLabel = filter?.kind === "category"
    ? categoryLabel(filter.category, locale)
    : filter?.kind === "customer-day"
      ? `${filter.customerLabel} · ${filter.date}`
      : null;

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const panel = event.currentTarget;
    if (hasMore && panel.scrollHeight - panel.scrollTop - panel.clientHeight < 120) onLoadMore();
  }

  return (
    <aside className="panel scroll-panel">
      <div className="panel-head">
        <h2 className="panel-title"><Mail className="h-4 w-4" />{filter?.kind === "customer-day" ? (isEnglish ? "Customer pending mails" : "客户待处理邮件") : (isEnglish ? "Pending mails" : "待处理邮件")}</h2>
        <div className="panel-head-actions">
          <Badge variant={total > 0 ? "amber" : "default"}>{total}</Badge>
          <Button variant="ghost" size="icon" aria-label={isEnglish ? "Refresh" : "刷新"} disabled={loading} onClick={onRefresh}><RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /></Button>
        </div>
      </div>
      <div className="panel-body stack scrollbar-hidden" onScroll={handleScroll}>
        {filterLabel ? <div className="pending-mail-filter"><span title={filterLabel}>{isEnglish ? "Filter: " : "筛选："}{filterLabel}</span><button type="button" onClick={onClearFilter}><X className="h-3.5 w-3.5" />{isEnglish ? "Clear" : "清除筛选"}</button></div> : null}
        {error ? <p className="item-meta" role="alert">{error}</p> : null}
        {loading && mails.length === 0 ? <p className="item-meta">{isEnglish ? "Loading pending mails..." : "正在加载待处理邮件..."}</p> : null}
        {mails.map((mail) => {
          const href = `/parse-review?mailId=${encodeURIComponent(mail.id)}${mail.focusTaskId ? `&taskId=${encodeURIComponent(mail.focusTaskId)}` : ""}`;
          return (
            <article className="pending-mail-card" key={mail.id}>
              <div className="pending-mail-card-head">
                <div className="min-w-0"><p className="pending-mail-subject" title={mail.subject}>{mail.subject || (isEnglish ? "(No subject)" : "(无主题)")}</p><p className="item-meta">{customerLabelFromId(customers, mail.customerId, mail.customerName)} · {formatDateTime(mail.receivedAt, locale)}</p></div>
                <Badge variant="slate">{mail.pendingCategory ? categoryLabel(mail.pendingCategory, locale) : (isEnglish ? "Processing" : "处理中")}</Badge>
              </div>
              <div className="result-footer"><span className="pending-mail-task-count">{isEnglish ? `${mail.attachments.length} attachment(s)` : `${mail.attachments.length} 个附件`}</span><Link className="pending-mail-link" href={href}>{isEnglish ? "Open mail" : "处理邮件"}<ArrowRight className="h-3.5 w-3.5" /></Link></div>
            </article>
          );
        })}
        {loadingMore ? <p className="item-meta text-center" aria-live="polite"><LoaderCircle className="mr-1 inline h-3.5 w-3.5 animate-spin" />{isEnglish ? "Loading more..." : "正在加载更多..."}</p> : null}
        {!loading && mails.length > 0 ? <p className="item-meta text-center" aria-live="polite">{isEnglish ? `Showing ${mails.length} of ${total}` : `已显示 ${mails.length} / ${total} 封`}</p> : null}
        {!loading && mails.length === 0 ? <p className="item-meta">{filter?.kind === "customer-day" ? (isEnglish ? "No pending mail for this customer on this day." : "该客户当天没有待处理邮件") : (isEnglish ? "No pending mail matches this filter." : "当前筛选下没有待处理邮件")}</p> : null}
      </div>
    </aside>
  );
}

function categoryLabel(category: "failed" | "review" | "merge", locale: Locale) {
  if (category === "failed") return locale === "en" ? "Parse failed" : "解析失败";
  if (category === "review") return locale === "en" ? "Needs handling" : "待人工处理";
  return locale === "en" ? "Awaiting merge" : "待合并数据";
}
