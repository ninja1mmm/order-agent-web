"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { CalendarDays, Download, History, LoaderCircle, Save, Table2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  editRollingForecastCell,
  exportOrders,
  getRollingForecast,
  getRowDetail,
  kindToClassification,
  type DemandKind,
  type RollingForecastCellWithHistory,
  type RollingForecastResponse,
  type RollingForecastRowGroup,
  type TimeGranularity,
} from "@/services/orders";
import { copy, customerLabel, formatDateTime, useCustomerConfig, useLocale } from "../../_components/shared";
import { OrdersFilters } from "./orders-filters";
import {
  DEMAND_KIND_LABEL,
  addDays,
  addMonths,
  buildColumns,
  buildDayColumnsForWeek,
  buildWeekColumnsForMonth,
  formatQuantity,
  formatWeekLabel,
  orderCopy,
  projectRow,
  relevantHistoryCells,
  rowUpdatedAt,
  todayKey,
  type BucketProjection,
  type CellSelection,
  type DemandColumn,
} from "./order-utils";

const PAGE_SIZE = 30;

type ColumnSegment = {
  kind: "column";
  column: DemandColumn;
};

type ExpandedWeekSegment = {
  kind: "expanded-week";
  column: DemandColumn;
  leaves: DemandColumn[];
};

type MonthLeaf =
  | { kind: "week"; column: DemandColumn }
  | { kind: "expanded-week"; column: DemandColumn; leaves: DemandColumn[] };

type ExpandedMonthSegment = {
  kind: "expanded-month";
  column: DemandColumn;
  leaves: MonthLeaf[];
};

type TimeSegment = ColumnSegment | ExpandedWeekSegment | ExpandedMonthSegment;

type TimelineModel = {
  segments: TimeSegment[];
  leafColumns: TimelineLeaf[];
};

type TimelineLeaf = {
  column: DemandColumn;
  renderKey: string;
};

type OrdersCacheEntry = {
  groups: RollingForecastRowGroup[];
  totalGroups: number;
};

export function OrdersPage() {
  const locale = useLocale();
  const t = copy[locale];
  const ot = orderCopy[locale];
  const { customers } = useCustomerConfig();
  const [timeFrom, setTimeFrom] = useState(() => todayKey());
  const [timeTo, setTimeTo] = useState(() => addMonths(todayKey(), 6));
  const [customerFilter, setCustomerFilter] = useState("__all__");
  const [materialFilter, setMaterialFilter] = useState("");
  const [visibleDemandKinds, setVisibleDemandKinds] = useState<DemandKind[]>(["forecast", "firm"]);
  const [groups, setGroups] = useState<RollingForecastRowGroup[]>([]);
  const [totalGroups, setTotalGroups] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selection, setSelection] = useState<CellSelection | null>(null);
  const [exporting, setExporting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [expandedMonthKey, setExpandedMonthKey] = useState<string | null>(null);
  const [expandedWeekKey, setExpandedWeekKey] = useState<string | null>(null);
  const pageCacheRef = useRef(new Map<string, OrdersCacheEntry>());
  const currentDateKey = useMemo(() => todayKey(), []);
  const autoExpandedRangeRef = useRef<string | null>(null);

  const baseColumns = useMemo(() => buildColumns("week", timeFrom, timeTo), [timeFrom, timeTo]);
  const timeline = useMemo(
    () => buildTimeline(baseColumns, expandedMonthKey, expandedWeekKey),
    [baseColumns, expandedMonthKey, expandedWeekKey],
  );
  const queryKey = useMemo(
    () => JSON.stringify({
      customerFilter,
      materialFilter: materialFilter.trim(),
      timeFrom,
      timeTo,
    }),
    [customerFilter, materialFilter, timeFrom, timeTo],
  );

  const fetchPage = useCallback((pageToLoad: number, mode: "replace" | "append") => {
    if (mode === "replace") setLoading(true);
    else setLoadingMore(true);
    getRollingForecast({
      timeFrom,
      timeTo,
      page: pageToLoad,
      size: PAGE_SIZE,
      customerId: customerFilter === "__all__" ? undefined : customerFilter,
      internalPartNumber: materialFilter.trim() || undefined,
    })
      .then((result: RollingForecastResponse) => {
        setTotalGroups(result.totalGroups);
        setGroups((current) => {
          const next = mode === "replace" ? result.groups : mergeRowGroups(current, result.groups);
          pageCacheRef.current.set(queryKey, { groups: next, totalGroups: result.totalGroups });
          return next;
        });
      })
      .catch(() => {
        if (mode === "replace") {
          setGroups([]);
          setTotalGroups(0);
        }
        if (mode === "append") toast.error("加载更多订单失败");
      })
      .finally(() => {
        if (mode === "replace") setLoading(false);
        else setLoadingMore(false);
      });
  }, [customerFilter, materialFilter, queryKey, timeFrom, timeTo]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const cached = pageCacheRef.current.get(queryKey);
      if (cached) {
        setGroups(cached.groups);
        setTotalGroups(cached.totalGroups);
        return;
      }
      fetchPage(1, "replace");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchPage, queryKey, reloadKey]);

  useEffect(() => {
    const rangeKey = `${timeFrom}:${timeTo}`;
    if (autoExpandedRangeRef.current === rangeKey) return;
    autoExpandedRangeRef.current = rangeKey;
    const currentWeekPeriod = findCurrentWeekPeriod(baseColumns, currentDateKey);
    setExpandedMonthKey(currentWeekPeriod?.monthKey ?? null);
    setExpandedWeekKey(currentWeekPeriod?.weekKey ?? null);
  }, [baseColumns, currentDateKey, timeFrom, timeTo]);

  const rows = groups;
  const hasMore = groups.length < totalGroups;

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !hasMore) return;
    const nextPage = Math.floor(groups.length / PAGE_SIZE) + 1;
    fetchPage(nextPage, "append");
  }, [fetchPage, groups.length, hasMore, loading, loadingMore]);

  const toggleMonth = useCallback((column: DemandColumn) => {
    setExpandedMonthKey((current) => {
      const shouldOpen = current !== column.key;
      setExpandedWeekKey(null);
      return shouldOpen ? column.key : null;
    });
  }, []);

  const toggleWeek = useCallback((column: DemandColumn, parentMonthKey?: string) => {
    setExpandedWeekKey((current) => {
      const shouldOpen = current !== column.key;
      if (parentMonthKey) {
        setExpandedMonthKey(parentMonthKey);
      } else {
        setExpandedMonthKey(null);
      }
      return shouldOpen ? column.key : null;
    });
  }, []);

  const toggleDemandKind = useCallback((kind: DemandKind) => {
    setVisibleDemandKinds((current) => {
      if (current.includes(kind)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== kind);
      }
      return kind === "forecast" ? ["forecast", ...current] : [...current, "firm"];
    });
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const kindLabels: Record<DemandKind, string> = { forecast: "forecast", firm: "firm" };
      for (const kind of visibleDemandKinds) {
        const blob = await exportOrders({
          timeFrom,
          timeTo,
          customerId: customerFilter === "__all__" ? undefined : customerFilter,
          internalPartNumber: materialFilter.trim() || undefined,
          kind,
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `orders-${kindLabels[kind]}-${timeFrom}-to-${timeTo}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }
    } catch {
      toast.error("导出失败，请稍后重试");
    } finally {
      setExporting(false);
    }
  }, [customerFilter, materialFilter, timeFrom, timeTo, visibleDemandKinds]);

  const customerOptions = useMemo(() => {
    return [
      { value: "__all__", label: "全部客户" },
      ...customers.map((customer) => ({ value: customer.id, label: customerLabel(customer) })),
    ];
  }, [customers]);

  return (
    <>
      <div className="subnav">
        <Link href="/task-workbench">{t.inbox}</Link>
        <Link className="active" href="/orders">
          {t.order}
        </Link>
      </div>
      <section className="panel scroll-panel screen-fill">
        <div className="panel-head">
          <h2 className="panel-title">
            <Table2 className="h-4 w-4" />
            Sales Forecast Plus 2.0
          </h2>
          <div className="list-actions">
            <Button variant="default" size="sm" disabled>
              当前窗口：{timeFrom} - {timeTo}
            </Button>
            <Button variant="primary" size="sm" disabled={exporting} onClick={handleExport}>
              {exporting ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} {t.export}
            </Button>
          </div>
        </div>
        <div className="panel-body orders-body">
          <OrdersFilters
            customerLabel={t.filterCustomer}
            materialLabel={t.filterMaterial}
            customerFilter={customerFilter}
            materialFilter={materialFilter}
            timeFrom={timeFrom}
            timeTo={timeTo}
            visibleDemandKinds={visibleDemandKinds}
            customerOptions={customerOptions}
            onCustomerFilterChange={(value) => {
              setCustomerFilter(value);
            }}
            onMaterialFilterChange={(value) => {
              setMaterialFilter(value);
            }}
            onDemandKindToggle={toggleDemandKind}
            onTimeFromChange={(value) => {
              setTimeFrom(value);
              setExpandedMonthKey(null);
              setExpandedWeekKey(null);
            }}
            onTimeToChange={(value) => {
              setTimeTo(value);
              setExpandedMonthKey(null);
              setExpandedWeekKey(null);
            }}
          />

          <div className="orders-table-fill">
            <RollingForecastTable
              locale={locale}
              rows={rows}
              labels={ot}
              timeline={timeline}
              totalColumns={baseColumns}
              currentDateKey={currentDateKey}
              visibleDemandKinds={visibleDemandKinds}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onMonthToggle={toggleMonth}
              onReachEnd={loadMore}
              onWeekToggle={toggleWeek}
              onCellSelect={setSelection}
            />
            {loading ? (
              <div className="orders-loading">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                同步订单数据...
              </div>
            ) : null}
            {!loading && rows.length === 0 ? (
              <div className="orders-state">
                <strong>暂无滚动预测数据</strong>
              </div>
            ) : null}
          </div>
        </div>
      </section>
      <DemandDetailSheet
        locale={locale}
        selection={selection}
        timeFrom={timeFrom}
        timeTo={timeTo}
        onClose={() => setSelection(null)}
        onSaved={() => {
          pageCacheRef.current.delete(queryKey);
          setReloadKey((value) => value + 1);
          setSelection(null);
        }}
      />
    </>
  );
}

function RollingForecastTable({
  locale,
  rows,
  labels,
  timeline,
  totalColumns,
  currentDateKey,
  visibleDemandKinds,
  hasMore,
  loadingMore,
  onMonthToggle,
  onReachEnd,
  onWeekToggle,
  onCellSelect,
}: {
  locale: ReturnType<typeof useLocale>;
  rows: RollingForecastRowGroup[];
  labels: Record<string, string>;
  timeline: TimelineModel;
  totalColumns: DemandColumn[];
  currentDateKey: string;
  visibleDemandKinds: DemandKind[];
  hasMore: boolean;
  loadingMore: boolean;
  onMonthToggle: (column: DemandColumn) => void;
  onReachEnd: () => void;
  onWeekToggle: (column: DemandColumn, parentMonthKey?: string) => void;
  onCellSelect: (selection: CellSelection) => void;
}) {
  const minWidth = Math.max(1280, 576 + timeline.leafColumns.reduce((width, leaf) => width + timelineColumnWidth(leaf.column), 0) + 124);
  const handleScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    if (target.scrollHeight - target.scrollTop - target.clientHeight < 180) {
      onReachEnd();
    }
  }, [onReachEnd]);

  return (
    <div className="scroll-x orders-table-scroll order2-scroll" onScroll={handleScroll}>
      <div className="order2-shell" style={{ minWidth }}>
        <table className="order2-table" style={{ minWidth }}>
          <colgroup>
            <col style={{ width: 116 }} />
            <col style={{ width: 126 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 112 }} />
            <col style={{ width: 92 }} />
            {timeline.leafColumns.map((leaf) => (
              <col key={leaf.renderKey} style={{ width: timelineColumnWidth(leaf.column) }} />
            ))}
            <col style={{ width: 124 }} />
          </colgroup>
          <thead>
            <tr>
              <th className="sticky-col customer-col" rowSpan={2}>{labels.customer}</th>
              <th className="sticky-col customer-pn-col" rowSpan={2}>{labels.customerPN}</th>
              <th className="sticky-col faurecia-pn-col" rowSpan={2}>{labels.internalPN}</th>
              <th className="sticky-col updated-col" rowSpan={2}>{labels.updatedAt}</th>
              <th className="sticky-col type-col" rowSpan={2}>{labels.type}</th>
              {timeline.segments.map((segment) => renderTopHeader(segment, onMonthToggle, onWeekToggle, currentDateKey))}
              <th className="month-col far-zone" rowSpan={2}>{labels.total}</th>
            </tr>
            <tr>
              {timeline.segments.flatMap((segment) => renderSecondHeader(segment, onWeekToggle, currentDateKey))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const totalProjections = projectRow(row, totalColumns);
              return (
                <MaterialDemandRows
                  key={row.rowKey}
                  locale={locale}
                  segments={timeline.segments}
                  totalColumns={totalColumns}
                  totalProjections={totalProjections}
                  visibleDemandKinds={visibleDemandKinds}
                  row={row}
                  onCellSelect={onCellSelect}
                />
              );
            })}
          </tbody>
        </table>
        {loadingMore ? (
          <div className="orders-scroll-status">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            加载更多订单...
          </div>
        ) : null}
        {!loadingMore && !hasMore && rows.length > 0 ? (
          <div className="orders-scroll-status muted">已加载全部</div>
        ) : null}
      </div>
    </div>
  );
}

function timelineColumnWidth(column: DemandColumn): number {
  if (column.granularity === "day") return 96;
  if (column.granularity === "week") return 112;
  return 124;
}

function buildTimeline(
  baseColumns: DemandColumn[],
  expandedMonthKey: string | null,
  expandedWeekKey: string | null,
): TimelineModel {
  const segments: TimeSegment[] = [];
  const leafColumns: TimelineLeaf[] = [];
  const expandedMonthColumn = expandedMonthKey ? baseColumns.find((column) => column.key === expandedMonthKey) : undefined;

  for (const column of baseColumns) {
    if (expandedMonthColumn && column.granularity === "week" && column.startDate <= expandedMonthColumn.endDate && expandedMonthColumn.startDate <= column.endDate) {
      continue;
    }

    if (column.granularity === "week" && expandedWeekKey === column.key && !expandedMonthKey) {
      const leaves = buildDayColumnsForWeek(column);
      segments.push({ kind: "expanded-week", column, leaves });
      leafColumns.push(...leaves.map((leaf) => ({ column: leaf, renderKey: `${column.key}:${leaf.key}` })));
      continue;
    }

    if (column.granularity === "month" && expandedMonthKey === column.key) {
      const monthLeaves: MonthLeaf[] = buildWeekColumnsForMonth(column).map((weekColumn) => {
        if (expandedWeekKey === weekColumn.key) {
          const dayLeaves = buildDayColumnsForWeek(weekColumn);
          leafColumns.push(...dayLeaves.map((leaf) => ({ column: leaf, renderKey: `${column.key}:${weekColumn.key}:${leaf.key}` })));
          return { kind: "expanded-week", column: weekColumn, leaves: dayLeaves };
        }
        leafColumns.push({ column: weekColumn, renderKey: `${column.key}:${weekColumn.key}` });
        return { kind: "week", column: weekColumn };
      });
      segments.push({ kind: "expanded-month", column, leaves: monthLeaves });
      continue;
    }

    segments.push({ kind: "column", column });
    leafColumns.push({ column, renderKey: `base:${column.key}` });
  }

  return { segments, leafColumns };
}

function findCurrentWeekPeriod(baseColumns: DemandColumn[], currentDateKey: string): { monthKey: string | null; weekKey: string } | null {
  for (const column of baseColumns) {
    if (!columnContainsDate(column, currentDateKey)) continue;
    if (column.granularity === "week") return { monthKey: null, weekKey: column.key };
    if (column.granularity === "month") {
      const weekColumn = buildWeekColumnsForMonth(column).find((week) => columnContainsDate(week, currentDateKey));
      return weekColumn ? { monthKey: column.key, weekKey: weekColumn.key } : null;
    }
  }
  return null;
}

function columnContainsDate(column: DemandColumn, dateKey: string): boolean {
  return column.startDate <= dateKey && dateKey <= column.endDate;
}

function mergeRowGroups(
  current: RollingForecastRowGroup[],
  incoming: RollingForecastRowGroup[],
): RollingForecastRowGroup[] {
  const byKey = new Map(current.map((row) => [row.rowKey, row]));
  for (const row of incoming) {
    byKey.set(row.rowKey, row);
  }
  return Array.from(byKey.values());
}

function renderTopHeader(
  segment: TimeSegment,
  onMonthToggle: (column: DemandColumn) => void,
  onWeekToggle: (column: DemandColumn, parentMonthKey?: string) => void,
  currentDateKey: string,
) {
  if (segment.kind === "expanded-week") {
    return (
      <th key={segment.column.key} className={`time-head week-col ${segment.column.zone}-zone ${columnContainsDate(segment.column, currentDateKey) ? "current-week-head" : ""}`} colSpan={segment.leaves.length}>
        <PeriodToggle expanded onClick={() => onWeekToggle(segment.column)} label={`收起 ${segment.column.label}`} />
        <PeriodLabel column={segment.column} />
      </th>
    );
  }

  if (segment.kind === "expanded-month") {
    return (
      <th key={segment.column.key} className={`time-head month-col ${segment.column.zone}-zone ${columnContainsDate(segment.column, currentDateKey) ? "current-month-head" : ""}`} colSpan={countMonthLeaves(segment)}>
        <PeriodToggle expanded onClick={() => onMonthToggle(segment.column)} label={`收起 ${segment.column.label}`} />
        <PeriodLabel column={segment.column} />
      </th>
    );
  }

  const { column } = segment;
  const expandable = column.granularity === "week" || column.granularity === "month";
  return (
    <th key={column.key} className={`time-head ${column.granularity}-col ${column.zone}-zone ${columnContainsDate(column, currentDateKey) ? "current-period-head" : ""}`} rowSpan={2}>
      {expandable ? (
        <PeriodToggle
          expanded={false}
          onClick={() => {
            if (column.granularity === "month") onMonthToggle(column);
            else onWeekToggle(column);
          }}
          label={`展开 ${column.label}`}
        />
      ) : null}
      <PeriodLabel column={column} />
    </th>
  );
}

function renderSecondHeader(
  segment: TimeSegment,
  onWeekToggle: (column: DemandColumn, parentMonthKey?: string) => void,
  currentDateKey: string,
) {
  if (segment.kind === "column") return [];
  if (segment.kind === "expanded-week") {
    return segment.leaves.map((column) => (
      <th key={`${segment.column.key}-${column.key}`} className={`day-col ${column.zone}-zone ${columnContainsDate(column, currentDateKey) ? "current-day-head" : ""}`}>
        <span className="period-day-label">{column.label}</span>
        {columnContainsDate(column, currentDateKey) ? <span className="period-current-marker">今天</span> : null}
      </th>
    ));
  }

  return segment.leaves.flatMap((leaf) => {
    if (leaf.kind === "week") {
      return (
        <th key={`${segment.column.key}-${leaf.column.key}`} className={`time-head week-col ${leaf.column.zone}-zone ${columnContainsDate(leaf.column, currentDateKey) ? "current-week-head" : ""}`}>
          <PeriodToggle expanded={false} onClick={() => onWeekToggle(leaf.column, segment.column.key)} label={`展开 ${leaf.column.label}`} />
          <PeriodLabel column={leaf.column} showCurrentMarker={columnContainsDate(leaf.column, currentDateKey)} />
        </th>
      );
    }

    return leaf.leaves.map((column, index) => (
      <th key={`${segment.column.key}-${leaf.column.key}-${column.key}`} className={`time-head day-col ${column.zone}-zone ${columnContainsDate(column, currentDateKey) ? "current-day-head" : ""}`}>
        {index === 0 ? (
          <PeriodToggle expanded onClick={() => onWeekToggle(leaf.column, segment.column.key)} label={`收起 ${leaf.column.label}`} />
        ) : null}
        <span className="period-day-label">{column.label}</span>
        {columnContainsDate(column, currentDateKey) ? <span className="period-current-marker">今天</span> : null}
      </th>
    ));
  });
}

function PeriodLabel({ column, showCurrentMarker = false }: { column: DemandColumn; showCurrentMarker?: boolean }) {
  return (
    <span className="period-label">
      {column.yearMarker ? <span className="period-year-corner">{column.yearMarker}</span> : null}
      <span className="period-main-label">{column.label}</span>
      {column.rangeLabel ? <span className="period-range-label">{column.rangeLabel}</span> : null}
      {showCurrentMarker ? <span className="period-current-marker">今天</span> : null}
    </span>
  );
}

function PeriodToggle({
  expanded,
  label,
  onClick,
}: {
  expanded: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="period-toggle"
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      {expanded ? "-" : "+"}
    </button>
  );
}

function countMonthLeaves(segment: ExpandedMonthSegment): number {
  return segment.leaves.reduce((count, leaf) => count + (leaf.kind === "expanded-week" ? leaf.leaves.length : 1), 0);
}

function MaterialDemandRows({
  locale,
  segments,
  totalColumns,
  totalProjections,
  visibleDemandKinds,
  row,
  onCellSelect,
}: {
  locale: ReturnType<typeof useLocale>;
  segments: TimeSegment[];
  totalColumns: DemandColumn[];
  totalProjections: Record<string, BucketProjection>;
  visibleDemandKinds: DemandKind[];
  row: RollingForecastRowGroup;
  onCellSelect: (selection: CellSelection) => void;
}) {
  const visibleKinds: DemandKind[] = visibleDemandKinds.length > 0 ? visibleDemandKinds : ["forecast"];

  return (
    <>
      {visibleKinds.map((kind, index) => (
        <DemandLaneRow
          key={`${row.rowKey}-${kind}`}
          kind={kind}
          locale={locale}
          segments={segments}
          totalColumns={totalColumns}
          totalProjections={totalProjections}
          row={row}
          showIdentity={index === 0}
          identityRowSpan={visibleKinds.length}
          onCellSelect={onCellSelect}
        />
      ))}
    </>
  );
}

function DemandLaneRow({
  kind,
  locale,
  segments,
  totalColumns,
  totalProjections,
  row,
  showIdentity = false,
  identityRowSpan,
  onCellSelect,
}: {
  kind: DemandKind;
  locale: ReturnType<typeof useLocale>;
  segments: TimeSegment[];
  totalColumns: DemandColumn[];
  totalProjections: Record<string, BucketProjection>;
  row: RollingForecastRowGroup;
  showIdentity?: boolean;
  identityRowSpan: number;
  onCellSelect: (selection: CellSelection) => void;
}) {
  const total = totalColumns.reduce((sum, column) => sum + (totalProjections[column.key]?.[kind]?.quantity ?? 0), 0);

  return (
    <tr className={`order2-demand-row ${kind}-lane`}>
      {showIdentity ? (
        <>
          <td className="sticky-col customer-col" rowSpan={identityRowSpan}>
            <span className="order-main-text">{row.customerName || row.customerCode || row.customerId}</span>
            <span className="order-sub-text">{[row.customerCode, row.designation].filter(Boolean).join(" · ")}</span>
          </td>
          <td className="sticky-col customer-pn-col" rowSpan={identityRowSpan}>{row.customerPartNumber || "-"}</td>
          <td className="sticky-col faurecia-pn-col" rowSpan={identityRowSpan}>{row.internalPartNumber}</td>
          <td className="sticky-col updated-col" rowSpan={identityRowSpan}>
            {rowUpdatedAt(row) ? formatDateTime(rowUpdatedAt(row), locale) : "-"}
          </td>
        </>
      ) : null}
      <td className="sticky-col type-col">
        <span className={`lane-badge ${kind}`}>{DEMAND_KIND_LABEL[kind]}</span>
      </td>
      {segments.flatMap((segment) => renderSegmentCells({ kind, onCellSelect, row, segment }))}
      <td className="demand-cell far-zone order2-total-cell">{formatQuantity(total)}</td>
    </tr>
  );
}

function renderSegmentCells({
  kind,
  onCellSelect,
  row,
  segment,
}: {
  kind: DemandKind;
  onCellSelect: (selection: CellSelection) => void;
  row: RollingForecastRowGroup;
  segment: TimeSegment;
}) {
  if (segment.kind === "column") {
    return [renderLeafCell({ column: segment.column, kind, onCellSelect, renderKey: `base:${segment.column.key}`, row })];
  }

  if (segment.kind === "expanded-week") {
    return renderExpandedWeekCells({
      kind,
      leaves: segment.leaves,
      onCellSelect,
      renderKeyPrefix: `base:${segment.column.key}`,
      row,
      weekColumn: segment.column,
    });
  }

  const flatLeaves = segment.leaves.flatMap((leaf) => (leaf.kind === "expanded-week" ? leaf.leaves : [leaf.column]));
  const monthCells = renderAggregateIfNoDetails({
    aggregateColumn: segment.column,
    aggregateLabel: (quantity) => `${segment.column.label} 原始${kind === "forecast" ? "月预测" : "月 Firm"}: ${formatQuantity(quantity)}`,
    colSpan: flatLeaves.length,
    detailColumns: flatLeaves,
    kind,
    onCellSelect,
    renderKey: segment.column.key,
    row,
  });
  if (monthCells) return monthCells;

  return segment.leaves.flatMap((leaf) => {
    if (leaf.kind === "week") {
      return [renderLeafCell({ column: leaf.column, kind, onCellSelect, renderKey: `${segment.column.key}:${leaf.column.key}`, row })];
    }
    return renderExpandedWeekCells({
      kind,
      leaves: leaf.leaves,
      onCellSelect,
      parentMonthKey: segment.column.key,
      renderKeyPrefix: `${segment.column.key}:${leaf.column.key}`,
      row,
      weekColumn: leaf.column,
    });
  });
}

function renderExpandedWeekCells({
  kind,
  leaves,
  onCellSelect,
  renderKeyPrefix,
  row,
  weekColumn,
}: {
  kind: DemandKind;
  leaves: DemandColumn[];
  onCellSelect: (selection: CellSelection) => void;
  parentMonthKey?: string;
  renderKeyPrefix: string;
  row: RollingForecastRowGroup;
  weekColumn: DemandColumn;
}) {
  const aggregateCells = renderAggregateIfNoDetails({
    aggregateColumn: weekColumn,
    aggregateLabel: (quantity) => `${formatWeekLabel((weekColumn.sourceKey ?? weekColumn.key).replace(/^W-/, ""))} ${kind === "forecast" ? "预测" : "Firm"}: ${formatQuantity(quantity)}`,
    colSpan: leaves.length,
    detailColumns: leaves,
    kind,
    onCellSelect,
    renderKey: renderKeyPrefix,
    row,
  });
  if (aggregateCells) return aggregateCells;
  return leaves.map((column) => renderLeafCell({ column, kind, onCellSelect, renderKey: `${renderKeyPrefix}:${column.key}`, row }));
}

function renderAggregateIfNoDetails({
  aggregateColumn,
  aggregateLabel,
  colSpan,
  detailColumns,
  kind,
  onCellSelect,
  renderKey,
  row,
}: {
  aggregateColumn: DemandColumn;
  aggregateLabel: (quantity: number) => string;
  colSpan: number;
  detailColumns: DemandColumn[];
  kind: DemandKind;
  onCellSelect: (selection: CellSelection) => void;
  renderKey: string;
  row: RollingForecastRowGroup;
}) {
  const aggregateProjection = projectRow(row, [aggregateColumn], "exact")[aggregateColumn.key] ?? {};
  const aggregate = aggregateProjection[kind];
  if (!aggregate?.quantity) return null;

  const detailProjections = projectRow(row, detailColumns);
  const hasDetail = detailColumns.some((column) => Boolean(detailProjections[column.key]?.[kind]?.quantity));
  if (hasDetail) return null;

  return [
    <DemandValueCell
      key={`${row.rowKey}-${kind}-${renderKey}-aggregate`}
      column={aggregateColumn}
      colSpan={colSpan}
      kind={kind}
      aggregate
      label={aggregateLabel(aggregate.quantity)}
      onCellSelect={onCellSelect}
      projection={aggregateProjection}
      row={row}
    />,
  ];
}

function renderLeafCell({
  column,
  kind,
  onCellSelect,
  renderKey,
  row,
}: {
  column: DemandColumn;
  kind: DemandKind;
  onCellSelect: (selection: CellSelection) => void;
  renderKey: string;
  row: RollingForecastRowGroup;
}) {
  const projection = projectRow(row, [column])[column.key] ?? {};
  return (
    <DemandValueCell
      key={`${row.rowKey}-${kind}-${renderKey}`}
      column={column}
      kind={kind}
      onCellSelect={onCellSelect}
      projection={projection}
      row={row}
    />
  );
}

function DemandValueCell({
  column,
  colSpan,
  aggregate = false,
  kind,
  label,
  onCellSelect,
  projection,
  row,
}: {
  column: DemandColumn;
  colSpan?: number;
  aggregate?: boolean;
  kind: DemandKind;
  label?: string;
  onCellSelect: (selection: CellSelection) => void;
  projection: BucketProjection;
  row: RollingForecastRowGroup;
}) {
  const current = projection[kind];
  const other = projection[kind === "firm" ? "forecast" : "firm"];
  const isMixed = Boolean(current?.quantity && other?.quantity);
  const isOriginalMonthForecast = kind === "forecast" && current?.cells.some((cell) => cell.timeGranularity === "month");

  return (
    <td
      className={`order2-demand-cell-wrap ${column.zone}-zone ${current?.quantity ? "pill-cell" : "demand-cell empty"}`}
      colSpan={colSpan}
    >
      {current?.quantity ? (
        <button
          type="button"
          className={`order2-cell-button demand-cell ${kind === "firm" ? "firm-cell-2" : "forecast-cell"} ${isOriginalMonthForecast ? "month-cell" : ""} ${aggregate ? "aggregate-pill-cell" : ""} ${isMixed ? "mixed" : ""} ${current.hasManualRevision ? "dirty" : ""}`}
          onClick={() => onCellSelect({ row, column, kind, projection })}
        >
          <span>{label ?? formatQuantity(current.quantity)}</span>
          {!label && current.cells.length > 1 ? <small>{current.cells.length} sources</small> : null}
        </button>
      ) : (
        ""
      )}
    </td>
  );
}

function DemandDetailSheet({
  locale,
  selection,
  timeFrom,
  timeTo,
  onClose,
  onSaved,
}: {
  locale: ReturnType<typeof useLocale>;
  selection: CellSelection | null;
  timeFrom: string;
  timeTo: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [detail, setDetail] = useState<RollingForecastCellWithHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetColKey, setTargetColKey] = useState("");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [splitMode, setSplitMode] = useState(false);
  const [splitValues, setSplitValues] = useState<Array<{ dateKey: string; value: string }>>([]);

  useEffect(() => {
    if (!selection) return;
    const currentSelection = selection;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      setDetail([]);
      setTargetColKey("");
      setValue("");
      setReason("");
      setSplitMode(false);
      setSplitValues([]);
      getRowDetail({ rowKey: currentSelection.row.rowKey, timeFrom, timeTo })
        .then((result) => {
          setDetail(result.cells);
          const first = relevantHistoryCells(result.cells, currentSelection.column, currentSelection.kind)[0];
          setTargetColKey(first?.colKey ?? "");
          setValue(first ? String(first.value) : "");
        })
        .catch(() => setError("来源记录加载失败"))
        .finally(() => setLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selection, timeFrom, timeTo]);

  const cells = useMemo(() => {
    if (!selection) return [];
    return relevantHistoryCells(detail, selection.column, selection.kind);
  }, [detail, selection]);

  const selectedCell = cells.find((cell) => cell.colKey === targetColKey) ?? cells[0];
  const displayed = selection ? selection.projection[selection.kind]?.quantity ?? 0 : 0;
  const splitTotal = useMemo(
    () => splitValues.reduce((sum, item) => {
      const parsed = Number(item.value);
      return Number.isFinite(parsed) ? sum + parsed : sum;
    }, 0),
    [splitValues],
  );
  const splitValuesValid = splitValues.length > 0 && splitValues.every((item) => {
    if (!item.value.trim()) return false;
    const parsed = Number(item.value);
    return Number.isFinite(parsed) && parsed >= 0;
  });
  const canSaveNormal = Boolean(selection && value.trim() && reason.trim() && !saving);
  const canSaveSplit = Boolean(
    selection &&
    selectedCell?.timeGranularity === "week" &&
    reason.trim() &&
    splitValuesValid &&
    !saving,
  );
  const canSave = splitMode ? canSaveSplit : canSaveNormal;
  const canSplitWeek = Boolean(
    selection &&
    selectedCell?.timeGranularity === "week" &&
    selectedCell.dateStart &&
    selectedCell.dateEnd &&
    selectedCell.value > 0 &&
    !saving,
  );

  const saveNormal = async () => {
    if (!selection || !canSaveNormal) return;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    setSaving(true);
    try {
      await editRollingForecastCell({
        rowKey: selection.row.rowKey,
        colKey: selectedCell?.colKey ?? selection.column.key,
        value: Math.round(parsed),
        classification: kindToClassification(selection.kind),
        timeGranularity: selectedCell?.timeGranularity ?? selection.column.granularity,
        reason,
      });
      onSaved();
    } catch {
      toast.error("保存失败，请检查后端服务后重试");
    } finally {
      setSaving(false);
    }
  };

  const saveSplitWeekToDays = async () => {
    if (!selection || !selectedCell || selectedCell.timeGranularity !== "week" || !canSaveSplit) return;
    const parsedValues = splitValues.map((item) => ({
      dateKey: item.dateKey,
      value: Math.round(Number(item.value)),
    }));
    setSaving(true);
    try {
      for (const item of parsedValues) {
        await editRollingForecastCell({
          rowKey: selection.row.rowKey,
          colKey: `D-${item.dateKey}`,
          value: item.value,
          classification: kindToClassification(selection.kind),
          timeGranularity: "day",
          reason: `拆解 ${selectedCell.colKey} 到天：${reason}`,
        });
      }
      await editRollingForecastCell({
        rowKey: selection.row.rowKey,
        colKey: selectedCell.colKey,
        value: 0,
        classification: kindToClassification(selection.kind),
        timeGranularity: "week",
        reason: `已拆解到天，原周 cell 归零：${reason}`,
      });
      onSaved();
    } catch {
      toast.error("拆解保存失败，请检查后端服务后重试");
    } finally {
      setSaving(false);
    }
  };

  const save = () => {
    if (splitMode) {
      void saveSplitWeekToDays();
      return;
    }
    void saveNormal();
  };

  const openSplitWeekEditor = () => {
    if (!selectedCell || selectedCell.timeGranularity !== "week" || !canSplitWeek) return;
    const dayKeys = buildDateKeys(selectedCell.dateStart, selectedCell.dateEnd);
    const dayValues = distributeInteger(selectedCell.value, dayKeys.length);
    setSplitValues(dayKeys.map((dateKey, index) => ({
      dateKey,
      value: String(dayValues[index] ?? 0),
    })));
    setSplitMode(true);
  };

  return (
    <Sheet open={selection !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent onClose={onClose}>
        <SheetHeader>
          <SheetTitle>来源与拆分编辑</SheetTitle>
          <SheetDescription>
            {selection ? `${selection.row.customerName || selection.row.customerCode} · ${selection.row.internalPartNumber} · ${demandKindText(selection.kind)}` : ""}
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="orders-sheet-body">
          {selection ? (
            <>
              <section className="orders-sheet-section">
                <h3>基础信息</h3>
                <div className="orders-sheet-grid">
                  <Field label="客户" value={selection.row.customerName || selection.row.customerCode || "-"} />
                  <Field label="客户料号" value={selection.row.customerPartNumber || "-"} />
                  <Field label="Faurecia料号" value={selection.row.internalPartNumber} />
                  <Field label="产品说明" value={selection.row.designation || "-"} />
                  <Field label="周期" value={`${selection.column.label} · ${selection.column.startDate} - ${selection.column.endDate}`} />
                  <Field label="当前显示" value={formatQuantity(displayed) || "0"} />
                </div>
              </section>

              <section className="orders-sheet-section">
                <h3>来源记录</h3>
                {loading ? <p className="item-meta">加载来源...</p> : null}
                {error ? <p className="orders-error-text">{error}</p> : null}
                {!loading && cells.length === 0 ? (
                  <p className="item-meta">未找到可编辑的底层 cell。</p>
                ) : null}
                {cells.length > 0 ? (
                  <div className="orders-source-list">
                    {cells.map((cell) => (
                      <button
                        type="button"
                        key={cell.id}
                        className={`orders-source-row ${cell.colKey === selectedCell?.colKey ? "selected" : ""}`}
                        onClick={() => {
                          setTargetColKey(cell.colKey);
                          setValue(String(cell.value));
                          setSplitMode(false);
                          setSplitValues([]);
                        }}
                      >
                        <span>
                          <strong>{cell.colKey}</strong>
                          <small>{granularityText(cell.timeGranularity)}</small>
                        </span>
                        {cell.hasManualRevision ? <em>人工修改</em> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </section>

              <section className="orders-sheet-section">
                <h3>修改数量</h3>
                <label className="orders-edit-field">
                  <span>{demandKindText(selection.kind)}</span>
                  <input
                    type="number"
                    value={value}
                    disabled={splitMode}
                    onChange={(event) => setValue(event.target.value)}
                    placeholder="0"
                  />
                </label>
              </section>

              {selectedCell?.timeGranularity === "week" ? (
                <section className="orders-sheet-section">
                  <h3><CalendarDays className="h-3.5 w-3.5" /> 拆解到天</h3>
                  <div className="orders-split-panel">
                    <div>
                      <strong>{selectedCell.colKey}</strong>
                    </div>
                    <Button variant="default" size="sm" disabled={!canSplitWeek} onClick={openSplitWeekEditor}>
                      {saving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <CalendarDays className="h-3.5 w-3.5" />}
                      拆解到天
                    </Button>
                  </div>
                  {splitMode ? (
                    <div className="orders-split-editor">
                      <div className="orders-split-grid">
                        {splitValues.map((item, index) => (
                          <label className="orders-split-field" key={item.dateKey}>
                            <span>{item.dateKey.slice(5)}</span>
                            <input
                              type="number"
                              min="0"
                              value={item.value}
                              onChange={(event) => {
                                const nextValues = [...splitValues];
                                nextValues[index] = { ...item, value: event.target.value };
                                setSplitValues(nextValues);
                              }}
                            />
                          </label>
                        ))}
                      </div>
                      <p className="orders-split-total">
                        拆解合计 <strong>{formatQuantity(splitTotal) || "0"}</strong>
                      </p>
                    </div>
                  ) : null}
                </section>
              ) : null}

              <section className="orders-sheet-section">
                <h3>修改原因</h3>
                <label className="orders-edit-field">
                  <span>原因</span>
                  <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="填写本次人工修改原因" />
                </label>
              </section>

              <section className="orders-sheet-section">
                <h3><History className="h-3.5 w-3.5" /> 修订记录</h3>
                {selectedCell?.revisions.length ? (
                  <div className="orders-timeline">
                    {selectedCell.revisions.map((revision) => (
                      <div className="orders-timeline-item" key={`${revision.revision}-${revision.createdAt}`}>
                        <strong>版本 {revision.revision} · {formatQuantity(revision.value) || "0"}</strong>
                        <span>{formatDateTime(revision.createdAt, locale)} · {revisionTypeText(revision.changeType)}</span>
                        <small>
                          {revision.sourceFile || revision.mailSubject || revision.actorName || revision.note || "无来源信息"}
                        </small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="item-meta">暂无修订历史。</p>
                )}
              </section>
            </>
          ) : null}
        </SheetBody>
        <SheetFooter>
          <Button variant="default" size="sm" onClick={onClose}>取消</Button>
          <Button variant="primary" size="sm" disabled={!canSave} onClick={save}>
            {saving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            保存
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="orders-summary-field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function demandKindText(kind: DemandKind): string {
  return kind === "forecast" ? "预测" : "确定需求";
}

function granularityText(granularity: TimeGranularity): string {
  if (granularity === "day") return "日来源";
  if (granularity === "week") return "周来源";
  return "月来源";
}

function revisionTypeText(type: string): string {
  if (type === "manual_edit") return "人工修改";
  if (type === "pipeline") return "系统导入";
  return type;
}

function buildDateKeys(startDate: string, endDate: string): string[] {
  const keys: string[] = [];
  for (let key = startDate; key <= endDate; key = addDays(key, 1)) {
    keys.push(key);
  }
  return keys;
}

function distributeInteger(total: number, count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(total / count);
  let remainder = total - base * count;
  return Array.from({ length: count }, () => {
    const extra = remainder > 0 ? 1 : 0;
    remainder -= extra;
    return base + extra;
  });
}
