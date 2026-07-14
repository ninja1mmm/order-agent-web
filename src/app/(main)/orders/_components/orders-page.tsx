"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import { Download, History, LoaderCircle, Save, Table2 } from "lucide-react";

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
  getRollingForecast,
  getRowDetail,
  kindToClassification,
  type DemandKind,
  type RollingForecastCellWithHistory,
  type RollingForecastResponse,
  type RollingForecastRowGroup,
} from "@/services/orders";
import { copy, customerLabel, formatDateTime, useCustomerConfig, useLocale } from "../../_components/shared";
import { OrdersFilters } from "./orders-filters";
import {
  DEMAND_KIND_LABEL,
  addMonths,
  buildColumns,
  buildDayColumnsForWeek,
  buildWeekColumnsForMonth,
  formatQuantity,
  formatWeekLabel,
  orderCopy,
  projectRow,
  relevantHistoryCells,
  rowMatchesStatus,
  rowUpdatedAt,
  sourceLabel,
  todayKey,
  type BucketProjection,
  type CellSelection,
  type DemandColumn,
  type StatusFilter,
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [visibleDemandKinds, setVisibleDemandKinds] = useState<DemandKind[]>(["forecast", "firm"]);
  const [groups, setGroups] = useState<RollingForecastRowGroup[]>([]);
  const [totalGroups, setTotalGroups] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<CellSelection | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [expandedMonthKey, setExpandedMonthKey] = useState<string | null>(null);
  const [expandedWeekKey, setExpandedWeekKey] = useState<string | null>(null);
  const pageCacheRef = useRef(new Map<string, OrdersCacheEntry>());

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
    setError(null);
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
      .catch((err: Error) => {
        if (mode === "replace") {
          setGroups([]);
          setTotalGroups(0);
        }
        setError(err.message);
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
        setError(null);
        return;
      }
      fetchPage(1, "replace");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchPage, queryKey, reloadKey]);

  const rows = useMemo(() => {
    return groups.filter((row) => rowMatchesStatus(row, baseColumns, statusFilter));
  }, [baseColumns, groups, statusFilter]);
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
        <Link href="/parse-review">{t.parse}</Link>
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
            <Button variant="primary" size="sm" disabled>
              <Download className="h-3.5 w-3.5" /> {t.export}
            </Button>
          </div>
        </div>
        <div className="panel-body orders-body">
          <OrdersFilters
            customerLabel={t.filterCustomer}
            materialLabel={t.filterMaterial}
            customerFilter={customerFilter}
            materialFilter={materialFilter}
            statusFilter={statusFilter}
            timeFrom={timeFrom}
            timeTo={timeTo}
            visibleDemandKinds={visibleDemandKinds}
            customerOptions={customerOptions}
            statusOptions={[
              { value: "all", label: "全部" },
              { value: "forecast", label: "只有 Forecast" },
              { value: "firm", label: "只有 Firm" },
              { value: "mixed", label: "Forecast + Firm" },
              { value: "manual", label: "人工修改" },
            ]}
            onCustomerFilterChange={(value) => {
              setCustomerFilter(value);
            }}
            onMaterialFilterChange={(value) => {
              setMaterialFilter(value);
            }}
            onStatusFilterChange={(value) => {
              setStatusFilter(value);
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
            {error ? (
              <div className="orders-state">
                <strong>订单数据加载失败</strong>
                <span>{error}</span>
                <Button variant="default" size="sm" onClick={() => fetchPage(1, "replace")}>重试</Button>
              </div>
            ) : (
              <RollingForecastTable
                locale={locale}
                rows={rows}
                labels={ot}
                timeline={timeline}
                totalColumns={baseColumns}
                visibleDemandKinds={visibleDemandKinds}
                hasMore={hasMore}
                loadingMore={loadingMore}
                onMonthToggle={toggleMonth}
                onReachEnd={loadMore}
                onWeekToggle={toggleWeek}
                onCellSelect={setSelection}
              />
            )}
            {loading ? (
              <div className="orders-loading">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                同步订单数据...
              </div>
            ) : null}
            {!loading && !error && rows.length === 0 ? (
              <div className="orders-state">
                <strong>暂无滚动预测数据</strong>
                <span>环境已清空后，需要重新同步邮件并解析附件，发布后这里会出现 Forecast 和 Firm 数据。</span>
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
              {timeline.segments.map((segment) => renderTopHeader(segment, onMonthToggle, onWeekToggle))}
              <th className="month-col far-zone" rowSpan={2}>{labels.total}</th>
            </tr>
            <tr>
              {timeline.segments.flatMap((segment) => renderSecondHeader(segment, onWeekToggle))}
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
  const standaloneWeekKeys = new Set(
    baseColumns.filter((column) => column.granularity === "week").map((column) => column.key),
  );

  for (const column of baseColumns) {
    if (column.granularity === "week" && expandedWeekKey === column.key && !expandedMonthKey) {
      const leaves = buildDayColumnsForWeek(column);
      segments.push({ kind: "expanded-week", column, leaves });
      leafColumns.push(...leaves.map((leaf) => ({ column: leaf, renderKey: `${column.key}:${leaf.key}` })));
      continue;
    }

    if (column.granularity === "month" && expandedMonthKey === column.key) {
      const monthWeekColumns = buildWeekColumnsForMonth(column).filter((weekColumn) => !standaloneWeekKeys.has(weekColumn.key));
      const monthLeaves: MonthLeaf[] = monthWeekColumns.map((weekColumn) => {
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
) {
  if (segment.kind === "expanded-week") {
    return (
      <th key={segment.column.key} className={`time-head week-col ${segment.column.zone}-zone`} colSpan={segment.leaves.length}>
        <PeriodToggle expanded onClick={() => onWeekToggle(segment.column)} label={`收起 ${segment.column.label}`} />
        <PeriodLabel column={segment.column} />
      </th>
    );
  }

  if (segment.kind === "expanded-month") {
    return (
      <th key={segment.column.key} className={`time-head month-col ${segment.column.zone}-zone`} colSpan={countMonthLeaves(segment)}>
        <PeriodToggle expanded onClick={() => onMonthToggle(segment.column)} label={`收起 ${segment.column.label}`} />
        <PeriodLabel column={segment.column} />
      </th>
    );
  }

  const { column } = segment;
  const expandable = column.granularity === "week" || column.granularity === "month";
  return (
    <th key={column.key} className={`time-head ${column.granularity}-col ${column.zone}-zone`} rowSpan={2}>
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

function renderSecondHeader(segment: TimeSegment, onWeekToggle: (column: DemandColumn, parentMonthKey?: string) => void) {
  if (segment.kind === "column") return [];
  if (segment.kind === "expanded-week") {
    return segment.leaves.map((column) => (
      <th key={`${segment.column.key}-${column.key}`} className={`day-col ${column.zone}-zone`}>
        <span className="period-day-label">{column.label}</span>
      </th>
    ));
  }

  return segment.leaves.flatMap((leaf) => {
    if (leaf.kind === "week") {
      return (
        <th key={`${segment.column.key}-${leaf.column.key}`} className={`time-head week-col ${leaf.column.zone}-zone`}>
          <PeriodToggle expanded={false} onClick={() => onWeekToggle(leaf.column, segment.column.key)} label={`展开 ${leaf.column.label}`} />
          <PeriodLabel column={leaf.column} />
        </th>
      );
    }

    return leaf.leaves.map((column, index) => (
      <th key={`${segment.column.key}-${leaf.column.key}-${column.key}`} className={`time-head day-col ${column.zone}-zone`}>
        {index === 0 ? (
          <PeriodToggle expanded onClick={() => onWeekToggle(leaf.column, segment.column.key)} label={`收起 ${leaf.column.label}`} />
        ) : null}
        <span className="period-day-label">{column.label}</span>
      </th>
    ));
  });
}

function PeriodLabel({ column }: { column: DemandColumn }) {
  return (
    <span className="period-label">
      {column.yearMarker ? <span className="period-year-corner">{column.yearMarker}</span> : null}
      <span className="period-main-label">{column.label}</span>
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
    aggregateLabel: (quantity) => `${formatWeekLabel(weekColumn.key.replace(/^W-/, ""))} ${kind === "forecast" ? "预测" : "Firm"}: ${formatQuantity(quantity)}`,
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
      getRowDetail({ rowKey: currentSelection.row.rowKey, timeFrom, timeTo })
        .then((result) => {
          setDetail(result.cells);
          const first = relevantHistoryCells(result.cells, currentSelection.column, currentSelection.kind)[0];
          setTargetColKey(first?.colKey ?? "");
          setValue(first ? String(first.value) : "");
        })
        .catch((err: Error) => setError(err.message))
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
  const canSave = Boolean(selection && value.trim() && reason.trim() && !saving);

  const save = async () => {
    if (!selection || !canSave) return;
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={selection !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent onClose={onClose}>
        <SheetHeader>
          <SheetTitle>来源与拆分编辑</SheetTitle>
          <SheetDescription>
            {selection ? `${selection.row.customerName || selection.row.customerCode} · ${selection.row.internalPartNumber} · ${DEMAND_KIND_LABEL[selection.kind]}` : ""}
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="orders-sheet-body">
          {selection ? (
            <>
              <section className="orders-sheet-section">
                <h3>Cell Summary</h3>
                <div className="orders-sheet-grid">
                  <Field label="Customer" value={selection.row.customerName || selection.row.customerCode || "-"} />
                  <Field label="Customer P/N" value={selection.row.customerPartNumber || "-"} />
                  <Field label="Faurecia P/N" value={selection.row.internalPartNumber} />
                  <Field label="Designation" value={selection.row.designation || "-"} />
                  <Field label="Bucket" value={`${selection.column.label} · ${selection.column.startDate} - ${selection.column.endDate}`} />
                  <Field label="Displayed" value={formatQuantity(displayed) || "0"} />
                </div>
              </section>

              <section className="orders-sheet-section">
                <h3>Source Details</h3>
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
                        }}
                      >
                        <span>
                          <strong>{sourceLabel(cell)}</strong>
                          <small>{cell.timeGranularity} · 当前值 {formatQuantity(cell.value) || "0"}</small>
                        </span>
                        {cell.hasManualRevision ? <em>人工修改</em> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </section>

              <section className="orders-sheet-section">
                <h3>Edit Controls</h3>
                <label className="orders-edit-field">
                  <span>{DEMAND_KIND_LABEL[selection.kind]} value</span>
                  <input
                    type="number"
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    placeholder="0"
                  />
                </label>
                <label className="orders-edit-field">
                  <span>Reason</span>
                  <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="填写本次人工修改原因" />
                </label>
                <p className="orders-impact-note">
                  保存会写入一个新的 cell revision。Forecast 与 Firm 分开保存；当前只修改选中的底层记录，不会把两类需求合并。
                </p>
              </section>

              <section className="orders-sheet-section">
                <h3><History className="h-3.5 w-3.5" /> Audit Timeline</h3>
                {selectedCell?.revisions.length ? (
                  <div className="orders-timeline">
                    {selectedCell.revisions.map((revision) => (
                      <div className="orders-timeline-item" key={`${revision.revision}-${revision.createdAt}`}>
                        <strong>v{revision.revision} · {formatQuantity(revision.value) || "0"}</strong>
                        <span>{formatDateTime(revision.createdAt, locale)} · {revision.changeType}</span>
                        <small>
                          {revision.sourceFile || revision.mailSubject || revision.actorName || revision.note || "No source metadata"}
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
