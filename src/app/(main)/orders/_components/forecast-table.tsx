"use client";

import type { SalesForecastLine } from "@/services/orders";
import type { CustomerConfig } from "@/services/settings";
import {
  type Locale,
  customerLabelFromId,
  formatDateTime,
} from "../../_components/shared";
import {
  forecastCopy,
  formatNum,
  formatWeekLabel,
  type MaterialRow,
} from "./order-utils";

type ForecastTableProps = {
  locale: Locale;
  customers: CustomerConfig[];
  rows: MaterialRow[];
  weeks: string[];
  forecastLines: SalesForecastLine[];
  highlightedSourceTaskId: string;
  emptyLabel: string;
};

export function ForecastTable({
  locale,
  customers,
  rows,
  weeks,
  forecastLines,
  highlightedSourceTaskId,
  emptyLabel,
}: ForecastTableProps) {
  const ft = forecastCopy[locale];

  return (
    <>
      <div className="scroll-x orders-table-scroll">
        <table className="table forecast-pivot" style={{ minWidth: Math.max(900, 460 + weeks.length * 80) }}>
          <thead>
            <tr>
              <th style={{ position: "sticky", left: 0, zIndex: 3, background: "#f8fafc", minWidth: 110 }}>{ft.customer}</th>
              <th style={{ position: "sticky", left: 110, zIndex: 3, background: "#f8fafc", minWidth: 130 }}>{ft.customerPN}</th>
              <th style={{ position: "sticky", left: 240, zIndex: 3, background: "#f8fafc", minWidth: 140 }}>{ft.internalPN}</th>
              <th style={{ position: "sticky", left: 380, zIndex: 3, background: "#f8fafc", minWidth: 110 }}>{ft.updatedAt}</th>
              {weeks.map((week) => (
                <th key={week} style={{ textAlign: "right", minWidth: 72, whiteSpace: "nowrap" }}>
                  <div style={{ fontWeight: 900 }}>{formatWeekLabel(week)}</div>
                </th>
              ))}
              <th style={{ textAlign: "right", minWidth: 80, fontWeight: 900, background: "var(--forvia-blue-soft)" }}>{ft.total}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <ForecastRow
                key={row.rowKey}
                locale={locale}
                customers={customers}
                row={row}
                weeks={weeks}
                highlightedSourceTaskId={highlightedSourceTaskId}
              />
            ))}
          </tbody>
        </table>
      </div>
      {forecastLines.length === 0 ? <p className="empty-table-hint">{emptyLabel}</p> : null}
    </>
  );
}

function ForecastRow({
  locale,
  customers,
  row,
  weeks,
  highlightedSourceTaskId,
}: {
  locale: Locale;
  customers: CustomerConfig[];
  row: MaterialRow;
  weeks: string[];
  highlightedSourceTaskId: string;
}) {
  const total = weeks.reduce((sum, week) => sum + (row.weekQty[week] ?? 0), 0);
  const isHighlighted = Boolean(highlightedSourceTaskId && row.sourceTaskId === highlightedSourceTaskId);

  return (
    <tr className={isHighlighted ? "order-highlight-row" : ""}>
      <td style={{ position: "sticky", left: 0, zIndex: 1, background: "white", fontWeight: 800 }}>
        {customerLabelFromId(customers, row.customerId, row.customerName)}
      </td>
      <td style={{ position: "sticky", left: 110, zIndex: 1, background: "white", fontWeight: 850 }}>
        {row.customerPartNumber}
      </td>
      <td style={{ position: "sticky", left: 240, zIndex: 1, background: "white", fontSize: 11, color: "var(--muted)" }} title={row.internalPartNumber}>
        {row.internalPartNumber}
      </td>
      <td style={{ position: "sticky", left: 380, zIndex: 1, background: "white", fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap" }}>
        {row.updatedAt ? formatDateTime(row.updatedAt, locale) : ""}
      </td>
      {weeks.map((week) => {
        const quantity = row.weekQty[week];
        return (
          <td
            key={week}
            style={{
              textAlign: "right",
              fontVariantNumeric: "tabular-nums",
              fontWeight: quantity ? 800 : 400,
              color: quantity ? "var(--ink)" : "var(--muted)",
            }}
          >
            {formatNum(quantity)}
          </td>
        );
      })}
      <td style={{ textAlign: "right", fontWeight: 900, background: "var(--forvia-blue-soft)", color: "var(--forvia-blue-ink)" }}>
        {total.toLocaleString()}
      </td>
    </tr>
  );
}
