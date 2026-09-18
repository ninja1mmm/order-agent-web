"use client";

import type { WorkspaceMail, WorkspaceTask } from "@/services/inbox";
import type { CustomerConfig } from "@/services/settings";
import { CustomerHeatmap } from "../../../_components/shared-components";
import type { Locale } from "../../../_components/shared";
import type { MailFilter } from "../mail-filters";

type CustomerRhythmPanelProps = {
  locale: Locale;
  mails: WorkspaceMail[];
  tasks: WorkspaceTask[];
  customers: CustomerConfig[];
  filter: MailFilter;
  onSelectCustomerDay: (customerKey: string, customerLabel: string, date: string) => void;
};

export function CustomerRhythmPanel({ locale, mails, tasks, customers, filter, onSelectCustomerDay }: CustomerRhythmPanelProps) {
  return (
    <section className="panel scroll-panel">
      <CustomerHeatmap mails={mails} tasks={tasks} customers={customers} locale={locale} selectedCustomerDay={filter?.kind === "customer-day" ? filter : null} onSelectCustomerDay={onSelectCustomerDay} />
    </section>
  );
}
