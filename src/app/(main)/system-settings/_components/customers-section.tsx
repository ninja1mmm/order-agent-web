"use client";

import { Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CustomerConfig } from "@/services/settings";
import type { CustomerTab } from "./settings-types";
import { CustomerDetail } from "./customer-detail";
import { CustomerList } from "./customer-list";

type CustomersSectionProps = {
  customers: CustomerConfig[];
  selectedId: string;
  draft: CustomerConfig | null;
  search: string;
  tab: CustomerTab;
  saving: boolean;
  onSearchChange: (value: string) => void;
  onSelectCustomer: (customer: CustomerConfig) => void;
  onDeleteCustomer: (customer: CustomerConfig) => void;
  onAddCustomer: () => void;
  onSaveCustomer: () => void;
  onDraftChange: (draft: CustomerConfig) => void;
  onTabChange: (tab: CustomerTab) => void;
  onAddContact: () => void;
  onRemoveContact: (index: number) => void;
  onRemoveMaterial: (index: number) => void;
};

export function CustomersSection({
  customers,
  selectedId,
  draft,
  search,
  tab,
  saving,
  onSearchChange,
  onSelectCustomer,
  onDeleteCustomer,
  onAddCustomer,
  onSaveCustomer,
  onDraftChange,
  onTabChange,
  onAddContact,
  onRemoveContact,
  onRemoveMaterial,
}: CustomersSectionProps) {
  return (
    <>
      <div className="panel-head">
        <h2 className="panel-title">客户配置</h2>
        <div className="list-actions">
          <Button variant="default" size="sm" onClick={onAddCustomer}>
            <Plus className="h-3.5 w-3.5" /> 新增客户
          </Button>
          <Button variant="primary" size="sm" disabled={!draft || saving} onClick={onSaveCustomer}>
            <Save className="h-3.5 w-3.5" /> {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>
      <div className="panel-body" style={{ flex: 1, minHeight: 0, overflow: "hidden", padding: 16 }}>
        <div className="settings-inner-split" style={{ height: "100%" }}>
          <CustomerList
            customers={customers}
            selectedId={selectedId}
            draft={draft}
            search={search}
            onSearchChange={onSearchChange}
            onSelectCustomer={onSelectCustomer}
            onDeleteCustomer={onDeleteCustomer}
          />
          <CustomerDetail
            draft={draft}
            tab={tab}
            onTabChange={onTabChange}
            onDraftChange={onDraftChange}
            onAddContact={onAddContact}
            onRemoveContact={onRemoveContact}
            onRemoveMaterial={onRemoveMaterial}
          />
        </div>
      </div>
    </>
  );
}
