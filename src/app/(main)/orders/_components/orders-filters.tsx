"use client";

import { FilterSelect } from "@/components/ui/select";
import type { DemandKind } from "@/services/orders";
import type { StatusFilter } from "./order-utils";

type FilterOption = string | { value: string; label: string };

type OrdersFiltersProps = {
  customerLabel: string;
  materialLabel: string;
  customerFilter: string;
  materialFilter: string;
  statusFilter: StatusFilter;
  timeFrom: string;
  timeTo: string;
  visibleDemandKinds: DemandKind[];
  customerOptions: FilterOption[];
  statusOptions: { value: StatusFilter; label: string }[];
  onCustomerFilterChange: (value: string) => void;
  onMaterialFilterChange: (value: string) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  onDemandKindToggle: (value: DemandKind) => void;
  onTimeFromChange: (value: string) => void;
  onTimeToChange: (value: string) => void;
};

export function OrdersFilters({
  customerLabel,
  materialLabel,
  customerFilter,
  materialFilter,
  statusFilter,
  timeFrom,
  timeTo,
  visibleDemandKinds,
  customerOptions,
  statusOptions,
  onCustomerFilterChange,
  onMaterialFilterChange,
  onStatusFilterChange,
  onDemandKindToggle,
  onTimeFromChange,
  onTimeToChange,
}: OrdersFiltersProps) {
  return (
    <div className="orders-filter-stack">
      <div className="orders-filter-grid">
        <FilterSelect
          label={customerLabel}
          value={customerFilter}
          options={customerOptions}
          onChange={onCustomerFilterChange}
        />
        <label className="orders-inline-text-filter">
          <span>{materialLabel}</span>
          <input
            value={materialFilter}
            onChange={(event) => onMaterialFilterChange(event.target.value)}
            placeholder="Faurecia P/N"
          />
        </label>
        <FilterSelect
          label="状态"
          value={statusFilter}
          options={statusOptions}
          onChange={(value) => onStatusFilterChange(value as StatusFilter)}
        />
        <label className="orders-inline-date-filter">
          <span>开始</span>
          <input type="date" value={timeFrom} onChange={(event) => onTimeFromChange(event.target.value)} />
        </label>
        <label className="orders-inline-date-filter">
          <span>结束</span>
          <input type="date" value={timeTo} onChange={(event) => onTimeToChange(event.target.value)} />
        </label>
      </div>
      <div className="orders-filter-actions">
        <div className="orders-lane-tabs" aria-label="需求类型行显示">
          <button
            type="button"
            className={`orders-lane-toggle forecast ${visibleDemandKinds.includes("forecast") ? "active" : ""}`}
            aria-pressed={visibleDemandKinds.includes("forecast")}
            onClick={() => onDemandKindToggle("forecast")}
          >
            Forecast
          </button>
          <button
            type="button"
            className={`orders-lane-toggle firm ${visibleDemandKinds.includes("firm") ? "active" : ""}`}
            aria-pressed={visibleDemandKinds.includes("firm")}
            onClick={() => onDemandKindToggle("firm")}
          >
            Firm
          </button>
        </div>
      </div>
    </div>
  );
}
