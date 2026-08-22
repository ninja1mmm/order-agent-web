"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import type { WorkspaceMail, WorkspaceStats } from "@/types/models/inbox";
import type { CustomerConfig } from "@/services/settings";
import type { Locale } from "../../../_components/shared";
import { customerLabel } from "../../../_components/shared";
import { CustomerCard } from "./customer-card";

type Props = {
  locale: Locale;
  mails: WorkspaceMail[];
  customers: CustomerConfig[];
  selectedCustomerId: string | null;
  customerSearch: string;
  dateFrom: string;
  dateTo: string;
  stats: WorkspaceStats | null;
  onSelectCustomer: (customerId: string | null) => void;
  onSearchChange: (value: string) => void;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
};

type CustomerSummary = {
  customerId: string;
  customerName: string;
  latestSubject: string;
  latestDate: string;
  attachmentCount: number;
  unresolvedCount: number;
};

export function CustomerPanel({
  locale,
  mails,
  customers,
  selectedCustomerId,
  customerSearch,
  dateFrom,
  dateTo,
  stats,
  onSelectCustomer,
  onSearchChange,
  onDateFromChange,
  onDateToChange,
}: Props) {
  const customerSummaries = useMemo(() => {
    const grouped = new Map<string, WorkspaceMail[]>();
    for (const mail of mails) {
      const cid = mail.customerId ?? "__unknown__";
      const list = grouped.get(cid) ?? [];
      list.push(mail);
      grouped.set(cid, list);
    }

    const summaries: CustomerSummary[] = [];
    for (const [cid, mailList] of grouped) {
      const sorted = [...mailList].sort(
        (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
      );
      const latest = sorted[0];
      const config = customers.find((c) => c.id === cid);
      const name = config ? customerLabel(config) : latest?.customerName ?? cid;

      let attachmentCount = 0;
      let unresolvedCount = 0;
      for (const m of mailList) {
        attachmentCount += m.attachments.length;
        for (const att of m.attachments) {
          for (const t of att.tasks ?? []) {
            if (t.status !== "completed" && t.status !== "published" && t.status !== "cancelled") {
              unresolvedCount++;
            }
          }
        }
      }

      summaries.push({
        customerId: cid,
        customerName: name,
        latestSubject: latest?.subject ?? "",
        latestDate: latest?.receivedAt ?? "",
        attachmentCount,
        unresolvedCount,
      });
    }

    summaries.sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());
    return summaries;
  }, [mails, customers]);

  const filtered = useMemo(() => {
    if (!customerSearch.trim()) return customerSummaries;
    const q = customerSearch.toLowerCase();
    return customerSummaries.filter((c) => c.customerName.toLowerCase().includes(q));
  }, [customerSummaries, customerSearch]);

  return (
    <div className="panel scroll-panel customer-panel">
      <div className="customer-filters">
        <Input
          type="text"
          placeholder={locale === "en" ? "Search customer..." : "搜索客户..."}
          value={customerSearch}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            style={{ flex: 1 }}
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            style={{ flex: 1 }}
          />
        </div>
        {stats && (
          <div style={{ fontSize: 11, color: "var(--muted)", display: "flex", gap: 12 }}>
            <span>{stats.mailCount} mails</span>
            <span>{stats.customerCount} customers</span>
            <span>{stats.pendingCount} pending</span>
          </div>
        )}
      </div>
      <div className="customer-list">
        <CustomerCard
          key="__all__"
          customerName={locale === "en" ? "All Customers" : "全部客户"}
          latestSubject=""
          latestDate=""
          attachmentCount={0}
          unresolvedCount={0}
          selected={selectedCustomerId === null}
          onClick={() => onSelectCustomer(null)}
        />
        {filtered.map((c) => (
          <CustomerCard
            key={c.customerId}
            customerName={c.customerName}
            latestSubject={c.latestSubject}
            latestDate={c.latestDate}
            attachmentCount={c.attachmentCount}
            unresolvedCount={c.unresolvedCount}
            selected={selectedCustomerId === c.customerId}
            onClick={() => onSelectCustomer(c.customerId)}
          />
        ))}
      </div>
    </div>
  );
}
