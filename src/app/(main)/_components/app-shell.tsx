"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { TopNav } from "./product-shell";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/intelligent-service";
  const activePath = pathname === "/" ? "/intelligent-service" : pathname;
  const isScAgent = activePath === "/SCAgent";

  return (
    <div className={`app-shell${isScAgent ? " sc-agent-shell" : ""}`}>
      {isScAgent ? <div className="sc-agent-nav-hotspot" aria-hidden="true" /> : null}
      <TopNav active={activePath} />
      <main className={isScAgent ? "sc-agent-page" : "page fit-screen"}>
        {children}
      </main>
    </div>
  );
}
