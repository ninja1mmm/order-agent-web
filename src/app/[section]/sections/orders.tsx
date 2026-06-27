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
} from "../../../services/orders";
import { Button } from "@/components/ui/button";
import { FilterSelect, SearchableFilterSelect } from "@/components/ui/select";
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
  sourceTaskId: string | null;
  weekQty: Record<string, number>;
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

function buildWeeklyPivot(lines: SalesForecastLine[], customers: CustomerConfig[]) {
  const weekSet = new Set<string>();
  const materialMap = new Map<string, MaterialRow>();

  for (const line of lines) {
    const customer = findCustomer(customers, line.customerId);
    const customerName = customer?.name ?? line.customerName ?? line.customerId;
    const mapping = findMaterialMapping(customer, line.customerPartNumber);
    const internalPN = mapping?.internalPartNumber ?? line.internalPartNumber;
    const key = `${line.customerId}:${line.customerPartNumber}`;

    let row = materialMap.get(key);
    if (!row) {
      row = {
        rowKey: key,
        customerPartNumber: line.customerPartNumber,
        internalPartNumber: internalPN,
        customerId: line.customerId,
        customerName,
        updatedAt: line.updatedAt ?? "",
        sourceTaskId: line.sourceTaskId,
        weekQty: {},
      };
      materialMap.set(key, row);
    }

    for (const [weekKey, qty] of Object.entries(line.weekQuantities)) {
      weekSet.add(weekKey);
      row.weekQty[weekKey] = (row.weekQty[weekKey] ?? 0) + qty;
    }

    if (line.updatedAt && line.updatedAt > row.updatedAt) {
      row.updatedAt = line.updatedAt;
    }
  }

  const weeks = Array.from(weekSet).sort();
  const rows = Array.from(materialMap.values()).sort((a, b) => a.rowKey.localeCompare(b.rowKey));
  return { weeks, rows };
}

function formatWeekLabel(weekKey: string): string {
  const m = weekKey.match(/^(\d{4})-W(\d{2})$/);
  if (!m) return weekKey;
  return `W${m[2]}`;
}

function getWeekYear(weekKey: string): string {
  const m = weekKey.match(/^(\d{4})-W\d{2}$/);
  return m ? m[1] : "";
}

function formatNum(n: number | undefined): string {
  if (n === undefined || n === 0) return "";
  return n.toLocaleString();
}

const forecastCopy: Record<Locale, Record<string, string>> = {
  "zh-CN": {
    customer: "Customer",
    customerPN: "Customer P/N",
    internalPN: "Faurecia P/N",
    total: "合计",
    updatedAt: "Updated Time",
  },
  "zh-TW": {
    customer: "Customer",
    customerPN: "Customer P/N",
    internalPN: "Faurecia P/N",
    total: "合計",
    updatedAt: "Updated Time",
  },
  en: {
    customer: "Customer",
    customerPN: "Customer P/N",
    internalPN: "Faurecia P/N",
    total: "Total",
    updatedAt: "Updated Time",
  },
};

export function LiveOrders({ locale }: { locale: Locale }) {
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
  const ft = forecastCopy[locale];
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
          <div className="filter-bar" style={{ marginBottom: 14, gridTemplateColumns: "repeat(2, minmax(0, 1fr))", maxWidth: 480 }}>
            <FilterSelect label={t.filterCustomer} value={customerFilter} options={customerOptions} onChange={setCustomerFilter} />
            <SearchableFilterSelect label={t.filterMaterial} value={materialFilter} options={materials} onChange={setMaterialFilter} placeholder="搜索料号..." />
          </div>
          <div className="orders-tabs-row">
            <TabsList className="orders-tabs-strip">
              <TabsTrigger active={activeTab === "forecast"} onClick={() => setActiveTab("forecast")}>
                {t.salesForecast}
              </TabsTrigger>
              <TabsTrigger active={activeTab === "shipping"} onClick={() => setActiveTab("shipping")}>
                {t.shippingPlan}
              </TabsTrigger>
            </TabsList>
            {activeTab === "forecast" && (
              <FilterSelect
                label="Year"
                value={yearFilter}
                options={[{ value: "__all__", label: "全部" }, ...availableYears.map((y) => ({ value: y, label: y }))]}
                onChange={setYearFilter}
                className="orders-year-filter"
              />
            )}
          </div>
          <div className="orders-table-fill">
            {activeTab === "forecast" ? (
              <>
                <div className="scroll-x orders-table-scroll">
                  <table className="table forecast-pivot" style={{ minWidth: Math.max(900, 460 + weeks.length * 80) }}>
                    <thead>
                      <tr>
                        <th style={{ position: "sticky", left: 0, zIndex: 3, background: "#f8fafc", minWidth: 110 }}>{ft.customer}</th>
                        <th style={{ position: "sticky", left: 110, zIndex: 3, background: "#f8fafc", minWidth: 130 }}>{ft.customerPN}</th>
                        <th style={{ position: "sticky", left: 240, zIndex: 3, background: "#f8fafc", minWidth: 140 }}>{ft.internalPN}</th>
                        <th style={{ position: "sticky", left: 380, zIndex: 3, background: "#f8fafc", minWidth: 110 }}>{ft.updatedAt}</th>
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
                        const total = weeks.reduce((sum, wk) => sum + (row.weekQty[wk] ?? 0), 0);
                        const isHighlighted = Boolean(highlightedSourceTaskId && row.sourceTaskId === highlightedSourceTaskId);
                        return (
                          <tr className={isHighlighted ? "order-highlight-row" : ""} key={row.rowKey}>
                            <td style={{ position: "sticky", left: 0, zIndex: 1, background: "white", fontWeight: 800 }}>{customerLabelFromId(customers, row.customerId, row.customerName)}</td>
                            <td style={{ position: "sticky", left: 110, zIndex: 1, background: "white", fontWeight: 850 }}>{row.customerPartNumber}</td>
                            <td style={{ position: "sticky", left: 240, zIndex: 1, background: "white", fontSize: 11, color: "var(--muted)" }} title={row.internalPartNumber}>
                              {row.internalPartNumber}
                            </td>
                            <td style={{ position: "sticky", left: 380, zIndex: 1, background: "white", fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap" }}>
                              {row.updatedAt ? formatDateTime(row.updatedAt, locale) : ""}
                            </td>
                            {weeks.map((wk) => {
                              const qty = row.weekQty[wk];
                              return (
                                <td
                                  key={wk}
                                  style={{
                                    textAlign: "right",
                                    fontVariantNumeric: "tabular-nums",
                                    fontWeight: qty ? 800 : 400,
                                    color: qty ? "var(--ink)" : "var(--muted)",
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
                {forecastLines.length === 0 ? <p className="empty-table-hint">{t.noForecast}</p> : null}
              </>
            ) : (
              <div className="scroll-x orders-table-scroll">
                <table className="table" style={{ minWidth: 900 }}>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Faurecia P/N</th>
                      <th>Quantity</th>
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
                        <tr className={isHighlighted ? "order-highlight-row" : ""} key={row.id}>
                          <td style={{ background: cellBackground }}>{customerLabelFromId(customers, row.customerId, row.customerName)}</td>
                          <td style={{ background: cellBackground }}>{row.internalPartNumber}</td>
                          <td style={{ background: cellBackground }}>{row.quantity ?? ""}</td>
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
        </div>
      </section>
    </>
  );
}
