import { apiBlobRequest, apiRequest } from "../api/client";

export type DemandClassification = "confirmed" | "forecast";
export type DemandKind = "firm" | "forecast";
export type TimeGranularity = "day" | "week" | "month";

export type RollingForecastCell = {
  id: string;
  colKey: string;
  value: number;
  timeGranularity: TimeGranularity;
  classification: DemandClassification;
  hasManualRevision: boolean;
  dateStart: string;
  dateEnd: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type RollingForecastRowGroup = {
  rowKey: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  internalPartNumber: string;
  customerPartNumber: string | null;
  designation: string | null;
  cells: RollingForecastCell[];
};

export type RollingForecastResponse = {
  groups: RollingForecastRowGroup[];
  page: number;
  size: number;
  totalGroups: number;
};

export type CellRevision = {
  revision: number;
  value: number;
  previousValue: number | null;
  changeType: string;
  actorName: string | null;
  note: string | null;
  sourceFile: string | null;
  mailSubject: string | null;
  mailMessageId: string | null;
  createdAt: string;
};

export type RollingForecastCellWithHistory = RollingForecastCell & {
  revisions: CellRevision[];
};

export type RowDetailResponse = {
  rowKey: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  internalPartNumber: string;
  customerPartNumber: string | null;
  designation: string | null;
  timeFrom: string;
  timeTo: string;
  cells: RollingForecastCellWithHistory[];
};

export type CellHistoryResponse = {
  revisions: CellRevision[];
};

export function classificationToKind(classification: DemandClassification): DemandKind {
  return classification === "confirmed" ? "firm" : "forecast";
}

export function kindToClassification(kind: DemandKind): DemandClassification {
  return kind === "firm" ? "confirmed" : "forecast";
}

export function getRollingForecast(params: {
  timeFrom: string;
  timeTo: string;
  page?: number;
  size?: number;
  customerId?: string;
  internalPartNumber?: string;
}): Promise<RollingForecastResponse> {
  const qs = new URLSearchParams();
  qs.set("timeFrom", params.timeFrom);
  qs.set("timeTo", params.timeTo);
  if (params.page) qs.set("page", String(params.page));
  if (params.size) qs.set("size", String(params.size));
  if (params.customerId) qs.set("customerId", params.customerId);
  if (params.internalPartNumber) qs.set("internalPartNumber", params.internalPartNumber);
  return apiRequest<RollingForecastResponse>(`/api/orders/rolling-forecast/?${qs.toString()}`);
}

export function getRowDetail(params: {
  rowKey: string;
  timeFrom: string;
  timeTo: string;
}): Promise<RowDetailResponse> {
  const qs = new URLSearchParams();
  qs.set("row_key", params.rowKey);
  qs.set("time_from", params.timeFrom);
  qs.set("time_to", params.timeTo);
  return apiRequest<RowDetailResponse>(`/api/orders/rolling-forecast/row-detail?${qs.toString()}`);
}

export function getCellHistory(cellId: string): Promise<CellHistoryResponse> {
  return apiRequest<CellHistoryResponse>(`/api/orders/rolling-forecast/cells/${cellId}/history`);
}

export function exportOrders(params: {
  timeFrom: string;
  timeTo: string;
  customerId?: string;
  internalPartNumber?: string;
  kind: DemandKind;
}): Promise<Blob> {
  const qs = new URLSearchParams();
  qs.set("timeFrom", params.timeFrom);
  qs.set("timeTo", params.timeTo);
  if (params.customerId) qs.set("customerId", params.customerId);
  if (params.internalPartNumber) qs.set("internalPartNumber", params.internalPartNumber);
  qs.set("kind", kindToClassification(params.kind));
  return apiBlobRequest(`/api/orders/rolling-forecast/export?${qs.toString()}`);
}

export function editRollingForecastCell(params: {
  rowKey: string;
  colKey: string;
  value: number;
  classification: DemandClassification;
  timeGranularity: TimeGranularity;
  reason: string;
}): Promise<CellRevision> {
  return apiRequest<CellRevision>("/api/orders/rolling-forecast/cells", {
    method: "PATCH",
    body: JSON.stringify({
      row_key: params.rowKey,
      col_key: params.colKey,
      value: params.value,
      classification: params.classification,
      time_granularity: params.timeGranularity,
      reason: params.reason,
    }),
  });
}
