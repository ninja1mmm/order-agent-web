"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FileOutput } from "lucide-react";

import {
  getSalesForecast,
  getShippingPlan,
  type SalesForecast,
  type SalesForecastResponse,
  type ShippingLine,
  type ShippingPlan,
  type ShippingPlanResponse,
} from "../../../services/orders";
import { Button } from "@/components/ui/button";
import { FilterSelect } from "@/components/ui/select";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type Locale, copy, customerLabel, customerLabelFromId, formatDateTime, useCustomerConfig } from "./shared";
import { type CustomerConfig, type MaterialMapping } from "../../../services/settings";

type MaterialRow = {
  rowKey: string;
  customerPartNumber: string;
  internalPartNumber: string;
  customerId: string;
  customerName: string;
  updatedAt: string;
  sourceTaskIds: string[];
  weekSourceTaskIds: Record<string, string[]>;
  weekQty: Record<string, number>;
};

type FlatShippingRow = ShippingLine & {
  customerId: string;
  planId: string;
  updatedAt: string;
};

const ORDER_HIGHLIGHT_BG = "rgb(236 253 245)";

function findCustomer(customers: CustomerConfig[], customerId: string) {
  return customers.find((customer) => customer.id === customerId);
}

function findMaterialMapping(customer: CustomerConfig | undefined, materialNumber: string): MaterialMapping | undefined {
  return customer?.materialMappings.find(
    (mapping) =>
      mapping.customerPartNumber === materialNumber ||
      mapping.internalPartNumber === materialNumber,
  );
}

function buildWeeklyPivot(forecasts: SalesForecast[], customers: CustomerConfig[]) {
  const weekSet = new Set<string>();
  const materialMap = new Map<string, MaterialRow>();

  for (const forecast of forecasts) {
    const customer = findCustomer(customers, forecast.customerId);
    const customerName = customer?.name ?? forecast.customerId;

    for (const line of forecast.lines) {
      const mapping = findMaterialMapping(customer, line.customerPartNumber);
      const internalPN = mapping?.internalPartNumber ?? line.internalPartNumber;
      const key = `${forecast.customerId}:${line.customerPartNumber}`;

      let row = materialMap.get(key);
      if (!row) {
        row = {
          rowKey: key,
          customerPartNumber: line.customerPartNumber,
          internalPartNumber: internalPN,
          customerId: forecast.customerId,
          customerName,
          updatedAt: forecast.updatedAt ?? "",
          sourceTaskIds: [],
          weekSourceTaskIds: {},
          weekQty: {},
        };
        materialMap.set(key, row);
      }

      for (const wq of line.weekQuantities) {
        weekSet.add(wq.weekKey);
        row.weekQty[wq.weekKey] = (row.weekQty[wq.weekKey] ?? 0) + wq.quantity;
        if (wq.sourceTaskId) {
          const weekTaskIds = row.weekSourceTaskIds[wq.weekKey] ?? [];
          if (!weekTaskIds.includes(wq.sourceTaskId)) {
            row.weekSourceTaskIds[wq.weekKey] = [...weekTaskIds, wq.sourceTaskId];
          }
          if (!row.sourceTaskIds.includes(wq.sourceTaskId)) {
            row.sourceTaskIds.push(wq.sourceTaskId);
          }
        }
      }

      if (forecast.updatedAt && forecast.updatedAt > row.updatedAt) {
        row.updatedAt = forecast.updatedAt;
      }
    }
  }

  const weeks = Array.from(weekSet).sort();
  const rows = Array.from(materialMap.values()).sort((a, b) => a.rowKey.localeCompare(b.rowKey));
  return { weeks, rows };
}

function flattenShippingPlans(plans: ShippingPlan[]): FlatShippingRow[] {
  const rows: FlatShippingRow[] = [];
  for (const plan of plans) {
    for (const line of plan.lines) {
      rows.push({
        ...line,
        customerId: plan.customerId,
        planId: plan.id,
        updatedAt: plan.updatedAt ?? "",
      });
    }
  }
  return rows;
}

function formatWeekLabel(weekKey: string): string {
  const m = weekKey.match(/^(\d{4})-W(\d{2})$/);
  if (!m) return weekKey;
  return `W${m[2]}`;
}

function formatNum(n: number | undefined): string {
  if (n === undefined || n === 0) return "";
  return n.toLocaleString();
}

function sourceMatches(taskIds: string[] | undefined, sourceTaskId: string) {
  return Boolean(sourceTaskId && taskIds?.includes(sourceTaskId));
}

const forecastCopy: Record<Locale, Record<string, string>> = {
  "zh-CN": {
    customer: "Customer",
    customerPN: "Customer P/N",
    internalPN: "Internal P/N",
    total: "合计",
    updatedAt: "更新时间",
  },
  "zh-TW": {
    customer: "Customer",
    customerPN: "Customer P/N",
    internalPN: "Internal P/N",
    total: "合計",
    updatedAt: "更新時間",
  },
  en: {
    customer: "Customer",
    customerPN: "Customer P/N",
    internalPN: "Internal P/N",
    total: "Total",
    updatedAt: "Updated",
  },
};

export function LiveOrders({ locale }: { locale: Locale }) {
  const params = useSearchParams();
  const requestedTab = params.get("tab");
  const highlightedSourceTaskId = params.get("sourceTaskId") ?? "";
  const [forecasts, setForecasts] = useState<SalesForecast[]>([]);
  const [shippingPlans, setShippingPlans] = useState<ShippingPlan[]>([]);
  const [activeTab, setActiveTab] = useState<"forecast" | "shipping">(
    requestedTab === "shipping" ? "shipping" : "forecast",
  );
  const [viewMode, setViewMode] = useState<"current" | "delta">("current");
  const [customerFilter, setCustomerFilter] = useState("__all__");
  const [dateFilter, setDateFilter] = useState("未来 4 周");
  const [materialFilter, setMaterialFilter] = useState("全部料号");
  const [changeFilter, setChangeFilter] = useState("全部");
  const [programFilter, setProgramFilter] = useState("全部");
  const t = copy[locale];
  const ft = forecastCopy[locale];
  const { customers } = useCustomerConfig();

  useEffect(() => {
    getShippingPlan()
      .then((result: ShippingPlanResponse) => setShippingPlans(result.plans))
      .catch(() => setShippingPlans([]));
    getSalesForecast()
      .then((result: SalesForecastResponse) => setForecasts(result.forecasts))
      .catch(() => setForecasts([]));
  }, []);

  const { weeks, rows: pivotRows } = useMemo(() => buildWeeklyPivot(forecasts, customers), [customers, forecasts]);

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

  const flatShipping = useMemo(() => flattenShippingPlans(shippingPlans), [shippingPlans]);

  const customerOptions = [
    { value: "__all__", label: "全部客户" },
    ...customers.map((customer) => ({ value: customer.id, label: customerLabel(customer) })),
  ];
  const forecastMaterials = ["全部料号", ...Array.from(new Set(pivotRows.map((r) => r.customerPartNumber).filter(Boolean)))];

  const shippingMaterials = ["全部料号", ...Array.from(new Set(flatShipping.map((item) => item.materialNumber).filter(Boolean)))];

  const materials = activeTab === "forecast" ? forecastMaterials : shippingMaterials;

  const filteredShipping = flatShipping.filter((item) => {
    if (customerFilter !== "__all__" && item.customerId !== customerFilter) return false;
    if (materialFilter !== "全部料号" && item.materialNumber !== materialFilter) return false;
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
            <Button variant={viewMode === "current" ? "primary" : "default"} size="sm" onClick={() => setViewMode("current")}>
              {t.currentValue}
            </Button>
            <Button variant={viewMode === "delta" ? "primary" : "default"} size="sm" onClick={() => setViewMode("delta")}>
              {t.deltaValue}
            </Button>
            <Button variant="primary" size="sm">
              <FileOutput className="h-3.5 w-3.5" /> {t.export}
            </Button>
          </div>
        </div>
        <div className="panel-body">
          <div className="filter-bar" style={{ marginBottom: 14, gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
            <FilterSelect label={t.filterCustomer} value={customerFilter} options={customerOptions} onChange={setCustomerFilter} />
            <FilterSelect label={t.filterDate} value={dateFilter} options={["本月", "未来 4 周", "未来 12 周", "自定义"]} onChange={setDateFilter} />
            <FilterSelect label={t.filterMaterial} value={materialFilter} options={materials} onChange={setMaterialFilter} />
            <FilterSelect label={t.filterChange} value={changeFilter} options={["全部", "有增加", "有减少", "人工修改"]} onChange={setChangeFilter} />
            <FilterSelect label={t.filterProgram} value={programFilter} options={["全部", "Audi_Q5L", "E-pump 1.0", "E-pump 2.0"]} onChange={setProgramFilter} />
          </div>
          <TabsList>
            <TabsTrigger active={activeTab === "forecast"} onClick={() => setActiveTab("forecast")}>
              {t.salesForecast}
            </TabsTrigger>
            <TabsTrigger active={activeTab === "shipping"} onClick={() => setActiveTab("shipping")}>
              {t.shippingPlan}
            </TabsTrigger>
          </TabsList>
          {activeTab === "forecast" ? (
            <>
              <div className="scroll-x" style={{ maxHeight: "calc(100vh - 320px)" }}>
                <table className="table forecast-pivot" style={{ minWidth: Math.max(900, 460 + weeks.length * 80) }}>
                  <thead>
                    <tr>
                      <th style={{ position: "sticky", left: 0, zIndex: 2, background: "#f8fafc", minWidth: 110 }}>{ft.customer}</th>
                      <th style={{ position: "sticky", left: 110, zIndex: 2, background: "#f8fafc", minWidth: 130 }}>{ft.customerPN}</th>
                      <th style={{ minWidth: 200 }}>{ft.internalPN}</th>
                      <th style={{ minWidth: 130 }}>{ft.updatedAt}</th>
                      {weeks.map((wk) => (
                        <th key={wk} style={{ textAlign: "right", minWidth: 72, whiteSpace: "nowrap" }}>
                          <div style={{ fontWeight: 900 }}>{formatWeekLabel(wk)}</div>
                        </th>
                      ))}
                      <th style={{ textAlign: "right", minWidth: 80, fontWeight: 900, background: "var(--forvia-blue-soft)" }}>{ft.total}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPivot.map((row) => {
                      const total = Object.values(row.weekQty).reduce((a, b) => a + b, 0);
                      const isHighlighted = sourceMatches(row.sourceTaskIds, highlightedSourceTaskId);
                      return (
                        <tr className={isHighlighted ? "order-highlight-row" : ""} key={row.rowKey}>
                          <td style={{ position: "sticky", left: 0, zIndex: 1, background: "white", fontWeight: 800 }}>{customerLabelFromId(customers, row.customerId, row.customerName)}</td>
                          <td style={{ position: "sticky", left: 110, zIndex: 1, background: "white", fontWeight: 850 }}>{row.customerPartNumber}</td>
                          <td style={{ fontSize: 11, color: "var(--muted)" }} title={row.internalPartNumber}>
                            {row.internalPartNumber}
                          </td>
                          <td style={{ fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap" }}>
                            {row.updatedAt ? formatDateTime(row.updatedAt, locale) : ""}
                          </td>
                          {weeks.map((wk) => {
                            const qty = row.weekQty[wk];
                            const isCellHighlighted = sourceMatches(
                              row.weekSourceTaskIds[wk],
                              highlightedSourceTaskId,
                            );
                            return (
                              <td
                                key={wk}
                                style={{
                                  textAlign: "right",
                                  fontVariantNumeric: "tabular-nums",
                                  fontWeight: qty ? 800 : 400,
                                  color: isCellHighlighted ? "var(--success)" : qty ? "var(--ink)" : "var(--muted)",
                                  background: isCellHighlighted ? ORDER_HIGHLIGHT_BG : undefined,
                                  boxShadow: isCellHighlighted ? "inset 0 0 0 1px #a7f3d0" : undefined,
                                }}
                              >
                                {formatNum(qty)}
                              </td>
                            );
                          })}
                          <td style={{ textAlign: "right", fontWeight: 900, background: "var(--forvia-blue-soft)", color: "var(--forvia-blue-ink)" }}>
                            {total.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {forecasts.length === 0 ? <p className="empty-table-hint">{t.noForecast}</p> : null}
            </>
          ) : (
            <div className="scroll-x">
              <table className="table" style={{ minWidth: 900 }}>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Material Number</th>
                    <th>Order Number</th>
                    <th>Order Line</th>
                    <th>Actual Qty</th>
                    <th>Shipping Date</th>
                    <th>Delivery Note</th>
                    <th>{ft.updatedAt}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShipping.map((row) => {
                    const isHighlighted = Boolean(highlightedSourceTaskId && row.sourceTaskId === highlightedSourceTaskId);
                    const cellBackground = isHighlighted ? ORDER_HIGHLIGHT_BG : undefined;
                    return (
                      <tr className={isHighlighted ? "order-highlight-row" : ""} key={row.lineId}>
                        <td style={{ background: cellBackground }}>{customerLabelFromId(customers, row.customerId)}</td>
                        <td style={{ background: cellBackground }}>{row.materialNumber}</td>
                        <td style={{ background: cellBackground }}>{row.orderNumber ?? ""}</td>
                        <td style={{ background: cellBackground }}>{row.orderLine ?? ""}</td>
                        <td style={{ background: cellBackground }}>{row.actualQty ?? ""}</td>
                        <td style={{ background: cellBackground }}>{row.shippingDate}</td>
                        <td style={{ background: cellBackground }}>{row.deliveryNote ?? ""}</td>
                        <td style={{ fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap", background: cellBackground }}>{row.updatedAt ? formatDateTime(row.updatedAt, locale) : ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
