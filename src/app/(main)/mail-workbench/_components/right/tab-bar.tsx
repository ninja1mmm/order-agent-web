"use client";

import type { TabItem } from "../mail-workbench-page";

type Props = {
  tabs: TabItem[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
};

export function TabBar({ tabs, activeTabId, onSelectTab, onCloseTab }: Props) {
  return (
    <div className="tab-bar">
      {tabs.map((tab) => {
        const isPinned = tab.type === "mail-detail";
        return (
          <div
            key={tab.id}
            className={`tab-item${tab.id === activeTabId ? " active" : ""}${isPinned ? " pinned" : ""}`}
            onClick={() => onSelectTab(tab.id)}
          >
            <span>{tab.label}</span>
            {!isPinned && (
              <span
                className="tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(tab.id);
                }}
              >
                ×
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
