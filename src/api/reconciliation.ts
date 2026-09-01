import { apiRequest } from "./client";
import type {
  BulkConfirmRequestSchema,
  BulkConfirmResponseSchema,
  MappingSuggestionAcceptSchema,
  ManualMatchCreateSchema,
  MatchConfirmRequestSchema,
  MatchReceiptRemapRequestSchema,
  MatchListResponseSchema,
  MatchSummaryResponseSchema,
  MergeReviewResponseSchema,
  MergeSummaryResponseSchema,
  ParsedReconciliationRecordSchema,
  ReceiptRecordCreateSchema,
  ReceiptImportReviewResponseSchema,
  ReceiptRecordListParamsSchema,
  ReceiptRecordListResponseSchema,
  ReceiptRecordResponseSchema,
  ReceiptRecordUpdateSchema,
  ReconciliationFileUploadResponseSchema,
  ReconciliationMatchResponseSchema,
  ReconciliationScheduleCreateSchema,
  ReconciliationScheduleResponseSchema,
  ReconciliationScheduleUpdateSchema,
  ReconciliationTaskCreateSchema,
  ReconciliationTaskListResponseSchema,
  ReconciliationTaskResponseSchema,
  ShipmentImportReviewResponseSchema,
  ShipmentRecordCreateSchema,
  ShipmentRecordListParamsSchema,
  ShipmentRecordListResponseSchema,
  ShipmentRecordResponseSchema,
  ShipmentRecordUpdateSchema,
} from "@/types/schemas/reconciliation";

function queryString(params: Record<string, string | number | undefined | null>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") qs.set(key, String(value));
  }
  const value = qs.toString();
  return value ? `?${value}` : "";
}

export function listReconciliationTasksSchema(params: {
  page?: number;
  size?: number;
  customerId?: string;
  status?: string;
}): Promise<ReconciliationTaskListResponseSchema> {
  return apiRequest<ReconciliationTaskListResponseSchema>(
    `/api/reconciliation/tasks${queryString(params)}`,
  );
}

export function createReconciliationTaskSchema(
  payload: ReconciliationTaskCreateSchema,
): Promise<ReconciliationTaskResponseSchema> {
  return apiRequest<ReconciliationTaskResponseSchema>("/api/reconciliation/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getReconciliationTaskSchema(taskId: string): Promise<ReconciliationTaskResponseSchema> {
  return apiRequest<ReconciliationTaskResponseSchema>(
    `/api/reconciliation/tasks/${encodeURIComponent(taskId)}`,
  );
}

export function startReconciliationTaskSchema(taskId: string): Promise<ReconciliationTaskResponseSchema> {
  return apiRequest<ReconciliationTaskResponseSchema>(
    `/api/reconciliation/tasks/${encodeURIComponent(taskId)}/start`,
    { method: "POST" },
  );
}

export function regenerateReconciliationMatchesSchema(taskId: string): Promise<MatchListResponseSchema> {
  return apiRequest<MatchListResponseSchema>(
    `/api/reconciliation/tasks/${encodeURIComponent(taskId)}/regenerate`,
    { method: "POST" },
  );
}

export function closeReconciliationTaskSchema(taskId: string): Promise<{ status: string }> {
  return apiRequest<{ status: string }>(
    `/api/reconciliation/tasks/${encodeURIComponent(taskId)}/close`,
    { method: "POST" },
  );
}

export function reopenReconciliationTaskSchema(taskId: string): Promise<ReconciliationTaskResponseSchema> {
  return apiRequest<ReconciliationTaskResponseSchema>(
    `/api/reconciliation/tasks/${encodeURIComponent(taskId)}/reopen`,
    { method: "POST" },
  );
}

export function voidReconciliationTaskSchema(
  taskId: string,
  reason?: string | null,
): Promise<ReconciliationTaskResponseSchema> {
  return apiRequest<ReconciliationTaskResponseSchema>(
    `/api/reconciliation/tasks/${encodeURIComponent(taskId)}/void`,
    { method: "POST", body: JSON.stringify({ reason: reason ?? null }) },
  );
}

export function cancelReconciliationTaskSchema(taskId: string): Promise<ReconciliationTaskResponseSchema> {
  return apiRequest<ReconciliationTaskResponseSchema>(
    `/api/reconciliation/tasks/${encodeURIComponent(taskId)}/cancel`,
    { method: "POST" },
  );
}

export function uploadReconciliationFileSchema(params: {
  file: File;
  fileType: "sap_shipment" | "delivery_mapping" | "customer_receipt";
  customerId?: string;
  receiptType?: "internal" | "external";
}): Promise<ReconciliationFileUploadResponseSchema> {
  const form = new FormData();
  form.set("file", params.file);
  return apiRequest<ReconciliationFileUploadResponseSchema>(
    `/api/reconciliation/files/upload${queryString({
      file_type: params.fileType,
      customer_id: params.customerId,
      receipt_type: params.receiptType,
    })}`,
    { method: "POST", body: form },
  );
}

export function listParsedReconciliationRecordsSchema(fileId: string): Promise<MergeReviewResponseSchema> {
  return apiRequest<MergeReviewResponseSchema>(
    `/api/reconciliation/files/${encodeURIComponent(fileId)}/parsed-records`,
  );
}

export function updateParsedRecordResolutionSchema(
  fileId: string,
  recordId: string,
  payload: { resolution: string; resolutionRemark?: string | null },
): Promise<ParsedReconciliationRecordSchema> {
  return apiRequest<ParsedReconciliationRecordSchema>(
    `/api/reconciliation/files/${encodeURIComponent(fileId)}/parsed-records/${encodeURIComponent(recordId)}/resolution`,
    {
      method: "PATCH",
      body: JSON.stringify({
        resolution: payload.resolution,
        resolutionRemark: payload.resolutionRemark ?? null,
      }),
    },
  );
}

export function acceptParsedRecordMappingSchema(
  fileId: string,
  recordId: string,
  payload: MappingSuggestionAcceptSchema,
): Promise<ParsedReconciliationRecordSchema> {
  return apiRequest<ParsedReconciliationRecordSchema>(
    `/api/reconciliation/files/${encodeURIComponent(fileId)}/parsed-records/${encodeURIComponent(recordId)}/accept-mapping`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export function acceptFileMappingBatchSchema(
  fileId: string,
  payload: MappingSuggestionAcceptSchema,
): Promise<{ affected: number }> {
  return apiRequest<{ affected: number }>(
    `/api/reconciliation/files/${encodeURIComponent(fileId)}/accept-mapping-batch`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export function mergeReconciliationFileSchema(fileId: string): Promise<MergeSummaryResponseSchema> {
  return apiRequest<MergeSummaryResponseSchema>(
    `/api/reconciliation/files/${encodeURIComponent(fileId)}/merge`,
    { method: "POST" },
  );
}

export function getShipmentImportReviewSchema(params: {
  shipmentFileId: string;
  mappingFileId: string;
}): Promise<ShipmentImportReviewResponseSchema> {
  return apiRequest<ShipmentImportReviewResponseSchema>(
    `/api/reconciliation/imports/shipment-review${queryString({
      shipment_file_id: params.shipmentFileId,
      mapping_file_id: params.mappingFileId,
    })}`,
  );
}

export function getReceiptImportReviewSchema(fileId: string): Promise<ReceiptImportReviewResponseSchema> {
  return apiRequest<ReceiptImportReviewResponseSchema>(
    `/api/reconciliation/imports/receipt-review${queryString({ file_id: fileId })}`,
  );
}

export function listShipmentRecordsSchema(
  params: ShipmentRecordListParamsSchema,
): Promise<ShipmentRecordListResponseSchema> {
  return apiRequest<ShipmentRecordListResponseSchema>(
    `/api/reconciliation/shipment-records${queryString(params)}`,
  );
}

export function createShipmentRecordSchema(
  payload: ShipmentRecordCreateSchema,
): Promise<ShipmentRecordResponseSchema> {
  return apiRequest<ShipmentRecordResponseSchema>("/api/reconciliation/shipment-records", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateShipmentRecordSchema(
  recordId: string,
  payload: ShipmentRecordUpdateSchema,
): Promise<ShipmentRecordResponseSchema> {
  return apiRequest<ShipmentRecordResponseSchema>(
    `/api/reconciliation/shipment-records/${encodeURIComponent(recordId)}`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
}

export function deleteShipmentRecordSchema(recordId: string): Promise<void> {
  return apiRequest<void>(
    `/api/reconciliation/shipment-records/${encodeURIComponent(recordId)}`,
    { method: "DELETE" },
  );
}

export function listReceiptRecordsSchema(
  params: ReceiptRecordListParamsSchema,
): Promise<ReceiptRecordListResponseSchema> {
  return apiRequest<ReceiptRecordListResponseSchema>(
    `/api/reconciliation/receipt-records${queryString(params)}`,
  );
}

export function createReceiptRecordSchema(
  payload: ReceiptRecordCreateSchema,
): Promise<ReceiptRecordResponseSchema> {
  return apiRequest<ReceiptRecordResponseSchema>("/api/reconciliation/receipt-records", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateReceiptRecordSchema(
  recordId: string,
  payload: ReceiptRecordUpdateSchema,
): Promise<ReceiptRecordResponseSchema> {
  return apiRequest<ReceiptRecordResponseSchema>(
    `/api/reconciliation/receipt-records/${encodeURIComponent(recordId)}`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
}

export function deleteReceiptRecordSchema(recordId: string): Promise<void> {
  return apiRequest<void>(
    `/api/reconciliation/receipt-records/${encodeURIComponent(recordId)}`,
    { method: "DELETE" },
  );
}

export function listReconciliationMatchesSchema(
  taskId: string,
  status?: string,
): Promise<MatchListResponseSchema> {
  return apiRequest<MatchListResponseSchema>(
    `/api/reconciliation/tasks/${encodeURIComponent(taskId)}/matches${queryString({ status })}`,
  );
}

export function confirmReconciliationMatchSchema(
  taskId: string,
  matchId: string,
  payload?: MatchConfirmRequestSchema,
): Promise<ReconciliationMatchResponseSchema> {
  return apiRequest<ReconciliationMatchResponseSchema>(
    `/api/reconciliation/tasks/${encodeURIComponent(taskId)}/matches/${encodeURIComponent(matchId)}/confirm`,
    { method: "POST", body: JSON.stringify(payload ?? {}) },
  );
}

export function rejectReconciliationMatchSchema(
  taskId: string,
  matchId: string,
): Promise<ReconciliationMatchResponseSchema> {
  return apiRequest<ReconciliationMatchResponseSchema>(
    `/api/reconciliation/tasks/${encodeURIComponent(taskId)}/matches/${encodeURIComponent(matchId)}/reject`,
    { method: "POST" },
  );
}

export function unconfirmReconciliationMatchSchema(
  taskId: string,
  matchId: string,
): Promise<ReconciliationMatchResponseSchema> {
  return apiRequest<ReconciliationMatchResponseSchema>(
    `/api/reconciliation/tasks/${encodeURIComponent(taskId)}/matches/${encodeURIComponent(matchId)}/unconfirm`,
    { method: "POST" },
  );
}

export function remapReconciliationMatchReceiptSchema(
  taskId: string,
  matchId: string,
  payload: MatchReceiptRemapRequestSchema,
): Promise<ReconciliationMatchResponseSchema> {
  return apiRequest<ReconciliationMatchResponseSchema>(
    `/api/reconciliation/tasks/${encodeURIComponent(taskId)}/matches/${encodeURIComponent(matchId)}/receipt`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
}

export function createManualReconciliationMatchSchema(
  taskId: string,
  payload: ManualMatchCreateSchema,
): Promise<ReconciliationMatchResponseSchema> {
  return apiRequest<ReconciliationMatchResponseSchema>(
    `/api/reconciliation/tasks/${encodeURIComponent(taskId)}/matches/manual`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export function bulkConfirmReconciliationMatchesSchema(
  taskId: string,
  payload: BulkConfirmRequestSchema,
): Promise<BulkConfirmResponseSchema> {
  return apiRequest<BulkConfirmResponseSchema>(
    `/api/reconciliation/tasks/${encodeURIComponent(taskId)}/matches/bulk-confirm`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export function getReconciliationMatchSummarySchema(taskId: string): Promise<MatchSummaryResponseSchema> {
  return apiRequest<MatchSummaryResponseSchema>(
    `/api/reconciliation/tasks/${encodeURIComponent(taskId)}/match-summary`,
  );
}

export function listReconciliationSchedulesSchema(
  customerId: string,
): Promise<ReconciliationScheduleResponseSchema[]> {
  return apiRequest<ReconciliationScheduleResponseSchema[]>(
    `/api/reconciliation/customers/${encodeURIComponent(customerId)}/reconciliation-schedules`,
  );
}

export function createReconciliationScheduleSchema(
  customerId: string,
  payload: ReconciliationScheduleCreateSchema,
): Promise<ReconciliationScheduleResponseSchema> {
  return apiRequest<ReconciliationScheduleResponseSchema>(
    `/api/reconciliation/customers/${encodeURIComponent(customerId)}/reconciliation-schedules`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

export function updateReconciliationScheduleSchema(
  customerId: string,
  scheduleId: string,
  payload: ReconciliationScheduleUpdateSchema,
): Promise<ReconciliationScheduleResponseSchema> {
  return apiRequest<ReconciliationScheduleResponseSchema>(
    `/api/reconciliation/customers/${encodeURIComponent(customerId)}/reconciliation-schedules/${encodeURIComponent(scheduleId)}`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );
}

export function deleteReconciliationScheduleSchema(
  customerId: string,
  scheduleId: string,
): Promise<void> {
  return apiRequest<void>(
    `/api/reconciliation/customers/${encodeURIComponent(customerId)}/reconciliation-schedules/${encodeURIComponent(scheduleId)}`,
    { method: "DELETE" },
  );
}
