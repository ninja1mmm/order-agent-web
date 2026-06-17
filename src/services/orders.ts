import { apiRequest } from "../api/client";

export type ShippingPlanRecord = {
  record_id: string;
  customer_id: string;
  customer_name?: string;
  source_name?: string;
  manifest_no: string;
  shipping_date: string;
  material_number: string;
  designation: string | null;
  order_lot: string | null;
  pcs_per_box: number | null;
  box_count: number | null;
  actual_qty: number | null;
  delivery_note: string | null;
  supplier_document: string | null;
};

export type SalesForecastRecord = {
  record_id: string;
  customer_id: string;
  material_number: string;
  week_key: string;
  quantity: number;
};

export type ShippingPlanResponse = {
  records: ShippingPlanRecord[];
};

export type SalesForecastResponse = {
  records: SalesForecastRecord[];
};

export function getShippingPlan(): Promise<ShippingPlanResponse> {
  return apiRequest<ShippingPlanResponse>("/api/orders/shipping-plan");
}

export function getSalesForecast(): Promise<SalesForecastResponse> {
  return apiRequest<SalesForecastResponse>("/api/orders/sales-forecast");
}
