import type { Locale } from "../../_components/shared";
import {
  classificationToKind,
  type DemandKind,
  type RollingForecastCell,
  type RollingForecastCellWithHistory,
  type RollingForecastRowGroup,
  type TimeGranularity,
} from "@/services/orders";

export type ViewMode = "week" | "day";
export type StatusFilter = "all" | "forecast" | "firm" | "mixed" | "manual";

export type DemandColumn = {
  key: string;
  label: string;
  yearMarker?: string;
  granularity: TimeGranularity;
  startDate: string;
  endDate: string;
  zone: "recent" | "mid" | "far";
};

export type ProjectionMode = "same-or-finer" | "exact";

export type BucketValue = {
  quantity: number;
  cells: RollingForecastCell[];
  hasManualRevision: boolean;
};

export type BucketProjection = {
  firm?: BucketValue;
  forecast?: BucketValue;
};

export type CellSelection = {
  row: RollingForecastRowGroup;
  column: DemandColumn;
  kind: DemandKind;
  projection: BucketProjection;
};

export const DEMAND_KIND_LABEL: Record<DemandKind, string> = {
  forecast: "Forecast",
  firm: "Firm",
};

export const orderCopy: Record<Locale, Record<string, string>> = {
  "zh-CN": {
    customer: "Customer",
    customerPN: "Customer P/N",
    internalPN: "Faurecia P/N",
    designation: "Designation",
    updatedAt: "Updated Time",
    type: "Type",
    total: "合计",
  },
  "zh-TW": {
    customer: "Customer",
    customerPN: "Customer P/N",
    internalPN: "Faurecia P/N",
    designation: "Designation",
    updatedAt: "Updated Time",
    type: "Type",
    total: "合計",
  },
  en: {
    customer: "Customer",
    customerPN: "Customer P/N",
    internalPN: "Faurecia P/N",
    designation: "Designation",
    updatedAt: "Updated Time",
    type: "Type",
    total: "Total",
  },
};

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return toDateKey(date);
}

export function addMonths(dateKey: string, months: number): string {
  const date = parseDateKey(dateKey);
  date.setUTCMonth(date.getUTCMonth() + months);
  return toDateKey(date);
}

export function buildColumns(viewMode: ViewMode, timeFrom: string, timeTo: string): DemandColumn[] {
  if (viewMode === "day") return buildDayColumns(timeFrom, 21);
  return buildWeekMonthColumns(timeFrom, timeTo);
}

export function projectRow(
  row: RollingForecastRowGroup,
  columns: DemandColumn[],
  mode: ProjectionMode = "same-or-finer",
): Record<string, BucketProjection> {
  const result: Record<string, BucketProjection> = {};
  for (const column of columns) {
    const projection: BucketProjection = {};
    for (const cell of row.cells) {
      if (!cellOverlapsColumn(cell, column)) continue;
      if (!cellMatchesProjectionMode(cell, column, mode)) continue;
      const kind = classificationToKind(cell.classification);
      const quantity = displayQuantityForCell(cell, column);
      const current = projection[kind] ?? { quantity: 0, cells: [], hasManualRevision: false };
      current.quantity += quantity;
      current.cells.push(cell);
      current.hasManualRevision = current.hasManualRevision || cell.hasManualRevision;
      projection[kind] = current;
    }
    result[column.key] = projection;
  }
  return result;
}

export function rowUpdatedAt(row: RollingForecastRowGroup): string | null {
  const values = row.cells.map((cell) => cell.updatedAt).filter(Boolean) as string[];
  if (values.length === 0) return null;
  return values.sort().at(-1) ?? null;
}

export function rowMatchesStatus(row: RollingForecastRowGroup, columns: DemandColumn[], status: StatusFilter): boolean {
  if (status === "all") return true;
  const projections = projectRow(row, columns);
  return Object.values(projections).some((projection) => {
    const hasForecast = Boolean(projection.forecast?.quantity);
    const hasFirm = Boolean(projection.firm?.quantity);
    if (status === "forecast") return hasForecast && !hasFirm;
    if (status === "firm") return hasFirm && !hasForecast;
    if (status === "mixed") return hasForecast && hasFirm;
    return Boolean(projection.forecast?.hasManualRevision || projection.firm?.hasManualRevision);
  });
}

export function relevantHistoryCells(
  cells: RollingForecastCellWithHistory[],
  column: DemandColumn,
  kind: DemandKind,
): RollingForecastCellWithHistory[] {
  return cells.filter((cell) => classificationToKind(cell.classification) === kind && cellOverlapsColumn(cell, column));
}

export function formatQuantity(value: number | undefined): string {
  if (!value) return "";
  return Math.round(value).toLocaleString();
}

export function formatWeekLabel(weekKey: string): string {
  const match = weekKey.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return weekKey;
  return `W${match[2]}`;
}

export function sourceLabel(cell: Pick<RollingForecastCell, "colKey" | "timeGranularity" | "dateStart" | "dateEnd">): string {
  if (cell.timeGranularity === "day") return cell.dateStart || cell.colKey;
  if (cell.dateStart && cell.dateEnd) return `${cell.colKey} · ${cell.dateStart} - ${cell.dateEnd}`;
  return cell.colKey;
}

export function buildDayColumnsForWeek(weekColumn: DemandColumn): DemandColumn[] {
  const columns: DemandColumn[] = [];
  for (let i = 0; i < 7; i++) {
    const key = addDays(weekColumn.startDate, i);
    columns.push({
      key: `D-${key}`,
      label: formatDayLabel(key),
      granularity: "day",
      startDate: key,
      endDate: key,
      zone: weekColumn.zone,
    });
  }
  return columns;
}

export function buildWeekColumnsForMonth(monthColumn: DemandColumn): DemandColumn[] {
  const columns: DemandColumn[] = [];
  const end = parseDateKey(monthColumn.endDate);
  const cursor = startOfIsoWeek(monthColumn.startDate);

  while (cursor <= end) {
    const startDate = toDateKey(cursor);
    const weekKey = isoWeekKey(cursor);
    columns.push({
      key: `W-${weekKey}`,
      label: formatWeekLabel(weekKey),
      granularity: "week",
      startDate,
      endDate: addDays(startDate, 6),
      zone: monthColumn.zone,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  return columns;
}

function buildDayColumns(timeFrom: string, count: number): DemandColumn[] {
  const columns: DemandColumn[] = [];
  for (let i = 0; i < count; i++) {
    const key = addDays(timeFrom, i);
    columns.push({
      key: `D-${key}`,
      label: formatDayLabel(key),
      granularity: "day",
      startDate: key,
      endDate: key,
      zone: i < 7 ? "recent" : "mid",
    });
  }
  return columns;
}

function buildWeekMonthColumns(timeFrom: string, timeTo: string): DemandColumn[] {
  const columns: DemandColumn[] = [];
  let cursor = startOfIsoWeek(timeFrom);
  const end = parseDateKey(timeTo);

  for (let i = 0; i < 12 && cursor <= end; i++) {
    const startDate = toDateKey(cursor);
    const endDate = addDays(startDate, 6);
    const weekKey = isoWeekKey(cursor);
    columns.push({
      key: `W-${weekKey}`,
      label: formatWeekLabel(weekKey),
      granularity: "week",
      startDate,
      endDate,
      zone: i < 4 ? "recent" : "mid",
    });
    cursor.setUTCDate(cursor.getUTCDate() + 7);
  }

  const monthKeys = new Set<string>();
  while (cursor <= end) {
    const monthKey = toDateKey(cursor).slice(0, 7);
    if (!monthKeys.has(monthKey)) {
      monthKeys.add(monthKey);
      columns.push({
        key: `M-${monthKey}`,
        label: monthKey,
        granularity: "month",
        startDate: `${monthKey}-01`,
        endDate: endOfMonth(monthKey),
        zone: "far",
      });
    }
    cursor.setUTCMonth(cursor.getUTCMonth() + 1, 1);
  }
  return columns;
}

function displayQuantityForCell(cell: RollingForecastCell, column: DemandColumn): number {
  if (column.granularity === "day" && cell.timeGranularity !== "day") {
    const overlapDays = overlappingDays(cell.dateStart, cell.dateEnd, column.startDate, column.endDate);
    const sourceDays = Math.max(1, inclusiveDays(cell.dateStart, cell.dateEnd));
    return Math.round((cell.value / sourceDays) * overlapDays);
  }
  if (column.granularity === "month" && cell.timeGranularity === "month") return cell.value;
  return cell.value;
}

export function cellOverlapsColumn(cell: RollingForecastCell, column: DemandColumn): boolean {
  if (!cell.dateStart || !cell.dateEnd) return cell.colKey === column.key;
  return rangesOverlap(cell.dateStart, cell.dateEnd, column.startDate, column.endDate);
}

function cellMatchesProjectionMode(cell: RollingForecastCell, column: DemandColumn, mode: ProjectionMode): boolean {
  if (mode === "exact") return cell.timeGranularity === column.granularity;
  return granularityRank(cell.timeGranularity) <= granularityRank(column.granularity);
}

function granularityRank(granularity: TimeGranularity): number {
  if (granularity === "day") return 0;
  if (granularity === "week") return 1;
  return 2;
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

function overlappingDays(aStart: string, aEnd: string, bStart: string, bEnd: string): number {
  const start = Math.max(parseDateKey(aStart).getTime(), parseDateKey(bStart).getTime());
  const end = Math.min(parseDateKey(aEnd).getTime(), parseDateKey(bEnd).getTime());
  if (end < start) return 0;
  return Math.floor((end - start) / 86_400_000) + 1;
}

function inclusiveDays(start: string, end: string): number {
  return Math.floor((parseDateKey(end).getTime() - parseDateKey(start).getTime()) / 86_400_000) + 1;
}

function startOfIsoWeek(dateKey: string): Date {
  const date = parseDateKey(dateKey);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - day + 1);
  return date;
}

function isoWeekKey(date: Date): string {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((target.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function endOfMonth(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return toDateKey(new Date(Date.UTC(year, month, 0)));
}

function formatDayLabel(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
}

function parseDateKey(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
