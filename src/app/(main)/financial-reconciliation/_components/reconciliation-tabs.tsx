"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { reconciliationTabs } from "./reconciliation-types";

export function ReconciliationTabs() {
  const pathname = usePathname() ?? "/financial-reconciliation/tasks";
  const activeHref = pathname.includes("/financial-reconciliation/tasks/")
    ? "/financial-reconciliation/tasks"
    : reconciliationTabs.find((tab) => pathname.startsWith(tab.href))?.href;

  return (
    <div className="subnav reconciliation-tabs" aria-label="财务对账导航">
      {reconciliationTabs.map((tab) => (
        <Link key={tab.key} className={activeHref === tab.href ? "active" : ""} href={tab.href}>
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
