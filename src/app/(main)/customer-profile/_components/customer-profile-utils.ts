import type { CustomerScoreMetricKey, ForecastTrend } from "@/services/customer-profile";
import { formatWeekLabel } from "../../orders/_components/order-utils";

export function shippingHeatLevel(count: number): string {
  if (count <= 0) return "heat-0";
  if (count <= 2) return "heat-1";
  if (count <= 4) return "heat-2";
  if (count <= 7) return "heat-3";
  return "heat-4";
}

export function formatQuantity(value: number): string {
  return value.toLocaleString();
}

export function formatDiff(value: number): string {
  if (value === 0) return "0";
  return value > 0 ? `+${value.toLocaleString()}` : value.toLocaleString();
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "-";
  return `${value.toFixed(1)}%`;
}

export function formatDisplayDate(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  return `${match[1]}/${match[2]}/${match[3]}`;
}

export function formatDisplayDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${d} ${hh}:${mm}`;
}

export function trendLabel(trend: ForecastTrend): string {
  switch (trend) {
    case "stable":
      return "稳定";
    case "converging":
      return "逐步收敛";
    case "diverging":
      return "发散";
    case "volatile":
      return "波动";
    default:
      return "无预测";
  }
}

export function trendBadgeClass(trend: ForecastTrend): string {
  switch (trend) {
    case "stable":
      return "green";
    case "converging":
      return "amber";
    case "diverging":
      return "red";
    case "volatile":
      return "amber";
    default:
      return "slate";
  }
}

export function weekShortLabel(weekKey: string): string {
  return formatWeekLabel(weekKey);
}

export function buildYearWeekKeys(year: number): string[] {
  const weeks: string[] = [];
  const lastIsoWeek = dateToIsoWeek(new Date(Date.UTC(year, 11, 28)));
  const weekCount = Number(lastIsoWeek.split("-W")[1] ?? "52") || 52;
  for (let week = 1; week <= weekCount; week += 1) {
    weeks.push(`${year}-W${String(week).padStart(2, "0")}`);
  }
  return weeks;
}

export function buildRollingWeekKeys(days: number): string[] {
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - days);

  const weekSet = new Set<string>();
  const cursor = new Date(cutoff);
  while (cursor <= today) {
    weekSet.add(dateToIsoWeek(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return Array.from(weekSet).sort();
}

function dateToIsoWeek(d: Date): string {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function currentYear(): number {
  return new Date().getFullYear();
}

export const SCORE_METRIC_LABELS: Record<CustomerScoreMetricKey, string> = {
  coverageScore: "覆盖率",
  accuracyScore: "准确性",
  biasHealthScore: "偏差健康度",
  convergenceScore: "收敛能力",
  timelinessScore: "及时性",
};
