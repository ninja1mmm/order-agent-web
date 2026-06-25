import { apiRequest } from "../api/client";

export type ForecastWeekQuantity = {
  quantityId: string;
  weekKey: string;
  weekStartDate: string;
  quantity: number;
  previousQuantity: number | null;
  deltaQuantity: number | null;
  currentVersion: number;
  sourceTaskId: string | null;
  isManuallyEdited: boolean;
};

export type ForecastLine = {
  lineId: string;
  materialId: string;
  customerPartNumber: string;
  internalPartNumber: string;
  weekQuantities: ForecastWeekQuantity[];
};

export type SalesForecast = {
  id: string;
  customerId: string;
  lines: ForecastLine[];
  createdAt: string | null;
  updatedAt: string | null;
};

export type SalesForecastResponse = {
  forecasts: SalesForecast[];
  total: number;
  page: number;
  size: number;
};

export type ShippingLine = {
  lineId: string;
  shippingDate: string;
  materialNumber: string;
  orderNumber: string | null;
  orderLine: string | null;
  deliveryNote: string | null;
  actualQty: number;
  previousQuantity: number | null;
  deltaQuantity: number | null;
  currentVersion: number;
  sourceTaskId: string | null;
  isManuallyEdited: boolean;
};

export type ShippingPlan = {
  id: string;
  customerId: string;
  lines: ShippingLine[];
  createdAt: string | null;
  updatedAt: string | null;
};

export type ShippingPlanResponse = {
  plans: ShippingPlan[];
  total: number;
  page: number;
  size: number;
};

type ShippingRecordRaw = {
  record_id?: string;
  customer_id?: string;
  customer_name?: string;
  shipping_date?: string;
  material_number?: string;
  order_number?: string | null;
  order_line?: string | null;
  delivery_note?: string | null;
  actual_qty?: number | null;
  source_task_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ForecastRecordRaw = {
  record_id?: string;
  customer_id?: string;
  customer_name?: string;
  material_number?: string;
  designation?: string;
  week_key?: string;
  quantity?: number;
  source_task_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function normalizeShipping(records: ShippingRecordRaw[]): ShippingPlanResponse {
  const plansByCustomer = new Map<string, ShippingPlan>();

  for (const record of records) {
    const customerId = record.customer_id ?? "";
    const planId = customerId || "shipping-plan";
    const existing = plansByCustomer.get(planId);
    const line: ShippingLine = {
      lineId: record.record_id ?? `${customerId}:${record.material_number}:${record.shipping_date}`,
      shippingDate: record.shipping_date ?? "",
      materialNumber: record.material_number ?? "",
      orderNumber: record.order_number ?? null,
      orderLine: record.order_line ?? null,
      deliveryNote: record.delivery_note ?? null,
      actualQty: record.actual_qty ?? 0,
      previousQuantity: null,
      deltaQuantity: null,
      currentVersion: 1,
      sourceTaskId: record.source_task_id ?? null,
      isManuallyEdited: false,
    };

    if (existing) {
      existing.lines.push(line);
      if (record.updated_at && (!existing.updatedAt || record.updated_at > existing.updatedAt)) {
        existing.updatedAt = record.updated_at;
      }
      continue;
    }

    plansByCustomer.set(planId, {
      id: planId,
      customerId,
      lines: [line],
      createdAt: record.created_at ?? null,
      updatedAt: record.updated_at ?? null,
    });
  }

  const plans = Array.from(plansByCustomer.values());
  return { plans, total: plans.length, page: 1, size: plans.length };
}

function normalizeForecast(records: ForecastRecordRaw[]): SalesForecastResponse {
  const forecastsByCustomer = new Map<string, SalesForecast>();

  for (const record of records) {
    const customerId = record.customer_id ?? "";
    const forecastId = customerId || "sales-forecast";
    const forecast = forecastsByCustomer.get(forecastId) ?? {
      id: forecastId,
      customerId,
      lines: [],
      createdAt: record.created_at ?? null,
      updatedAt: record.updated_at ?? null,
    };

    const materialNumber = record.material_number ?? "";
    let line = forecast.lines.find((item) => item.materialId === materialNumber);
    if (!line) {
      line = {
        lineId: `${forecastId}:${materialNumber}`,
        materialId: materialNumber,
        customerPartNumber: materialNumber,
        internalPartNumber: materialNumber,
        weekQuantities: [],
      };
      forecast.lines.push(line);
    }

    line.weekQuantities.push({
      quantityId: record.record_id ?? `${materialNumber}:${record.week_key}`,
      weekKey: record.week_key ?? "",
      weekStartDate: "",
      quantity: record.quantity ?? 0,
      previousQuantity: null,
      deltaQuantity: null,
      currentVersion: 1,
      sourceTaskId: record.source_task_id ?? null,
      isManuallyEdited: false,
    });

    if (record.updated_at && (!forecast.updatedAt || record.updated_at > forecast.updatedAt)) {
      forecast.updatedAt = record.updated_at;
    }
    forecastsByCustomer.set(forecastId, forecast);
  }

  const forecasts = Array.from(forecastsByCustomer.values());
  return { forecasts, total: forecasts.length, page: 1, size: forecasts.length };
}

export function getShippingPlan(): Promise<ShippingPlanResponse> {
  return apiRequest<{ records: ShippingRecordRaw[] }>("/api/orders/shipping-plan").then((result) =>
    normalizeShipping(result.records ?? []),
  );
}

export function getSalesForecast(): Promise<SalesForecastResponse> {
  return apiRequest<{ records: ForecastRecordRaw[] }>("/api/orders/sales-forecast").then((result) =>
    normalizeForecast(result.records ?? []),
  );
}
