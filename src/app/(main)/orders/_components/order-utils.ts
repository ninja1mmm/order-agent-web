import type { Locale } from "../../_components/shared";
import type { SalesForecastLine } from "@/services/orders";
import type { CustomerConfig, MaterialMapping } from "@/services/settings";

export type MaterialRow = {
  rowKey: string;
  customerPartNumber: string;
  internalPartNumber: string;
  customerId: string;
  customerName: string;
  updatedAt: string;
  sourceTaskId: string | null;
  weekQty: Record<string, number>;
};

export const ORDER_HIGHLIGHT_BG = "rgb(236 253 245)";

export const forecastCopy: Record<Locale, Record<string, string>> = {
  "zh-CN": {
    customer: "Customer",
    customerPN: "Customer P/N",
    internalPN: "Faurecia P/N",
    total: "合计",
    updatedAt: "Updated Time",
  },
  "zh-TW": {
    customer: "Customer",
    customerPN: "Customer P/N",
    internalPN: "Faurecia P/N",
    total: "合計",
    updatedAt: "Updated Time",
  },
  en: {
    customer: "Customer",
    customerPN: "Customer P/N",
    internalPN: "Faurecia P/N",
    total: "Total",
    updatedAt: "Updated Time",
  },
};

export function buildWeeklyPivot(lines: SalesForecastLine[], customers: CustomerConfig[]) {
  const weekSet = new Set<string>();
  const materialMap = new Map<string, MaterialRow>();

  for (const line of lines) {
    const customer = findCustomer(customers, line.customerId);
    const customerName = customer?.name ?? line.customerName ?? line.customerId;
    const mapping = findMaterialMapping(customer, line.customerPartNumber);
    const internalPN = mapping?.internalPartNumber ?? line.internalPartNumber;
    const key = `${line.customerId}:${line.customerPartNumber}`;

    let row = materialMap.get(key);
    if (!row) {
      row = {
        rowKey: key,
        customerPartNumber: line.customerPartNumber,
        internalPartNumber: internalPN,
        customerId: line.customerId,
        customerName,
        updatedAt: line.updatedAt ?? "",
        sourceTaskId: line.sourceTaskId,
        weekQty: {},
      };
      materialMap.set(key, row);
    }

    for (const [weekKey, qty] of Object.entries(line.weekQuantities)) {
      weekSet.add(weekKey);
      row.weekQty[weekKey] = (row.weekQty[weekKey] ?? 0) + qty;
    }

    if (line.updatedAt && line.updatedAt > row.updatedAt) {
      row.updatedAt = line.updatedAt;
    }
  }

  const weeks = Array.from(weekSet).sort();
  const rows = Array.from(materialMap.values()).sort((a, b) => a.rowKey.localeCompare(b.rowKey));
  return { weeks, rows };
}

export function formatWeekLabel(weekKey: string): string {
  const match = weekKey.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return weekKey;
  return `W${match[2]}`;
}

export function getWeekYear(weekKey: string): string {
  const match = weekKey.match(/^(\d{4})-W\d{2}$/);
  return match ? match[1] : "";
}

export function formatNum(value: number | undefined): string {
  if (value === undefined || value === 0) return "";
  return value.toLocaleString();
}

function findCustomer(customers: CustomerConfig[], customerId: string) {
  return customers.find((customer) => customer.id === customerId);
}

function findMaterialMapping(customer: CustomerConfig | undefined, materialNumber: string): MaterialMapping | undefined {
  return customer?.materialMappings.find(
    (mapping) =>
      mapping.customerPartNumber === materialNumber ||
      mapping.internalPartNumber === materialNumber,
  );
}
