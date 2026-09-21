"use client";

import Image from "next/image";
import Link from "next/link";
import { Bot } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/auth-provider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const mainNav = [
  { key: "intelligent-service", title: "智能客服", href: "/intelligent-service" },
  { key: "task-workbench", title: "智能供应链", href: "/task-workbench" },
  { key: "customer-profile", title: "客户画像", href: "/customer-profile" },
  { key: "financial-reconciliation", title: "财务对账", href: "/financial-reconciliation/tasks" },
  { key: "system-settings", title: "系统配置", href: "/system-settings" },
];

const supplyChainSections = ["/task-workbench", "/parse-review", "/orders", "/skill-studio"];
const customerSections = ["/customer-profile"];
const reconciliationSections = ["/financial-reconciliation"];

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  async function handleLogout() {
    setOpen(false);
    await logout();
  }

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const label = user?.displayName || user?.username || "";
  const initials = label
    ? label.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div ref={menuRef} style={{ position: "relative" }}>
      <button
        className="user-chip"
        onClick={() => setOpen(v => !v)}
        style={{ cursor: "pointer", border: "none", background: "none" }}
      >
        <span className="avatar">{initials}</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 220,
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,.1)",
            zIndex: 100,
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>
              {user?.displayName ?? "User"}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
              {user?.username}
            </div>
            {user?.roles && user.roles.length > 0 && (
              <div
                style={{
                  display: "inline-block",
                  marginTop: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  padding: "2px 8px",
                  borderRadius: 4,
                  background: "var(--forvia-blue-soft)",
                  color: "var(--forvia-blue)",
                }}
              >
                {user.roles.join(", ")}
              </div>
            )}
          </div>
          <button
            onClick={() => { void handleLogout(); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              padding: "10px 16px",
              border: "none",
              background: "none",
              cursor: "pointer",
              fontSize: 13,
              color: "var(--danger)",
              textAlign: "left",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-soft)")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}

export function TopNav({ active }: { active: string }) {
  const isSupplyChain = supplyChainSections.includes(active);
  const isCustomer = customerSections.includes(active);
  const isReconciliation = reconciliationSections.some((section) => active.startsWith(section));
  const mainActive = isSupplyChain
    ? "task-workbench"
    : isCustomer
      ? "customer-profile"
      : isReconciliation
        ? "financial-reconciliation"
        : mainNav.find((n) => active === n.href)?.key ?? "";

  return (
    <header className="topbar">
      <Link className="brand" href="/intelligent-service">
        <Image
          className="brand-mark"
          src="/FRVIA.PA.svg"
          width={24}
          height={24}
          alt=""
          priority
        />
        <span>Supply Chain Agent</span>
      </Link>
      <nav className="nav-group">
        {mainNav.map((item) => (
          <Link
            key={item.key}
            className={`nav-link${mainActive === item.key ? " active" : ""}`}
            href={item.href}
          >
            {item.title}
          </Link>
        ))}
      </nav>
      <div className="topbar-actions">
        <Tooltip><TooltipTrigger asChild><Link
          className={`agent-nav-button${active === "/SCAgent" ? " active" : ""}`}
          href="/SCAgent"
          aria-label="Open SCAgent"
        >
          <Bot size={18} aria-hidden="true" />
        </Link></TooltipTrigger><TooltipContent>SCAgent</TooltipContent></Tooltip>
        <UserMenu />
      </div>
    </header>
  );
}
