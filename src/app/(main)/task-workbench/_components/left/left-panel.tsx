"use client";

import { useMemo } from "react";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { FilterSelect } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { WorkspaceMail } from "@/services/inbox";
import type { CustomerConfig } from "@/services/settings";
import {
  type Locale,
  copy,
  customerLabelFromId,
  formatDateTime,
} from "../../../_components/shared";
import { getWorkbenchMailStatus, workbenchStatusOptions } from "../workbench-utils";

type LeftPanelProps = {
  locale: Locale;
  mails: WorkspaceMail[];
  customers: CustomerConfig[];
  customerFilter: string;
  attachmentFilter: string;
  statusFilter: string;
  customerSearch: string;
  timelineStartDate: string;
  timelineEndDate: string;
  onAttachmentFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onCustomerSearchChange: (value: string) => void;
  onTimelineStartDateChange: (value: string) => void;
  onTimelineEndDateChange: (value: string) => void;
  onSelectCustomer: (customerId: string, firstMailId?: string) => void;
};

export function LeftPanel({
  locale,
  mails,
  customers,
  customerFilter,
  attachmentFilter,
  statusFilter,
  customerSearch,
  timelineStartDate,
  timelineEndDate,
  onAttachmentFilterChange,
  onStatusFilterChange,
  onCustomerSearchChange,
  onTimelineStartDateChange,
  onTimelineEndDateChange,
  onSelectCustomer,
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
  const pendingMailCount = mails.filter((mail) => getWorkbenchMailStatus(mail.processingState) === "processing").length;

  return (
    <aside className="panel scroll-panel">
      <div className="panel-head">
        <h2 className="panel-title"><Users className="h-4 w-4" />客户列表</h2>
        <Badge variant="slate">{customerGroups.length} 个客户</Badge>
      </div>
      <div className="panel-body stack scrollbar-hidden">
        <div className="customer-list-filters">
          <Input type="search" value={customerSearch} placeholder="搜索客户、邮件主题…" aria-label="搜索客户" onChange={(event) => onCustomerSearchChange(event.target.value)} />
          <div className="customer-list-filter-grid">
            <FilterSelect
              label={t.filterAttachment}
              value={attachmentFilter}
              options={["全部邮件", "有附件", "无附件"]}
              onChange={onAttachmentFilterChange}
            />
            <FilterSelect
              label={t.filterStatus}
              value={statusFilter}
              options={workbenchStatusOptions(locale)}
              onChange={onStatusFilterChange}
            />
          </div>
          <div className="customer-date-filter" aria-label="邮件日期范围">
            <DatePicker aria-label="开始日期" value={timelineStartDate} onChange={onTimelineStartDateChange} />
            <DatePicker aria-label="结束日期" value={timelineEndDate} onChange={onTimelineEndDateChange} />
          </div>
        </div>
        <>
          <button type="button" className={`customer-summary-card${customerFilter === "__all__" ? " selected" : ""}`} onClick={() => onSelectCustomer("__all__", mails[0]?.id)}>
            <div><strong>全部客户</strong><span>{mails.length} 封</span></div>
            <small>{pendingMailCount} 封邮件待处理</small>
          </button>
          {customerGroups.map(({ id, label, mails: customerMails }) => {
          const pendingCount = customerMails.filter((mail) => getWorkbenchMailStatus(mail.processingState) === "processing").length;
          const latestMail = customerMails[0];
          return (
            <button type="button" className={`customer-summary-card${customerFilter === id ? " selected" : ""}`} key={id} onClick={() => onSelectCustomer(id, latestMail?.id)}>
              <div><strong>{label}</strong><span>{customerMails.length} 封</span></div>
              <Tooltip><TooltipTrigger asChild><p>{latestMail?.subject || "暂无邮件主题"}</p></TooltipTrigger><TooltipContent>{latestMail?.subject || "暂无邮件主题"}</TooltipContent></Tooltip>
              {pendingCount ? <small>{pendingCount} 封邮件待处理</small> : <small>当前无待处理邮件</small>}
            </button>
          );
        })}</>
        {mails.length === 0 ? <p className="item-meta">{t.noMail}</p> : null}
      </div>
    </aside>
  );
}
