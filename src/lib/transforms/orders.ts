import type { RollingForecastCellUpdateSchema } from "@/types/schemas/orders";
import type {
  CellHistoryResponse,
  CellRevision,
  DemandClassification,
  DemandKind,
  RollingForecastCellUpdate,
  RollingForecastResponse,
  RowDetailResponse,
} from "@/types/models/orders";
import type {
  CellHistoryResponseSchema,
  CellRevisionSchema,
  RollingForecastResponseSchema,
  RowDetailResponseSchema,
} from "@/types/schemas/orders";

export function classificationToKind(classification: DemandClassification): DemandKind {
  return classification === "confirmed" ? "firm" : "forecast";
}

export function kindToClassification(kind: DemandKind): DemandClassification {
  return kind === "firm" ? "confirmed" : "forecast";
}

export function transformRollingForecastResponseToModel(
  response: RollingForecastResponseSchema,
): RollingForecastResponse {
  return response;
}

export function transformRowDetailResponseToModel(
  response: RowDetailResponseSchema,
): RowDetailResponse {
  return response;
}

export function transformCellHistoryResponseToModel(
  response: CellHistoryResponseSchema,
): CellHistoryResponse {
  return response;
}

export function transformCellRevisionToModel(response: CellRevisionSchema): CellRevision {
  return response;
}

export function transformRollingForecastCellUpdateToSchema(
  params: RollingForecastCellUpdate,
): RollingForecastCellUpdateSchema {
  return {
    rowKey: params.rowKey,
    colKey: params.colKey,
    value: params.value,
    classification: params.classification,
    timeGranularity: params.timeGranularity,
    reason: params.reason,
  };
}
