import { apiRequest } from "../api/client";

export type SalesForecastLine = {
  id: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  internalPartNumber: string;
  customerPartNumber: string;
  designation: string | null;
  weekQuantities: Record<string, number>;
  sourceTaskId: string | null;
  sourceFile: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type SalesForecastResponse = {
  lines: SalesForecastLine[];
  total: number;
  page: number;
  size: number;
};

export type ShippingPlanLine = {
  id: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  internalPartNumber: string;
  customerPartNumber: string | null;
  quantity: number;
  shippingDate: string;
  deliveryNote: string | null;
  sourceTaskId: string | null;
  sourceFile: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ShippingPlanResponse = {
  lines: ShippingPlanLine[];
  total: number;
  page: number;
  size: number;
};

export function getSalesForecast(params?: {
  weekFrom?: string;
  weekTo?: string;
}): Promise<SalesForecastResponse> {
  const qs = new URLSearchParams();
  if (params?.weekFrom) qs.set("weekFrom", params.weekFrom);
  if (params?.weekTo) qs.set("weekTo", params.weekTo);
  const query = qs.toString();
  return apiRequest<SalesForecastResponse>(
    `/api/orders/sales-forecasts/${query ? `?${query}` : ""}`
  );
}

export function getShippingPlan(params?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<ShippingPlanResponse> {
  const qs = new URLSearchParams();
  if (params?.dateFrom) qs.set("dateFrom", params.dateFrom);
  if (params?.dateTo) qs.set("dateTo", params.dateTo);
  const query = qs.toString();
  return apiRequest<ShippingPlanResponse>(
    `/api/orders/shipping-plans/${query ? `?${query}` : ""}`
  );
}
