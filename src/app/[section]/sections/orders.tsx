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

function formatNum(n: number | undefined): string {
  if (n === undefined || n === 0) return "";
  return n.toLocaleString();
}

function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function isoDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function computeWeekRange(filter: string): { weekFrom?: string; weekTo?: string } {
  const now = new Date();
  if (filter === "本月") {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { weekFrom: isoWeekKey(monthStart), weekTo: isoWeekKey(monthEnd) };
  }
  if (filter === "未来 4 周") {
    const end = new Date(now);
    end.setDate(end.getDate() + 4 * 7);
    return { weekFrom: isoWeekKey(now), weekTo: isoWeekKey(end) };
  }
  if (filter === "未来 12 周") {
    const end = new Date(now);
    end.setDate(end.getDate() + 12 * 7);
    return { weekFrom: isoWeekKey(now), weekTo: isoWeekKey(end) };
  }
  return {};
}

function computeDateRange(filter: string): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  if (filter === "本月") {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { dateFrom: isoDateKey(monthStart), dateTo: isoDateKey(monthEnd) };
  }
  if (filter === "未来 4 周") {
    const end = new Date(now);
    end.setDate(end.getDate() + 4 * 7);
    return { dateFrom: isoDateKey(now), dateTo: isoDateKey(end) };
  }
  if (filter === "未来 12 周") {
    const end = new Date(now);
    end.setDate(end.getDate() + 12 * 7);
    return { dateFrom: isoDateKey(now), dateTo: isoDateKey(end) };
  }
  return {};
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
  const [forecastLines, setForecastLines] = useState<SalesForecastLine[]>([]);
  const [shippingLines, setShippingLines] = useState<ShippingPlanLine[]>([]);
  const [activeTab, setActiveTab] = useState<"forecast" | "shipping">(
    requestedTab === "shipping" ? "shipping" : "forecast",
  );
  const [viewMode, setViewMode] = useState<"current" | "delta">("current");
  const [customerFilter, setCustomerFilter] = useState("__all__");
  const [dateFilter, setDateFilter] = useState("全部");
  const [materialFilter, setMaterialFilter] = useState("全部料号");
  const [changeFilter, setChangeFilter] = useState("全部");
  const [programFilter, setProgramFilter] = useState("全部");
  const t = copy[locale];
  const ft = forecastCopy[locale];
  const { customers } = useCustomerConfig();

  const fetchData = useCallback(() => {
    const weekRange = computeWeekRange(dateFilter);
    const dateRange = computeDateRange(dateFilter);

    getShippingPlan(dateRange)
      .then((result: ShippingPlanResponse) => setShippingLines(result.lines))
      .catch(() => setShippingLines([]));
    getSalesForecast(weekRange)
      .then((result: SalesForecastResponse) => setForecastLines(result.lines))
      .catch(() => setForecastLines([]));
  }, [dateFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const { weeks, rows: pivotRows } = useMemo(() => buildWeeklyPivot(forecastLines, customers), [customers, forecastLines]);

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
            <FilterSelect label={t.filterDate} value={dateFilter} options={["全部", "本月", "未来 4 周", "未来 12 周"]} onChange={setDateFilter} />
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
                      const isHighlighted = Boolean(highlightedSourceTaskId && row.sourceTaskId === highlightedSourceTaskId);
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
            <div className="scroll-x">
              <table className="table" style={{ minWidth: 900 }}>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Internal P/N</th>
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
      </section>
    </>
  );
}
