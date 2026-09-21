"use client";

import { Boxes, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useRef } from "react";
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
import { Tooltip as UiTooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  const rollingStripRef = useRef<HTMLDivElement | null>(null);

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

  function scrollRollingWeeks(direction: "left" | "right") {
    const strip = rollingStripRef.current;
    if (!strip) return;
    strip.scrollBy({
      left: direction === "left" ? -320 : 320,
      behavior: "smooth",
    });
  }

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
            <div className="material-list-scroll scrollbar-hidden">
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
                  <UiTooltip key={week.weekKey}><TooltipTrigger asChild><span
                    className={`week-block ${shippingHeatLevel(week.shippingQty)}`}
                    tabIndex={0}
                  >
                    <span>{weekShortLabel(week.weekKey)}</span>
                    <span className="week-count">{formatQuantity(week.shippingQty)}</span>
                  </span></TooltipTrigger><TooltipContent>{week.weekKey} 发运量 {formatQuantity(week.shippingQty)}</TooltipContent></UiTooltip>
                ))}
              </div>
            ) : (
              <div className="rolling-week-shell">
                <Button
                  aria-label="向左滚动物料发运周"
                  tooltip="向左滚动物料发运周"
                  className="rolling-scroll-button"
                  size="icon-sm"
                  onClick={() => scrollRollingWeeks("left")}
                >
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
                <div ref={rollingStripRef} className="rolling-strip profile-week-strip scrollbar-hidden" data-profile-heatmap>
                  {displayWeeks.map((week) => (
                    <UiTooltip key={week.weekKey}><TooltipTrigger asChild><span
                      className={`rolling-week ${shippingHeatLevel(week.shippingQty)}`}
                      tabIndex={0}
                    >
                      <span>{week.weekKey}</span>
                      <span className="week-count">{formatQuantity(week.shippingQty)}</span>
                    </span></TooltipTrigger><TooltipContent>{week.weekKey} 发运量 {formatQuantity(week.shippingQty)}</TooltipContent></UiTooltip>
                  ))}
                </div>
                <Button
                  aria-label="向右滚动物料发运周"
                  tooltip="向右滚动物料发运周"
                  className="rolling-scroll-button"
                  size="icon-sm"
                  onClick={() => scrollRollingWeeks("right")}
                >
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
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
                  <ComposedChart data={chartData} margin={{ top: 8, right: 14, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.25)" />
                      <XAxis dataKey="weekKey" tick={{ fontSize: 11, fill: "var(--muted)" }} tickMargin={8} />
                      <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} width={48} />
                      <Tooltip
                        cursor={{ fill: "rgba(91, 108, 255, 0.06)" }}
                        content={<WeekChartTooltip />}
                      />
                      <Bar dataKey="shippingQty" fill="var(--forvia-cyan)" radius={[5, 5, 0, 0]} name="shippingQty" maxBarSize={72} />
                      <Line
                        type="monotone"
                        dataKey="forecastQty"
                        stroke="var(--forvia-blue)"
                        strokeWidth={2}
                        dot={{ r: 3, strokeWidth: 2, fill: "#fff" }}
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

function WeekChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; value?: number; payload?: { dateRange?: string; hasForecast?: boolean } }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  const shipping = payload.find((item) => item.dataKey === "shippingQty");
  const forecast = payload.find((item) => item.dataKey === "forecastQty");

  return (
    <div className="customer-chart-tooltip">
      <p className="customer-chart-tooltip-title">
        {label}{point?.dateRange ? ` · ${point.dateRange}` : ""}
      </p>
      <div className="customer-chart-tooltip-row">
        <span>最后预测</span>
        <strong>{point?.hasForecast ? formatQuantity(Number(forecast?.value ?? 0)) : "0 (无预测)"}</strong>
      </div>
      <div className="customer-chart-tooltip-row">
        <span>实际发运</span>
        <strong>{formatQuantity(Number(shipping?.value ?? 0))}</strong>
      </div>
    </div>
  );
}
