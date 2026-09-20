import { apiBlobRequest, apiRequest } from "./client";
import type {
  CellHistoryResponseSchema,
  CellRevisionSchema,
  RollingForecastCellUpdateSchema,
  RollingForecastQuerySchema,
  RollingForecastResponseSchema,
  RowDetailQuerySchema,
  RowDetailResponseSchema,
} from "@/types/schemas/orders";

function buildRollingForecastQuery(params: RollingForecastQuerySchema): string {
  const qs = new URLSearchParams();
  qs.set("timeFrom", params.timeFrom);
  qs.set("timeTo", params.timeTo);
  if (params.page) qs.set("page", String(params.page));
  if (params.size) qs.set("size", String(params.size));
  if (params.customerId) qs.set("customerId", params.customerId);
  if (params.internalPartNumber) qs.set("internalPartNumber", params.internalPartNumber);
  return qs.toString();
}

export function getRollingForecastSchema(
  params: RollingForecastQuerySchema,
  signal?: AbortSignal,
): Promise<RollingForecastResponseSchema> {
  return apiRequest<RollingForecastResponseSchema>(
    `/api/orders/rolling-forecast/?${buildRollingForecastQuery(params)}`,
    { signal },
  );
}

export function getRowDetailSchema(
  params: RowDetailQuerySchema,
): Promise<RowDetailResponseSchema> {
  const qs = new URLSearchParams();
  qs.set("row_key", params.rowKey);
  qs.set("time_from", params.timeFrom);
  qs.set("time_to", params.timeTo);
  return apiRequest<RowDetailResponseSchema>(
    `/api/orders/rolling-forecast/row-detail?${qs.toString()}`,
  );
}

export function getCellHistorySchema(cellId: string): Promise<CellHistoryResponseSchema> {
  return apiRequest<CellHistoryResponseSchema>(
    `/api/orders/rolling-forecast/cells/${cellId}/history`,
  );
}

export function exportOrdersSchema(params: RollingForecastQuerySchema & {
  classification: string;
}): Promise<Blob> {
  const qs = new URLSearchParams(buildRollingForecastQuery(params));
  qs.set("kind", params.classification);
  return apiBlobRequest(`/api/orders/rolling-forecast/export?${qs.toString()}`);
}

export function editRollingForecastCellSchema(
  payload: RollingForecastCellUpdateSchema,
): Promise<CellRevisionSchema> {
  return apiRequest<CellRevisionSchema>("/api/orders/rolling-forecast/cells", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
