"use client";

import type { ShippingPlanLine } from "@/services/orders";
import type { CustomerConfig } from "@/services/settings";
import {
  type Locale,
  customerLabelFromId,
  formatDateTime,
} from "../../_components/shared";
import { forecastCopy, ORDER_HIGHLIGHT_BG } from "./order-utils";

type ShippingTableProps = {
  locale: Locale;
  customers: CustomerConfig[];
  rows: ShippingPlanLine[];
  highlightedSourceTaskId: string;
};

export function ShippingTable({
  locale,
  customers,
  rows,
  highlightedSourceTaskId,
}: ShippingTableProps) {
  const ft = forecastCopy[locale];

  return (
    <div className="scroll-x orders-table-scroll">
      <table className="table" style={{ minWidth: 900 }}>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Faurecia P/N</th>
            <th>Quantity</th>
            <th>Shipping Date</th>
            <th>Delivery Note</th>
            <th>{ft.updatedAt}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <ShippingRow
              key={row.id}
              locale={locale}
              customers={customers}
              row={row}
              highlightedSourceTaskId={highlightedSourceTaskId}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ShippingRow({
  locale,
  customers,
  row,
  highlightedSourceTaskId,
}: {
  locale: Locale;
  customers: CustomerConfig[];
  row: ShippingPlanLine;
  highlightedSourceTaskId: string;
}) {
  const isHighlighted = Boolean(highlightedSourceTaskId && row.sourceTaskId === highlightedSourceTaskId);
  const cellBackground = isHighlighted ? ORDER_HIGHLIGHT_BG : undefined;

  return (
    <tr className={isHighlighted ? "order-highlight-row" : ""}>
      <td style={{ background: cellBackground }}>{customerLabelFromId(customers, row.customerId, row.customerName)}</td>
      <td style={{ background: cellBackground }}>{row.internalPartNumber}</td>
      <td style={{ background: cellBackground }}>{row.quantity ?? ""}</td>
      <td style={{ background: cellBackground }}>{row.shippingDate}</td>
      <td style={{ background: cellBackground }}>{row.deliveryNote ?? ""}</td>
      <td style={{ fontSize: 10, color: "var(--muted)", whiteSpace: "nowrap", background: cellBackground }}>
        {row.updatedAt ? formatDateTime(row.updatedAt, locale) : ""}
      </td>
    </tr>
  );
}
