"use client";

import Link from "next/link";
import { useAuth } from "../context/auth-provider";

const mainNav = [
  { key: "intelligent-service", title: "智能客服", href: "/intelligent-service" },
  { key: "task-workbench", title: "智能供应链", href: "/task-workbench" },
  { key: "system-settings", title: "系统配置", href: "/system-settings" },
];

const supplyChainSections = ["/task-workbench", "/parse-review", "/orders"];

export function TopNav({ active }: { active: string }) {
  const { user, logout } = useAuth();
  const isSupplyChain = supplyChainSections.includes(active);
  const mainActive = isSupplyChain ? "task-workbench" : mainNav.find((n) => active === n.href)?.key ?? "";

  const initials = user?.displayName
    ? user.displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <header className="topbar">
      <Link className="brand" href="/intelligent-service">
        <span className="brand-mark">SC</span>
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
      <button className="user-chip" onClick={logout} title="退出登录" style={{ cursor: "pointer", border: "none", background: "none" }}>
        <span className="avatar">{initials}</span>
      </button>
    </header>
  );
}
