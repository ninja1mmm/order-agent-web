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
    resultRevision: request.resultRevision ?? 1,
  };
  if (request.orderTypeOverrides && Object.keys(request.orderTypeOverrides).length > 0) {
    body.orderTypeOverrides = request.orderTypeOverrides;
  }
  if (request.deletedRowIds && request.deletedRowIds.length > 0) {
    body.deletedRowIds = request.deletedRowIds;
  }
  if (request.addedRows && request.addedRows.length > 0) {
    body.addedRows = request.addedRows.map((row) => ({
      customerPartNumber: row.customer_part_number,
      quantity: row.quantity,
      dateInfo: row.date_info,
      dateFormat: row.date_format,
    }));
  }
  if (request.restartFromStep !== undefined) {
    body.restartFromStep = request.restartFromStep;
  }
  return body;
}

export function transformRowPatchRequestToSchema(
  request: RowPatchRequest,
): RowPatchRequestSchema {
  return {
    resultRevision: request.resultRevision,
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
