"use client";

import type { SettingsSection } from "./settings-types";

type SettingsNavPanelProps = {
  section: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
};

export function SettingsNavPanel({ section, onSectionChange }: SettingsNavPanelProps) {
  return (
    <aside className="panel scroll-panel">
      <div className="panel-head">
        <h2 className="panel-title">配置菜单</h2>
      </div>
      <div className="panel-body stack">
        <button
          type="button"
          className={`settings-nav ${section === "customers" ? "selected" : ""}`}
          onClick={() => onSectionChange("customers")}
        >
          <span>客户配置</span>
          <small>基础信息、联系人识别、物料映射</small>
        </button>
        <button
          type="button"
          className={`settings-nav ${section === "mailbox" ? "selected" : ""}`}
          onClick={() => onSectionChange("mailbox")}
        >
          <span>统一邮箱</span>
          <small>监听邮箱、同步、连接测试</small>
        </button>
      </div>
    </aside>
  );
}
