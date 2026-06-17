"use client";

import { TopNav } from "../product-shell";
import { useLocale } from "./sections/shared";
import { LiveDashboard } from "./sections/dashboard";
import { LiveWorkbench } from "./sections/workbench";
import { LiveParseReview } from "./sections/parse-review";
import { LiveOrders } from "./sections/orders";

export function LiveSectionContent({ section }: { section: string }) {
  const locale = useLocale();
  return (
    <div className="app-shell">
      <TopNav active={`/${section}`} />
      <main className="page fit-screen">
        {section === "intelligent-service" && <LiveDashboard locale={locale} />}
        {section === "task-workbench" && <LiveWorkbench locale={locale} />}
        {section === "parse-review" && <LiveParseReview locale={locale} />}
        {section === "orders" && <LiveOrders locale={locale} />}
        {section === "system-settings" && (
          <div className="panel">
            <div className="panel-body">System settings pending.</div>
          </div>
        )}
      </main>
    </div>
  );
}
