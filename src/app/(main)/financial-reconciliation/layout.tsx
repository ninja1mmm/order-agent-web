import type { ReactNode } from "react";
import { ReconciliationTabs } from "./_components/reconciliation-tabs";

export default function FinancialReconciliationLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ReconciliationTabs />
      {children}
    </>
  );
}
