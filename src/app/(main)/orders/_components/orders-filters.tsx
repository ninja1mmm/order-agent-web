"use client";

import { FilterSelect, SearchableFilterSelect } from "@/components/ui/select";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";

type FilterOption = string | { value: string; label: string };

type OrdersFiltersProps = {
  customerLabel: string;
  materialLabel: string;
  customerFilter: string;
  materialFilter: string;
  activeTab: "forecast" | "shipping";
  yearFilter: string;
  customerOptions: FilterOption[];
  materialOptions: string[];
  availableYears: string[];
  salesForecastLabel: string;
  shippingPlanLabel: string;
  onCustomerFilterChange: (value: string) => void;
  onMaterialFilterChange: (value: string) => void;
  onActiveTabChange: (value: "forecast" | "shipping") => void;
  onYearFilterChange: (value: string) => void;
};

export function OrdersFilters({
  customerLabel,
  materialLabel,
  customerFilter,
  materialFilter,
  activeTab,
  yearFilter,
  customerOptions,
  materialOptions,
  availableYears,
  salesForecastLabel,
  shippingPlanLabel,
  onCustomerFilterChange,
  onMaterialFilterChange,
  onActiveTabChange,
  onYearFilterChange,
}: OrdersFiltersProps) {
  return (
    <>
      <div className="filter-bar" style={{ marginBottom: 14, gridTemplateColumns: "repeat(2, minmax(0, 1fr))", maxWidth: 480 }}>
        <FilterSelect label={customerLabel} value={customerFilter} options={customerOptions} onChange={onCustomerFilterChange} />
        <SearchableFilterSelect
          label={materialLabel}
          value={materialFilter}
          options={materialOptions}
          onChange={onMaterialFilterChange}
          placeholder="搜索料号..."
        />
      </div>
      <div className="orders-tabs-row">
        <TabsList className="orders-tabs-strip">
          <TabsTrigger active={activeTab === "forecast"} onClick={() => onActiveTabChange("forecast")}>
            {salesForecastLabel}
          </TabsTrigger>
          <TabsTrigger active={activeTab === "shipping"} onClick={() => onActiveTabChange("shipping")}>
            {shippingPlanLabel}
          </TabsTrigger>
        </TabsList>
        {activeTab === "forecast" && (
          <FilterSelect
            label="Year"
            value={yearFilter}
            options={[{ value: "__all__", label: "全部" }, ...availableYears.map((year) => ({ value: year, label: year }))]}
            onChange={onYearFilterChange}
            className="orders-year-filter"
          />
        )}
      </div>
    </>
  );
}
