"use client";

import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterSelect } from "@/components/ui/select";
import type { WorkspaceMail } from "@/services/inbox";
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
  mails: WorkspaceMail[];
  customers: CustomerConfig[];
  selectedMailId: string | undefined;
  customerFilter: string;
  timeFilter: string;
  attachmentFilter: string;
  statusFilter: string;
  customerOptions: FilterOption[];
  onCustomerFilterChange: (value: string) => void;
  onTimeFilterChange: (value: string) => void;
  onAttachmentFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onSelectMail: (mailId: string) => void;
  onRefresh: () => void;
  onAddMail: () => void;
};

export function LeftPanel({
  locale,
  mails,
  customers,
  selectedMailId,
  customerFilter,
  timeFilter,
  attachmentFilter,
  statusFilter,
  customerOptions,
  onCustomerFilterChange,
  onTimeFilterChange,
  onAttachmentFilterChange,
  onStatusFilterChange,
  onSelectMail,
  onRefresh,
  onAddMail,
}: LeftPanelProps) {
  const t = copy[locale];

  return (
    <aside className="panel scroll-panel">
      <div className="panel-head">
        <h2 className="panel-title">{t.mailList}</h2>
        <div className="panel-head-actions">
          <Button variant="primary" size="icon" aria-label={t.refresh} title={t.refresh} onClick={onRefresh}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="primary" size="sm" onClick={onAddMail}>
            <Plus className="h-3.5 w-3.5" /> {t.add}
          </Button>
        </div>
      </div>
      <div className="panel-body stack">
        <div className="filter-bar">
          <FilterSelect label={t.filterCustomer} value={customerFilter} options={customerOptions} onChange={onCustomerFilterChange} />
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
        </div>
        {mails.map((mail) => (
          <button
            type="button"
            className={`mail-card ${mail.id === selectedMailId ? "selected" : ""}`}
            key={mail.id}
            onClick={() => onSelectMail(mail.id)}
          >
            <div className="mail-card-top">
              <span className="mail-customer">{customerLabelFromId(customers, mail.customerId, mail.customerName)}</span>
              <span className="mail-time">{formatDateTime(mail.receivedAt, locale)}</span>
            </div>
            <div className="mail-subject">{mail.subject}</div>
            <div className="mail-preview">{mail.bodyText || "-"}</div>
          </button>
        ))}
      </div>
    </aside>
  );
}
