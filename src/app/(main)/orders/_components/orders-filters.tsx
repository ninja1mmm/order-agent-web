"use client";

import { SearchableFilterSelect } from "@/components/ui/select";
import type { DemandKind } from "@/services/orders";

type FilterOption = string | { value: string; label: string };

type OrdersFiltersProps = {
  customerLabel: string;
  materialLabel: string;
  customerFilter: string;
  materialFilter: string;
  timeFrom: string;
  timeTo: string;
  visibleDemandKinds: DemandKind[];
  customerOptions: FilterOption[];
  onCustomerFilterChange: (value: string) => void;
  onMaterialFilterChange: (value: string) => void;
  onDemandKindToggle: (value: DemandKind) => void;
  onTimeFromChange: (value: string) => void;
  onTimeToChange: (value: string) => void;
};

export function OrdersFilters({
  customerLabel,
  materialLabel,
  customerFilter,
  materialFilter,
  timeFrom,
  timeTo,
  visibleDemandKinds,
  customerOptions,
  onCustomerFilterChange,
  onMaterialFilterChange,
  onDemandKindToggle,
  onTimeFromChange,
  onTimeToChange,
}: OrdersFiltersProps) {
  return (
    <div className="orders-filter-stack">
      <div className="orders-filter-grid">
        <SearchableFilterSelect
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
