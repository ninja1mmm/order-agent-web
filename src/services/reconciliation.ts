import {
  acceptFileMappingBatchSchema,
  acceptParsedRecordMappingSchema,
  bulkConfirmReconciliationMatchesSchema,
  cancelReconciliationTaskSchema,
  closeReconciliationTaskSchema,
  createReceiptRecordSchema,
  createReconciliationScheduleSchema,
  createReconciliationTaskSchema,
  createShipmentRecordSchema,
  deleteReceiptRecordSchema,
  deleteReconciliationScheduleSchema,
  deleteShipmentRecordSchema,
  getReceiptImportReviewSchema,
  getShipmentImportReviewSchema,
  getReconciliationMatchSummarySchema,
  getReconciliationTaskSchema,
  listParsedReconciliationRecordsSchema,
  listReceiptRecordsSchema,
  listReconciliationMatchesSchema,
  listReconciliationSchedulesSchema,
  listReconciliationTasksSchema,
  listShipmentRecordsSchema,
  mergeReconciliationFileSchema,
  regenerateReconciliationMatchesSchema,
  reopenReconciliationTaskSchema,
  remapReconciliationMatchReceiptSchema,
  startReconciliationTaskSchema,
  unconfirmReconciliationMatchSchema,
  updateParsedRecordResolutionSchema,
  updateReceiptRecordSchema,
  updateReconciliationScheduleSchema,
  updateShipmentRecordSchema,
  uploadReconciliationFileSchema,
  voidReconciliationTaskSchema,
} from "@/api/reconciliation";
import {
  buildConfigRows,
  transformFileUploadToModel,
  transformMatchListToModel,
  transformMatchSummaryToModel,
  transformMergeReviewToModel,
  transformMergeSummaryToModel,
  transformReceiptListSchemaToModel,
  transformReceiptSchemaToModel,
  transformShipmentListSchemaToModel,
  transformShipmentSchemaToModel,
  transformTaskListSchemaToModel,
  transformTaskSchemaToModel,
} from "@/lib/transforms/reconciliation";
import type { CustomerConfig } from "@/types/models/settings";
import type {
  FileUploadResult,
  MatchList,
  MatchSummary,
  MergeReview,
  MergeSummary,
  ReceiptImportReview,
  ReceiptImportReviewRow,
  ReceiptRecord,
  ReceiptRecordDraft,
  ReconciliationConfigRow,
  ReconciliationScheduleDraft,
  ReconciliationTask,
  ReconciliationTaskCreate,
  ReconciliationTaskList,
  ShipmentImportReview,
  ShipmentImportReviewRow,
  ShipmentRecord,
  ShipmentRecordDraft,
} from "@/types/models/reconciliation";

export type {
  CommitPreviewRow,
  FileUploadResult,
  MatchGroup,
  MatchList,
  MatchSummary,
  MergeReview,
  MergeSummary,
  ParsedImportRecord,
  ReceiptImportReview,
  ReceiptImportReviewRow,
  ReceiptRecord,
  ReceiptRecordDraft,
  ReconciliationConfigRow,
  ReconciliationMatch,
  ReconciliationSchedule,
  ReconciliationScheduleDraft,
  ReconciliationTask,
  ReconciliationTaskCreate,
  ReconciliationTaskList,
  ShipmentImportReview,
  ShipmentImportReviewRow,
  ShipmentRecord,
  ShipmentRecordDraft,
} from "@/types/models/reconciliation";

export async function listReconciliationTasks(
  params: { page?: number; size?: number; customerId?: string; status?: string },
  customers: CustomerConfig[],
): Promise<ReconciliationTaskList> {
  const response = await listReconciliationTasksSchema(params);
  return transformTaskListSchemaToModel(response, customers);
}

export async function createReconciliationTask(
  payload: ReconciliationTaskCreate,
  customers: CustomerConfig[],
): Promise<ReconciliationTask> {
  const response = await createReconciliationTaskSchema({
    customerId: payload.customerId,
    periodFrom: payload.periodFrom,
    periodTo: payload.periodTo,
    creationSource: "manual",
    remark: payload.remark || null,
  });
  return transformTaskSchemaToModel(response, customers);
}

export async function getReconciliationTask(
  taskId: string,
  customers: CustomerConfig[],
): Promise<ReconciliationTask> {
  const response = await getReconciliationTaskSchema(taskId);
  return transformTaskSchemaToModel(response, customers);
}

export async function startReconciliationTask(
  taskId: string,
  customers: CustomerConfig[],
): Promise<ReconciliationTask> {
  const response = await startReconciliationTaskSchema(taskId);
  return transformTaskSchemaToModel(response, customers);
}

export async function regenerateReconciliationMatches(taskId: string): Promise<void> {
  await regenerateReconciliationMatchesSchema(taskId);
}

export async function closeReconciliationTask(taskId: string): Promise<void> {
  await closeReconciliationTaskSchema(taskId);
}

export async function reopenReconciliationTask(
  taskId: string,
  customers: CustomerConfig[],
): Promise<ReconciliationTask> {
  const response = await reopenReconciliationTaskSchema(taskId);
  return transformTaskSchemaToModel(response, customers);
}

export async function voidReconciliationTask(
  taskId: string,
  reason: string | null,
  customers: CustomerConfig[],
): Promise<ReconciliationTask> {
  const response = await voidReconciliationTaskSchema(taskId, reason);
  return transformTaskSchemaToModel(response, customers);
}

export async function cancelReconciliationTask(
  taskId: string,
  customers: CustomerConfig[],
): Promise<ReconciliationTask> {
  const response = await cancelReconciliationTaskSchema(taskId);
  return transformTaskSchemaToModel(response, customers);
}

export async function uploadReconciliationFile(params: {
  file: File;
  fileType: "sap_shipment" | "delivery_mapping" | "customer_receipt";
  customerId?: string;
  receiptType?: "internal" | "external";
}): Promise<FileUploadResult> {
  const response = await uploadReconciliationFileSchema(params);
  return transformFileUploadToModel(response);
}

export async function listParsedReconciliationRecords(fileId: string): Promise<MergeReview> {
  const response = await listParsedReconciliationRecordsSchema(fileId);
  return transformMergeReviewToModel(response);
}

export async function updateParsedRecordResolution(
  fileId: string,
  recordId: string,
  resolution: string,
  resolutionRemark?: string | null,
) {
  await updateParsedRecordResolutionSchema(fileId, recordId, { resolution, resolutionRemark });
}

export async function acceptParsedRecordMapping(
  fileId: string,
  recordId: string,
  payload: { customerPartNumber?: string | null; internalPartNumber?: string | null },
) {
  await acceptParsedRecordMappingSchema(fileId, recordId, payload);
}

export async function acceptFileMappingBatch(
  fileId: string,
  payload: { customerPartNumber?: string | null; internalPartNumber?: string | null },
) {
  return acceptFileMappingBatchSchema(fileId, payload);
}

export async function mergeReconciliationFile(fileId: string): Promise<MergeSummary> {
  const response = await mergeReconciliationFileSchema(fileId);
  return transformMergeSummaryToModel(response);
}

export async function getShipmentImportReview(params: {
  shipmentFileId: string;
  mappingFileId: string;
}): Promise<ShipmentImportReview> {
  return getShipmentImportReviewSchema(params);
}

export async function getReceiptImportReview(fileId: string): Promise<ReceiptImportReview> {
  return getReceiptImportReviewSchema(fileId);
}

export async function listShipmentRecords(
  params: { page?: number; size?: number; customerId?: string; taskId?: string; dateFrom?: string; dateTo?: string; reconciliationStatus?: string },
  customers: CustomerConfig[],
) {
  const response = await listShipmentRecordsSchema(params);
  return transformShipmentListSchemaToModel(response, customers);
}

export async function createShipmentRecord(
  draft: ShipmentRecordDraft,
  customers: CustomerConfig[],
): Promise<ShipmentRecord> {
  const response = await createShipmentRecordSchema({
    customerId: draft.customerId,
    sapCustomerCode: draft.sapCustomerCode,
    internalPartNumber: draft.internalPartNumber,
    materialName: draft.materialName || null,
    qty: draft.qty,
    shipmentDate: draft.shipmentDate,
    deliveryNo: draft.deliveryNo || null,
    demandOrderNo: draft.demandOrderNo || null,
    remark: draft.remark || null,
  });
  return transformShipmentSchemaToModel(response, customers);
}

export async function updateShipmentRecord(
  recordId: string,
  draft: ShipmentRecordDraft,
  customers: CustomerConfig[],
): Promise<ShipmentRecord> {
  const response = await updateShipmentRecordSchema(recordId, {
    sapCustomerCode: draft.sapCustomerCode,
    internalPartNumber: draft.internalPartNumber,
    materialName: draft.materialName || null,
    qty: draft.qty,
    shipmentDate: draft.shipmentDate,
    deliveryNo: draft.deliveryNo || null,
    demandOrderNo: draft.demandOrderNo || null,
    remark: draft.remark || null,
  });
  return transformShipmentSchemaToModel(response, customers);
}

export async function deleteShipmentRecord(recordId: string): Promise<void> {
  await deleteShipmentRecordSchema(recordId);
}

export async function listReceiptRecords(
  params: { page?: number; size?: number; customerId?: string; taskId?: string; dateFrom?: string; dateTo?: string; reconciliationStatus?: string },
  customers: CustomerConfig[],
) {
  const response = await listReceiptRecordsSchema(params);
  return transformReceiptListSchemaToModel(response, customers);
}

export async function createReceiptRecord(
  draft: ReceiptRecordDraft,
  customers: CustomerConfig[],
): Promise<ReceiptRecord> {
  const response = await createReceiptRecordSchema({
    customerId: draft.customerId,
    customerType: draft.customerType || "internal",
    internalPartNumber: draft.internalPartNumber,
    materialName: draft.materialName || null,
    qty: draft.qty,
    receiptDate: draft.receiptDate,
    demandOrderNo: draft.demandOrderNo || null,
    remark: draft.remark || null,
  });
  return transformReceiptSchemaToModel(response, customers);
}

export async function updateReceiptRecord(
  recordId: string,
  draft: ReceiptRecordDraft,
  customers: CustomerConfig[],
): Promise<ReceiptRecord> {
  const response = await updateReceiptRecordSchema(recordId, {
    internalPartNumber: draft.internalPartNumber,
    materialName: draft.materialName || null,
    qty: draft.qty,
    receiptDate: draft.receiptDate,
    demandOrderNo: draft.demandOrderNo || null,
    remark: draft.remark || null,
  });
  return transformReceiptSchemaToModel(response, customers);
}

export async function deleteReceiptRecord(recordId: string): Promise<void> {
  await deleteReceiptRecordSchema(recordId);
}

export async function listReconciliationMatches(params: {
  taskId: string;
  shipments: ShipmentRecord[];
  receipts: ReceiptRecord[];
  status?: string;
}): Promise<MatchList> {
  const response = await listReconciliationMatchesSchema(params.taskId, params.status);
  return transformMatchListToModel(response, params.shipments, params.receipts);
}

export async function confirmReconciliationMatch(
  taskId: string,
  matchId: string,
  payload?: { matchedQty?: number | null; remark?: string | null },
) {
  await import("@/api/reconciliation").then(({ confirmReconciliationMatchSchema }) =>
    confirmReconciliationMatchSchema(taskId, matchId, payload),
  );
}

export async function rejectReconciliationMatch(taskId: string, matchId: string) {
  await import("@/api/reconciliation").then(({ rejectReconciliationMatchSchema }) =>
    rejectReconciliationMatchSchema(taskId, matchId),
  );
}

export async function unconfirmReconciliationMatch(taskId: string, matchId: string) {
  await unconfirmReconciliationMatchSchema(taskId, matchId);
}

export async function createManualReconciliationMatch(
  taskId: string,
  payload: { shipmentRecordId: string; receiptRecordId?: string | null; matchedQty: number; remark?: string | null },
) {
  await import("@/api/reconciliation").then(({ createManualReconciliationMatchSchema }) =>
    createManualReconciliationMatchSchema(taskId, payload),
  );
}

export async function remapReconciliationMatchReceipt(
  taskId: string,
  matchId: string,
  payload: { receiptRecordId?: string | null; matchedQty?: number | null; remark?: string | null },
) {
  await remapReconciliationMatchReceiptSchema(taskId, matchId, payload);
}

export async function bulkConfirmReconciliationMatches(
  taskId: string,
  matchIds: string[],
) {
  return bulkConfirmReconciliationMatchesSchema(taskId, { matchIds });
}

export async function getReconciliationMatchSummary(taskId: string): Promise<MatchSummary> {
  const response = await getReconciliationMatchSummarySchema(taskId);
  return transformMatchSummaryToModel(response);
}

export async function listConfigRows(customers: CustomerConfig[]): Promise<ReconciliationConfigRow[]> {
  const entries = await Promise.all(
    customers.map(async (customer) => [customer.id, await listReconciliationSchedulesSchema(customer.id)] as const),
  );
  return buildConfigRows(customers, Object.fromEntries(entries));
}

export async function createReconciliationSchedule(
  customerId: string,
  draft: ReconciliationScheduleDraft,
) {
  return createReconciliationScheduleSchema(customerId, {
    enabled: draft.enabled,
    periodType: draft.periodType,
    periodStartDay: draft.periodStartDay,
    periodEndDay: draft.periodEndDay,
    triggerDay: draft.triggerDay,
    triggerTime: draft.triggerTime,
  });
}

export async function updateReconciliationSchedule(
  customerId: string,
  scheduleId: string,
  draft: ReconciliationScheduleDraft,
) {
  return updateReconciliationScheduleSchema(customerId, scheduleId, {
    enabled: draft.enabled,
    periodType: draft.periodType,
    periodStartDay: draft.periodStartDay,
    periodEndDay: draft.periodEndDay,
    triggerDay: draft.triggerDay,
    triggerTime: draft.triggerTime,
  });
}

export async function deleteReconciliationSchedule(
  customerId: string,
  scheduleId: string,
) {
  await deleteReconciliationScheduleSchema(customerId, scheduleId);
}
