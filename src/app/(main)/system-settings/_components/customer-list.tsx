"use client";

import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { CustomerConfig } from "@/services/settings";

type CustomerListProps = {
  customers: CustomerConfig[];
  selectedId: string;
  draft: CustomerConfig | null;
  search: string;
  onSearchChange: (value: string) => void;
  onSelectCustomer: (customer: CustomerConfig) => void;
  onDeleteCustomer: (customer: CustomerConfig) => void;
};

export function CustomerList({
  customers,
  selectedId,
  draft,
  search,
  onSearchChange,
  onSelectCustomer,
  onDeleteCustomer,
}: CustomerListProps) {
  return (
    <div className="customer-list-col">
      <div className="row" style={{ marginBottom: 8 }}>
        <p className="mini-title" style={{ marginBottom: 0 }}>客户列表</p>
        <Badge variant="blue">{customers.length}</Badge>
      </div>
      <Input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="搜索客户"
        style={{ marginBottom: 10 }}
      />
      <div className="customer-list-scroll">
        {customers.map((customer) => (
          <div
            key={customer.id}
            className={`list-item customer-card ${customer.id === selectedId ? "selected" : ""}`}
          >
            <button type="button" className="customer-card-main" onClick={() => onSelectCustomer(customer)}>
              <p className="item-title" title={customer.id === selectedId && draft ? draft.name : customer.name}>
                {customer.id === selectedId && draft ? draft.name : customer.name}
              </p>
              <p className="item-meta">
                {(customer.id === selectedId && draft ? draft.code : customer.code) || "-"}
              </p>
            </button>
            <button
              type="button"
              className="icon-link customer-card-delete"
              onClick={() => onDeleteCustomer(customer)}
              title="删除客户"
              aria-label={`删除客户 ${customer.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {customers.length === 0 ? <p className="item-meta">暂无客户配置</p> : null}
      </div>
    </div>
  );
}
