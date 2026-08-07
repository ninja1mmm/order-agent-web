"use client";

import type { CustomerConfig } from "@/services/settings";
import type { CustomerTab } from "./settings-types";
import { BasicInfoForm } from "./basic-info-form";
import { MaterialsTab } from "./materials-tab";

type CustomerDetailProps = {
  draft: CustomerConfig | null;
  tab: CustomerTab;
  onTabChange: (tab: CustomerTab) => void;
  onDraftChange: (draft: CustomerConfig) => void;
  onAddContact: () => void;
  onRemoveContact: (index: number) => void;
  onRemoveMaterial: (index: number) => void;
};

export function CustomerDetail({
  draft,
  tab,
  onTabChange,
  onDraftChange,
  onAddContact,
  onRemoveContact,
  onRemoveMaterial,
}: CustomerDetailProps) {
  if (!draft) {
    return <p className="item-meta">请选择或新增客户</p>;
  }

  return (
    <div className="settings-detail-col">
      <div className="row" style={{ marginBottom: 10 }}>
        <p className="item-title">{draft.name}</p>
      </div>
      <div className="tabs settings-tabs">
        <span className={tab === "basic" ? "active" : ""} onClick={() => onTabChange("basic")}>客户信息</span>
        <span className={tab === "materials" ? "active" : ""} onClick={() => onTabChange("materials")}>物料映射</span>
      </div>

      {tab === "basic" ? (
        <BasicInfoForm
          draft={draft}
          onDraftChange={onDraftChange}
          onAddContact={onAddContact}
          onRemoveContact={onRemoveContact}
        />
      ) : (
        <MaterialsTab
          draft={draft}
          onDraftChange={onDraftChange}
          onRemoveMaterial={onRemoveMaterial}
        />
      )}
    </div>
  );
}
