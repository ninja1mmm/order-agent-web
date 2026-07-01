"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FileOutput } from "lucide-react";

import {
  getSalesForecast,
  getShippingPlan,
  type SalesForecastLine,
  type SalesForecastResponse,
  type ShippingPlanLine,
  type ShippingPlanResponse,
} from "@/services/orders";
import { Button } from "@/components/ui/button";
import { copy, customerLabel, useCustomerConfig, useLocale } from "../../_components/shared";
import { ForecastTable } from "./forecast-table";
import { OrdersFilters } from "./orders-filters";
import { ShippingTable } from "./shipping-table";
import { buildWeeklyPivot, getWeekYear } from "./order-utils";

export function OrdersPage() {
  const locale = useLocale();
  const params = useSearchParams();
  const requestedTab = params.get("tab");
  const highlightedSourceTaskId = params.get("sourceTaskId") ?? "";
  const [forecastLines, setForecastLines] = useState<SalesForecastLine[]>([]);
  const [shippingLines, setShippingLines] = useState<ShippingPlanLine[]>([]);
  const [activeTab, setActiveTab] = useState<"forecast" | "shipping">(
    requestedTab === "shipping" ? "shipping" : "forecast",
  );
  const [customerFilter, setCustomerFilter] = useState("__all__");
  const [materialFilter, setMaterialFilter] = useState("全部料号");
  const [yearFilter, setYearFilter] = useState("__all__");
  const t = copy[locale];
  const { customers } = useCustomerConfig();

  const fetchData = useCallback(() => {
    getShippingPlan()
      .then((result: ShippingPlanResponse) => setShippingLines(result.lines))
      .catch(() => setShippingLines([]));
    getSalesForecast()
      .then((result: SalesForecastResponse) => setForecastLines(result.lines))
      .catch(() => setForecastLines([]));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { weeks: allWeeks, rows: pivotRows } = useMemo(() => buildWeeklyPivot(forecastLines, customers), [customers, forecastLines]);

  const availableYears = useMemo(() => {
    const yearSet = new Set<string>();
    for (const wk of allWeeks) {
      const y = getWeekYear(wk);
      if (y) yearSet.add(y);
    }
    return Array.from(yearSet).sort();
  }, [allWeeks]);

  const weeks = useMemo(() => {
    if (yearFilter === "__all__") return allWeeks;
    return allWeeks.filter((wk) => getWeekYear(wk) === yearFilter);
  }, [allWeeks, yearFilter]);

  const filteredPivot = useMemo(() => {
    return pivotRows.filter((row) => {
      if (
        materialFilter !== "全部料号" &&
        row.customerPartNumber !== materialFilter &&
        row.internalPartNumber !== materialFilter
      ) return false;
      if (customerFilter !== "__all__" && row.customerId !== customerFilter) return false;
      return true;
    });
  }, [pivotRows, materialFilter, customerFilter]);

  const customerOptions = [
    { value: "__all__", label: "全部客户" },
    ...customers.map((customer) => ({ value: customer.id, label: customerLabel(customer) })),
  ];
  const forecastMaterials = ["全部料号", ...Array.from(new Set(pivotRows.map((r) => r.customerPartNumber).filter(Boolean)))];

  const shippingMaterials = ["全部料号", ...Array.from(new Set(shippingLines.map((item) => item.internalPartNumber).filter(Boolean)))];

  const materials = activeTab === "forecast" ? forecastMaterials : shippingMaterials;

  const filteredShipping = shippingLines.filter((item) => {
    if (customerFilter !== "__all__" && item.customerId !== customerFilter) return false;
    if (materialFilter !== "全部料号" && item.internalPartNumber !== materialFilter) return false;
    return true;
  });

  return (
    <>
      <div className="subnav">
        <Link href="/task-workbench">{t.inbox}</Link>
        <Link href="/parse-review">{t.parse}</Link>
        <Link className="active" href="/orders">
          {t.order}
        </Link>
      </div>
      <section className="panel scroll-panel screen-fill">
        <div className="panel-head">
          <h2 className="panel-title">{t.orderTable}</h2>
          <div className="list-actions">
            <Button variant="primary" size="sm">
              <FileOutput className="h-3.5 w-3.5" /> {t.export}
            </Button>
          </div>
        </div>
        <div className="orders-body">
          <OrdersFilters
            customerLabel={t.filterCustomer}
            materialLabel={t.filterMaterial}
            customerFilter={customerFilter}
            materialFilter={materialFilter}
            activeTab={activeTab}
            yearFilter={yearFilter}
            customerOptions={customerOptions}
            materialOptions={materials}
            availableYears={availableYears}
            salesForecastLabel={t.salesForecast}
            shippingPlanLabel={t.shippingPlan}
            onCustomerFilterChange={setCustomerFilter}
            onMaterialFilterChange={setMaterialFilter}
            onActiveTabChange={setActiveTab}
            onYearFilterChange={setYearFilter}
          />
          <div className="orders-table-fill">
            {activeTab === "forecast" ? (
              <ForecastTable
                locale={locale}
                customers={customers}
                rows={filteredPivot}
                weeks={weeks}
                forecastLines={forecastLines}
                highlightedSourceTaskId={highlightedSourceTaskId}
                emptyLabel={t.noForecast}
              />
            ) : (
              <ShippingTable
                locale={locale}
                customers={customers}
                rows={filteredShipping}
                highlightedSourceTaskId={highlightedSourceTaskId}
              />
            )}
          </div>
        </div>
      </section>
    </>
  );
}
