"use client";

import { Boxes } from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import type {
  CustomerProfileMaterial,
  CustomerProfileViewMode,
  MaterialWeeklyProfileResponse,
} from "@/services/customer-profile";
import {
  buildRollingWeekKeys,
  buildYearWeekKeys,
  formatQuantity,
  shippingHeatLevel,
  weekShortLabel,
} from "./customer-profile-utils";

type WeekOverviewPanelProps = {
  viewMode: CustomerProfileViewMode;
  year: number;
  materials: CustomerProfileMaterial[];
  selectedMaterial: string | null;
  weeklyProfile: MaterialWeeklyProfileResponse | null;
  loadingMaterials: boolean;
  loadingProfile: boolean;
  onViewModeChange: (mode: CustomerProfileViewMode) => void;
  onYearChange: (year: number) => void;
  onMaterialSelect: (internalPartNumber: string) => void;
};

const VIEW_MODES: { key: CustomerProfileViewMode; label: string }[] = [
  { key: "year", label: "按年" },
  { key: "30", label: "近 30 天" },
  { key: "60", label: "近 60 天" },
  { key: "90", label: "近 90 天" },
];

export function WeekOverviewPanel({
  viewMode,
  year,
  materials,
  selectedMaterial,
  weeklyProfile,
  loadingMaterials,
  loadingProfile,
  onViewModeChange,
  onYearChange,
  onMaterialSelect,
}: WeekOverviewPanelProps) {
  const weekMap = useMemo(() => {
    return new Map((weeklyProfile?.weeks ?? []).map((week) => [week.weekKey, week]));
  }, [weeklyProfile]);

  const displayWeeks = useMemo(() => {
    const keys = viewMode === "year" ? buildYearWeekKeys(year) : buildRollingWeekKeys(Number(viewMode));
    return keys.map((weekKey) => weekMap.get(weekKey) ?? {
      weekKey,
      dateRange: "",
      shippingQty: 0,
      shippingCount: 0,
      lastForecastQty: 0,
      hasForecast: false,
      lastForecastReceivedAt: null,
      lastForecastSourceFile: null,
      diff: 0,
      diffRate: null,
    });
  }, [viewMode, year, weekMap]);

  const chartData = (weeklyProfile?.weeks ?? []).map((week) => ({
    weekKey: week.weekKey,
    shippingQty: week.shippingQty,
    forecastQty: week.lastForecastQty,
    hasForecast: week.hasForecast,
    dateRange: week.dateRange,
    diff: week.diff,
    diffRate: week.diffRate,
    lastForecastReceivedAt: week.lastForecastReceivedAt,
  }));

  return (
    <section className="panel scroll-panel">
      <div className="panel-head">
        <h2 className="panel-title">
          <Boxes className="h-4 w-4" aria-hidden="true" />
          物料跨周发运与预测
        </h2>
        <div className="mode-strip">
          {VIEW_MODES.map((mode) => (
            <Button
              key={mode.key}
              variant={viewMode === mode.key ? "primary" : "default"}
              size="sm"
              onClick={() => onViewModeChange(mode.key)}
            >
              {mode.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="panel-body customer-profile-middle">
        <aside className="material-list-pane">
          <div className="mini-title">物料</div>
          {loadingMaterials ? (
            <p className="item-meta">加载物料...</p>
          ) : materials.length === 0 ? (
            <p className="item-meta">该客户暂无发运物料</p>
          ) : (
            <div className="material-list-scroll">
              {materials.map((material) => (
                <button
                  key={material.internalPartNumber}
                  type="button"
                  className={`material-list-item${selectedMaterial === material.internalPartNumber ? " selected" : ""}`}
                  onClick={() => onMaterialSelect(material.internalPartNumber)}
                >
                  <span className="material-list-primary">{material.internalPartNumber}</span>
                  <span className="material-list-secondary">
                    {material.customerPartNumber ?? "Customer PN -"}
                  </span>
                  <span className="material-list-meta">
                    {material.designation ?? "-"} · {material.shippingWeekCount} 周 · {formatQuantity(material.totalShippingQty)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </aside>

        <section className="material-analysis-pane">
          <div className="card">
            <div className="row" style={{ alignItems: "flex-start", marginBottom: 12 }}>
              <p className="mini-title" style={{ marginBottom: 0 }}>
                物料发运周热力图
              </p>
              {viewMode === "year" ? (
                <div className="row" style={{ justifyContent: "flex-end" }}>
                  {[year - 1, year, year + 1].map((item) => (
                    <button
                      key={item}
                      type="button"
                      className={`badge ${item === year ? "blue" : "slate"}`}
                      onClick={() => onYearChange(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {loadingProfile ? (
              <p className="item-meta">加载发运周...</p>
            ) : !selectedMaterial ? (
              <p className="item-meta">请选择物料查看发运周</p>
            ) : viewMode === "year" ? (
              <div className="year-grid material-week-grid" data-profile-heatmap>
                {displayWeeks.map((week) => (
                  <button
                    key={week.weekKey}
                    type="button"
                    className={`week-block ${shippingHeatLevel(week.shippingQty)}`}
                    disabled={week.shippingQty <= 0}
                    title={`${week.weekKey} shipping ${formatQuantity(week.shippingQty)}`}
                  >
                    <span>{weekShortLabel(week.weekKey)}</span>
                    <span className="week-count">{formatQuantity(week.shippingQty)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rolling-strip" data-profile-heatmap>
                {displayWeeks.map((week) => (
                  <button
                    key={week.weekKey}
                    type="button"
                    className={`rolling-week ${shippingHeatLevel(week.shippingQty)}`}
                    disabled={week.shippingQty <= 0}
                    title={`${week.weekKey} shipping ${formatQuantity(week.shippingQty)}`}
                  >
                    <span>{week.weekKey}</span>
                    <span className="week-count">{formatQuantity(week.shippingQty)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card material-combo-card">
            <div className="chart-card-head">
              <p className="mini-title" style={{ marginBottom: 0 }}>每周发运与最后预测</p>
              <div className="compact-chart-legend" aria-hidden="true">
                <span><i className="legend-dot forecast" />最后预测</span>
                <span><i className="legend-bar shipping" />实际发运</span>
              </div>
            </div>
            {loadingProfile ? (
              <p className="item-meta">加载组合图...</p>
            ) : chartData.length === 0 ? (
              <p className="item-meta">该时间段内暂无发运记录</p>
            ) : (
              <div className="chart customer-profile-chart">
                <ResponsiveContainer width="100%" height={230}>
                  <ComposedChart data={chartData} margin={{ top: 8, right: 10, left: -8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.25)" />
                      <XAxis dataKey="weekKey" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(value, name, props) => {
                          const payload = props.payload as (typeof chartData)[number];
                          if (name === "forecastQty" && !payload.hasForecast) {
                            return ["0 (无预测)", "最后预测"];
                          }
                          return [
                            formatQuantity(typeof value === "number" ? value : Number(value ?? 0)),
                            name === "shippingQty" ? "实际发运" : "最后预测",
                          ];
                        }}
                        labelFormatter={(label, payload) => {
                          const item = payload[0]?.payload as (typeof chartData)[number] | undefined;
                          return `${label}${item?.dateRange ? ` · ${item.dateRange}` : ""}`;
                        }}
                      />
                      <Bar dataKey="shippingQty" fill="#06b6d4" radius={[6, 6, 0, 0]} name="shippingQty" />
                      <Line
                        type="monotone"
                        dataKey="forecastQty"
                        stroke="#5b6cff"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="forecastQty"
                      />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </section>
      </div>
    </section>
  );
}
