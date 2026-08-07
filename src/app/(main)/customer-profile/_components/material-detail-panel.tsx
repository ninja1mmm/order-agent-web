"use client";

import { LineChart } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import {
  getMaterialShippingForecast,
  type MaterialShippingForecastResponse,
} from "@/services/customer-profile";
import { formatDisplayDate, formatQuantity } from "./customer-profile-utils";

type MaterialDetailPanelProps = {
  customerId: string | null;
  internalPartNumber: string | null;
  designation?: string | null;
};

const RANGE_OPTIONS = [
  { days: 30, label: "30 天" },
  { days: 60, label: "60 天" },
  { days: 90, label: "90 天" },
  { days: 180, label: "180 天" },
];

export function MaterialDetailPanel({ customerId, internalPartNumber, designation }: MaterialDetailPanelProps) {
  const [days, setDays] = useState(90);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MaterialShippingForecastResponse | null>(null);

  useEffect(() => {
    if (!customerId || !internalPartNumber) return;

    let cancelled = false;
    const cid = customerId;
    const pn = internalPartNumber;

    async function fetchData() {
      setLoading(true);
      try {
        const response = await getMaterialShippingForecast(cid, pn, days);
        if (cancelled) return;
        setData(response);
      } catch {
        if (cancelled) return;
        setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchData();
    return () => { cancelled = true; };
  }, [customerId, internalPartNumber, days]);

  const chartData = (data?.dataPoints ?? []).map((pt) => ({
    label: formatDisplayDate(pt.shippingDate),
    shippingQty: pt.shippingQty,
    forecastQty: pt.lastForecastQty ?? 0,
  }));

  const hasData = chartData.length > 0;

  return (
    <aside className="panel scroll-panel">
      <div className="panel-head">
        <h2 className="panel-title">
          <LineChart className="h-4 w-4" aria-hidden="true" />
          物料发运与预测对比
        </h2>
      </div>
      <div className="panel-body stack">
        {!internalPartNumber ? (
          <p className="item-meta">请在中间面板选择物料查看发运与预测对比</p>
        ) : (
          <>
            <div className="card">
              <p className="item-title">当前选中物料</p>
              <p className="item-meta">
                {internalPartNumber}
                {designation ? ` · ${designation}` : ""}
              </p>
            </div>

            <div className="mode-strip" style={{ justifyContent: "flex-start", gap: 4 }}>
              {RANGE_OPTIONS.map((opt) => (
                <Button
                  key={opt.days}
                  variant={days === opt.days ? "primary" : "default"}
                  size="sm"
                  onClick={() => setDays(opt.days)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>

            {loading ? (
              <p className="item-meta">加载数据...</p>
            ) : !hasData ? (
              <p className="item-meta">该时间段内暂无发运记录</p>
            ) : (
              <>
                <div className="chart customer-profile-chart">
                  <ResponsiveContainer width="100%" height={240}>
                    <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.25)" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10 }}
                        interval={0}
                        angle={chartData.length > 4 ? -30 : 0}
                        textAnchor={chartData.length > 4 ? "end" : "middle"}
                        height={chartData.length > 4 ? 50 : 30}
                      />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value, name) => [
                          formatQuantity(typeof value === "number" ? value : Number(value ?? 0)),
                          name === "shippingQty" ? "实际发运" : "预测 Forecast",
                        ]}
                      />
                      <Legend
                        formatter={(value) => (value === "shippingQty" ? "实际发运 Shipping" : "预测 Forecast")}
                      />
                      <Bar dataKey="shippingQty" fill="var(--forvia-cyan)" radius={[6, 6, 0, 0]} name="shippingQty" barSize={chartData.length === 1 ? 40 : undefined} />
                      <Bar dataKey="forecastQty" fill="var(--forvia-blue)" radius={[6, 6, 0, 0]} name="forecastQty" barSize={chartData.length === 1 ? 40 : undefined} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>

                <div className="chart-legend">
                  <span>青柱：实际发运数量</span>
                  <span>蓝柱：发运前最后一次预测</span>
                </div>

                <div className="card">
                  <p className="item-title">
                    发运明细（近 {days} 天 · {data?.dateFrom ? formatDisplayDate(data.dateFrom) : ""} ~ {data?.dateTo ? formatDisplayDate(data.dateTo) : ""}）
                  </p>
                  <table className="table table-compact">
                    <thead>
                      <tr>
                        <th>发运日期</th>
                        <th>ISO 周</th>
                        <th>实际发运</th>
                        <th>最后预测</th>
                        <th>差异</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.dataPoints ?? []).map((pt) => {
                        const diff = pt.lastForecastQty != null ? pt.shippingQty - pt.lastForecastQty : null;
                        return (
                          <tr key={pt.shippingDate}>
                            <td>{formatDisplayDate(pt.shippingDate)}</td>
                            <td>{pt.weekKey}</td>
                            <td>{formatQuantity(pt.shippingQty)}</td>
                            <td>{pt.lastForecastQty != null ? formatQuantity(pt.lastForecastQty) : "-"}</td>
                            <td>
                              {diff != null ? (
                                <span className={diff > 0 ? "text-green" : diff < 0 ? "text-red" : ""}>
                                  {diff > 0 ? "+" : ""}{formatQuantity(diff)}
                                </span>
                              ) : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
