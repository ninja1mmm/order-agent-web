import type {
  EffectiveRowsResponseSchema,
  ProceedTaskRequestSchema,
  RowPatchRequestSchema,
  RowPatchResponseSchema,
} from "@/types/schemas/tasks";
import type {
  EffectiveRowsResponse,
  ProceedTaskRequest,
  RowPatchRequest,
  RowPatchResponse,
} from "@/types/models/tasks";

export function transformProceedTaskRequestToSchema(
  request: ProceedTaskRequest,
): ProceedTaskRequestSchema {
  const body: ProceedTaskRequestSchema = {
    result_revision: request.resultRevision ?? 1,
  };
  if (request.orderTypeOverrides && Object.keys(request.orderTypeOverrides).length > 0) {
    body.order_type_overrides = request.orderTypeOverrides;
  }
  if (request.deletedRowIds && request.deletedRowIds.length > 0) {
    body.deleted_row_ids = request.deletedRowIds;
  }
  if (request.addedRows && request.addedRows.length > 0) {
    body.added_rows = request.addedRows;
  }
  return body;
}

export function transformRowPatchRequestToSchema(
  request: RowPatchRequest,
): RowPatchRequestSchema {
  return {
    result_revision: request.resultRevision,
    changes: request.changes,
  };
}

export function transformRowPatchResponseToModel(
  response: RowPatchResponseSchema,
): RowPatchResponse {
  return response;
}

export function transformEffectiveRowsResponseToModel(
  response: EffectiveRowsResponseSchema,
): EffectiveRowsResponse {
  return response;
}
