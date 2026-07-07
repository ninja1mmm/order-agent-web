"use client";

import { RefreshCw } from "lucide-react";

import type { CustomerProfileCustomer } from "@/services/customer-profile";
import { Button } from "@/components/ui/button";
import { formatDisplayDate } from "./customer-profile-utils";

type CustomerListPanelProps = {
  customers: CustomerProfileCustomer[];
  selectedId: string | null;
  loading: boolean;
  onSelect: (customerId: string) => void;
  onRefresh: () => void;
};

export function CustomerListPanel({
  customers,
  selectedId,
  loading,
  onSelect,
  onRefresh,
}: CustomerListPanelProps) {
  return (
    <aside className="panel scroll-panel">
      <div className="panel-head">
        <h2 className="panel-title">客户</h2>
        <Button
          variant="primary"
          size="icon-sm"
          aria-label="刷新画像"
          title="刷新画像"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5${loading ? " animate-spin" : ""}`} />
        </Button>
      </div>
      <div className="panel-body stack">
        {customers.length === 0 ? (
          <p className="item-meta">{loading ? "加载中..." : "暂无发运客户数据"}</p>
        ) : (
          customers.map((customer) => {
            const refreshedAt = customer.lastShippingDate
              ? `最近发运 ${formatDisplayDate(customer.lastShippingDate)}`
              : "暂无发运记录";
            return (
              <button
                key={customer.id}
                type="button"
                className={`list-item${selectedId === customer.id ? " selected" : ""}`}
                onClick={() => onSelect(customer.id)}
              >
                <p className="item-title">{customer.name}</p>
                <p className="item-meta">
                  Customer Code {customer.code} · {refreshedAt}
                  {customer.totalShippingWeeks > 0 ? ` · ${customer.totalShippingWeeks} 周` : ""}
                </p>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
