"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FileOutput } from "lucide-react";

import {
  getSalesForecast,
  getShippingPlan,
  type SalesForecastRecord,
  type ShippingPlanRecord,
} from "../../../services/orders";
import { Button } from "@/components/ui/button";
import { FilterSelect } from "@/components/ui/select";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type Locale, copy } from "./shared";

export function LiveOrders({ locale }: { locale: Locale }) {
  const [records, setRecords] = useState<ShippingPlanRecord[]>([]);
  const [forecastRecords, setForecastRecords] = useState<SalesForecastRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"forecast" | "shipping">("shipping");
  const [viewMode, setViewMode] = useState<"current" | "delta">("current");
  const [customerFilter, setCustomerFilter] = useState("全部客户");
  const [dateFilter, setDateFilter] = useState("未来 4 周");
  const [materialFilter, setMaterialFilter] = useState("全部料号");
  const [changeFilter, setChangeFilter] = useState("全部");
  const [programFilter, setProgramFilter] = useState("全部");
  const t = copy[locale];

  useEffect(() => {
    getShippingPlan()
      .then((result) => setRecords(result.records))
      .catch(() => setRecords([]));
    getSalesForecast()
      .then((result) => setForecastRecords(result.records))
      .catch(() => setForecastRecords([]));
  }, []);

  const customers = ["全部客户", ...Array.from(new Set(records.map((item) => item.customer_name || item.customer_id).filter(Boolean) as string[]))];
  const materials = ["全部料号", ...Array.from(new Set(records.map((item) => item.material_number).filter(Boolean)))];
  const filtered = records.filter((item) => {
    const customerLabel = item.customer_name || item.customer_id;
    if (customerFilter !== "全部客户" && customerLabel !== customerFilter) return false;
    if (materialFilter !== "全部料号" && item.material_number !== materialFilter) return false;
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
            <FilterSelect label={t.filterCustomer} value={customerFilter} options={customers} onChange={setCustomerFilter} />
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
              <div className="scroll-x">
                <table className="table" style={{ minWidth: 960 }}>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Material</th>
                      <th>Week</th>
                      <th>Quantity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecastRecords.map((row) => (
                      <tr key={row.record_id}>
                        <td>{row.customer_id}</td>
                        <td>{row.material_number}</td>
                        <td>{row.week_key}</td>
                        <td>{row.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {forecastRecords.length === 0 ? <p className="empty-table-hint">{t.noForecast}</p> : null}
            </>
          ) : (
            <div className="scroll-x">
              <table className="table" style={{ minWidth: 1180 }}>
                <thead>
                  <tr>
                    <th>Source.Name</th>
                    <th>Customer code</th>
                    <th>Customer</th>
                    <th>Part Number</th>
                    <th>Actual Qty</th>
                    <th>Shipping Date</th>
                    <th>Delivery Note</th>
                    <th>备注</th>
                    <th>客服</th>
                    <th>一厂OR二厂</th>
                    <th>HU</th>
                    <th>托数</th>
                    <th>Product</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr key={row.record_id}>
                      <td>{row.source_name ?? ""}</td>
                      <td>{row.customer_id}</td>
                      <td>{row.customer_name ?? row.customer_id}</td>
                      <td>{row.material_number}</td>
                      <td>{row.actual_qty ?? ""}</td>
                      <td>{row.shipping_date}</td>
                      <td>{row.delivery_note ?? ""}</td>
                      <td>{row.supplier_document ?? ""}</td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td>{row.box_count ?? ""}</td>
                      <td>{row.designation ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
