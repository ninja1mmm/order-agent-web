import {
  editRollingForecastCellSchema,
  exportOrdersSchema,
  getCellHistorySchema,
  getRollingForecastSchema,
  getRowDetailSchema,
} from "@/api/orders";
import {
  classificationToKind,
  kindToClassification,
  transformCellHistoryResponseToModel,
  transformCellRevisionToModel,
  transformRollingForecastCellUpdateToSchema,
  transformRollingForecastResponseToModel,
  transformRowDetailResponseToModel,
} from "@/lib/transforms/orders";
import type {
  CellHistoryResponse,
  CellRevision,
  DemandClassification,
  DemandKind,
  ExportOrdersQuery,
  RollingForecastCellUpdate,
  RollingForecastQuery,
  RollingForecastResponse,
  RowDetailQuery,
  RowDetailResponse,
} from "@/types/models/orders";

export type {
  CellHistoryResponse,
  CellRevision,
  DemandClassification,
  DemandKind,
  RollingForecastCell,
  RollingForecastCellWithHistory,
  RollingForecastResponse,
  RollingForecastRowGroup,
  RowDetailResponse,
  TimeGranularity,
} from "@/types/models/orders";

export { classificationToKind, kindToClassification };

export async function getRollingForecast(
  params: RollingForecastQuery,
  signal?: AbortSignal,
): Promise<RollingForecastResponse> {
  const response = await getRollingForecastSchema(params, signal);
  return transformRollingForecastResponseToModel(response);
}

export async function getRowDetail(params: RowDetailQuery): Promise<RowDetailResponse> {
  const response = await getRowDetailSchema(params);
  return transformRowDetailResponseToModel(response);
}

export async function getCellHistory(cellId: string): Promise<CellHistoryResponse> {
  const response = await getCellHistorySchema(cellId);
  return transformCellHistoryResponseToModel(response);
}

export function exportOrders(params: ExportOrdersQuery): Promise<Blob> {
  return exportOrdersSchema({
    ...params,
    classification: kindToClassification(params.kind),
  });
}

export async function editRollingForecastCell(
  params: RollingForecastCellUpdate,
): Promise<CellRevision> {
  const response = await editRollingForecastCellSchema(
    transformRollingForecastCellUpdateToSchema(params),
  );
  return transformCellRevisionToModel(response);
}
