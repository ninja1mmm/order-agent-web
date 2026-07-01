"use client";

import type { WorkspaceMail } from "@/services/inbox";
import type { CustomerConfig } from "@/services/settings";
import { CustomerHeatmap } from "../../../_components/shared-components";
import type { Locale } from "../../../_components/shared";

type CustomerRhythmPanelProps = {
  locale: Locale;
  mails: WorkspaceMail[];
  customers: CustomerConfig[];
};

export function CustomerRhythmPanel({ locale, mails, customers }: CustomerRhythmPanelProps) {
  return (
    <section className="panel scroll-panel">
      <CustomerHeatmap mails={mails} customers={customers} locale={locale} />
    </section>
  );
}
