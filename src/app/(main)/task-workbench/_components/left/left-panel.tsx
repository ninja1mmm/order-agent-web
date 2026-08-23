"use client";

import { useMemo } from "react";
import { Inbox, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FilterSelect, SearchableFilterSelect } from "@/components/ui/select";
import type { WorkspaceMail, WorkspaceTask } from "@/services/inbox";
import type { CustomerConfig } from "@/services/settings";
import {
  type Locale,
  copy,
  customerLabelFromId,
  formatDateTime,
} from "../../../_components/shared";

type FilterOption = string | { value: string; label: string };

type LeftPanelProps = {
  locale: Locale;
  viewMode: "mail" | "customer";
  mails: WorkspaceMail[];
  tasks: WorkspaceTask[];
  customers: CustomerConfig[];
  selectedMailId: string | undefined;
  customerFilter: string;
  timeFilter: string;
  attachmentFilter: string;
  statusFilter: string;
  customerSearch: string;
  timelineStartDate: string;
  timelineEndDate: string;
  customerOptions: FilterOption[];
  onCustomerFilterChange: (value: string) => void;
  onTimeFilterChange: (value: string) => void;
  onAttachmentFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onCustomerSearchChange: (value: string) => void;
  onTimelineStartDateChange: (value: string) => void;
  onTimelineEndDateChange: (value: string) => void;
  onSelectCustomer: (customerId: string, firstMailId?: string) => void;
  onSelectMail: (mailId: string) => void;
};

export function LeftPanel({
  locale,
  viewMode,
  mails,
  tasks,
  customers,
  selectedMailId,
  customerFilter,
  timeFilter,
  attachmentFilter,
  statusFilter,
  customerSearch,
  timelineStartDate,
  timelineEndDate,
  customerOptions,
  onCustomerFilterChange,
  onTimeFilterChange,
  onAttachmentFilterChange,
  onStatusFilterChange,
  onCustomerSearchChange,
  onTimelineStartDateChange,
  onTimelineEndDateChange,
  onSelectCustomer,
  onSelectMail,
}: LeftPanelProps) {
  const t = copy[locale];
  const customerGroups = useMemo(() => Array.from(
    mails.reduce((groups, mail) => {
      const id = mail.customerId || mail.customerName || "unknown";
      const current = groups.get(id) ?? { id, label: customerLabelFromId(customers, mail.customerId, mail.customerName), mails: [] as WorkspaceMail[] };
      current.mails.push(mail);
      groups.set(id, current);
      return groups;
    }, new Map<string, { id: string; label: string; mails: WorkspaceMail[] }>()).values(),
  ).filter((group) => {
    const query = customerSearch.trim().toLowerCase();
    if (!query) return true;
    return group.label.toLowerCase().includes(query) || group.mails.some((mail) => mail.subject.toLowerCase().includes(query));
  }), [customerSearch, customers, mails]);
  const pendingMailCount = new Set(tasks.filter((task) => ["failed", "waiting_human_decision", "processing", "running", "queued"].includes(task.status)).map((task) => task.mailMessageId)).size;

  return (
    <aside className="panel scroll-panel">
      <div className="panel-head">
        <h2 className="panel-title">{viewMode === "mail" ? <Inbox className="h-4 w-4" /> : <Users className="h-4 w-4" />}{viewMode === "mail" ? t.mailList : "客户列表"}</h2>
        <Badge variant="slate">{viewMode === "mail" ? `${mails.length} 封` : `${customerGroups.length} 个客户`}</Badge>
      </div>
      <div className="panel-body stack">
        {viewMode === "mail" ? <div className="filter-bar">
          <SearchableFilterSelect label={t.filterCustomer} value={customerFilter} options={customerOptions} onChange={onCustomerFilterChange} />
          <FilterSelect
            label={t.filterTime}
            value={timeFilter}
            options={["今天", "最近 7 天", "最近 30 天", "最近 60 天"]}
            onChange={onTimeFilterChange}
          />
          <FilterSelect
            label={t.filterAttachment}
            value={attachmentFilter}
            options={["全部邮件", "有附件", "无附件"]}
            onChange={onAttachmentFilterChange}
          />
          <FilterSelect
            label={t.filterStatus}
            value={statusFilter}
            options={["全部状态", "待处理", "处理中", "待人工确认", "已完成", "处理失败"]}
            onChange={onStatusFilterChange}
          />
        </div> : (
          <div className="customer-list-filters">
            <Input type="search" value={customerSearch} placeholder="搜索客户、邮件主题…" aria-label="搜索客户" onChange={(event) => onCustomerSearchChange(event.target.value)} />
            <div><Input type="date" value={timelineStartDate} aria-label="开始日期" onChange={(event) => onTimelineStartDateChange(event.target.value)} /><Input type="date" value={timelineEndDate} aria-label="结束日期" onChange={(event) => onTimelineEndDateChange(event.target.value)} /></div>
          </div>
        )}
        {viewMode === "mail" ? mails.map((mail) => (
          <button
            type="button"
            className={`mail-card ${mail.id === selectedMailId ? "selected" : ""}`}
            key={mail.id}
            onClick={() => onSelectMail(mail.id)}
          >
            <span className="workbench-mail-copy">
              <strong title={mail.subject}>{mail.subject || "(无主题)"}</strong>
              <small>{customerLabelFromId(customers, mail.customerId, mail.customerName)} · {formatDateTime(mail.receivedAt, locale)} · {mail.attachments.length} 个附件</small>
              <span className="workbench-mail-preview">{mail.bodyText || "邮件正文为空；业务内容由附件提供。"}</span>
            </span>
          </button>
        )) : <>
          <button type="button" className={`customer-summary-card${customerFilter === "__all__" ? " selected" : ""}`} onClick={() => onSelectCustomer("__all__", mails[0]?.id)}>
            <div><strong>全部客户</strong><span>{mails.length} 封</span></div>
            <small>{pendingMailCount} 封邮件待处理</small>
          </button>
          {customerGroups.map(({ id, label, mails: customerMails }) => {
          const mailIds = new Set(customerMails.map((mail) => mail.id));
          const pendingCount = new Set(tasks.filter((task) => mailIds.has(task.mailMessageId) && ["failed", "waiting_human_decision", "processing", "running", "queued"].includes(task.status)).map((task) => task.mailMessageId)).size;
          const latestMail = customerMails[0];
          return (
            <button type="button" className={`customer-summary-card${customerFilter === id ? " selected" : ""}`} key={id} onClick={() => onSelectCustomer(id, latestMail?.id)}>
              <div><strong>{label}</strong><span>{customerMails.length} 封</span></div>
              <p title={latestMail?.subject}>{latestMail?.subject || "暂无邮件主题"}</p>
              {pendingCount ? <small>{pendingCount} 封邮件待处理</small> : <small>当前无待处理邮件</small>}
            </button>
          );
        })}</>}
        {mails.length === 0 ? <p className="item-meta">{t.noMail}</p> : null}
      </div>
    </aside>
  );
}
