"use client";

import type { WorkspaceMail, WorkspaceTask } from "@/services/inbox";
import type { CustomerConfig } from "@/services/settings";
import { CustomerHeatmap } from "../../../_components/shared-components";
import type { Locale } from "../../../_components/shared";

type CustomerRhythmPanelProps = {
  locale: Locale;
  mails: WorkspaceMail[];
  tasks: WorkspaceTask[];
  customers: CustomerConfig[];
};

export function CustomerRhythmPanel({ locale, mails, tasks, customers }: CustomerRhythmPanelProps) {
  return (
    <section className="panel scroll-panel">
      <CustomerHeatmap mails={mails} tasks={tasks} customers={customers} locale={locale} />
    </section>
  );
}
