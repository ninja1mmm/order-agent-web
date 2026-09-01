export type ReconciliationTaskStatusSchema =
  | "draft"
  | "in_progress"
  | "closed"
  | "voided"
  | "cancelled";

export type ReconciliationRecordStatusSchema =
  | "unmatched"
  | "partial"
  | "fully_matched"
  | "in_transit"
  | "closed";

export type EffectiveReconciliationRecordStatusSchema =
  | "unmatched"
  | "partial_confirmed_pending_writeback"
  | "confirmed_pending_writeback"
  | "partial"
  | "fully_matched";

export type ReconciliationMatchStatusSchema = "candidate" | "confirmed" | "rejected";

export type ReconciliationTaskCreateSchema = {
  customerId: string;
  periodFrom: string;
  periodTo: string;
  creationSource?: string;
  remark?: string | null;
};

export type ReconciliationTaskResponseSchema = {
  id: string;
  taskNo: string;
  customerId: string;
  periodFrom: string;
  periodTo: string;
  status: ReconciliationTaskStatusSchema;
  isTransitioning: boolean;
  creationSource: string;
  totalRecordCount: number;
  matchedRecordCount: number;
  exceptionRecordCount: number;
  remark: string | null;
  createdBy: string | null;
  closedAt: string | null;
  closedBy: string | null;
  reopenedAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ReconciliationTaskListResponseSchema = {
  tasks: ReconciliationTaskResponseSchema[];
  total: number;
  page: number;
  size: number;
};

export type ReconciliationFileUploadResponseSchema = {
  id: string;
  fileName: string;
  fileType: string;
  parseStatus: string;
  parsedRowCount: number;
  createdAt: string | null;
};

export type ParsedReconciliationRecordSchema = {
  id: string;
  sourceRowNumber: number;
  recordType: string;
  normalizedData: Record<string, unknown>;
  validationStatus: string;
  validationIssues: Array<Record<string, unknown>>;
  resolution: string | null;
};

export type MergeReviewResponseSchema = {
  fileId: string;
  totalRows: number;
  validCount: number;
  blockedCount: number;
  ignoredCount: number;
  records: ParsedReconciliationRecordSchema[];
};

export type ResolutionUpdateSchema = {
  resolution: string;
  resolutionRemark?: string | null;
};

export type MappingSuggestionAcceptSchema = {
  customerPartNumber?: string | null;
  internalPartNumber?: string | null;
};

export type MergeSummaryResponseSchema = {
  inserted: number;
  skipped: number;
  failed: number;
  enriched: number;
  errors: Array<Record<string, unknown>>;
};

export type ShipmentImportReviewRowSchema = {
  parsedRecordId: string;
  sourceRowNumber: number;
  issueCode: string;
  issueLabel: string;
  issueSeverity: "slate" | "amber" | "red" | string;
  importable: boolean;
  sapCustomerCode: string | null;
  sapCustomerName: string | null;
  resolvedCustomerId: string | null;
  resolvedCustomerName: string | null;
  shipmentDate: string | null;
  internalPartNumber: string | null;
  materialName: string | null;
  qty: number | null;
  deliveryNo: string | null;
  demandOrderNo: string | null;
  validationStatus: string | null;
  resolution: string | null;
  issueText: string | null;
};

export type ShipmentCustomerResolutionItemSchema = {
  sapCustomerCode: string;
  sapCustomerName: string | null;
  rowCount: number;
  resolved: boolean;
  customerId: string | null;
  customerName: string | null;
};

export type ShipmentCustomerResolutionSummarySchema = {
  totalCustomerCodes: number;
  resolvedCustomerCodes: number;
  unresolvedCustomerCodes: number;
  resolvedRowCount: number;
  unresolvedRowCount: number;
  customers: ShipmentCustomerResolutionItemSchema[];
};

export type ShipmentImportReviewResponseSchema = {
  shipmentFileId: string;
  mappingFileId: string | null;
  totalRows: number;
  linkedCount: number;
  missingMappingCount: number;
  blockedCount: number;
  customerResolutionSummary: ShipmentCustomerResolutionSummarySchema;
  rows: ShipmentImportReviewRowSchema[];
};

export type ReceiptImportReviewRowSchema = {
  parsedRecordId: string;
  sourceRowNumber: number;
  issueCode: string;
  issueLabel: string;
  issueSeverity: "slate" | "amber" | "red" | string;
  importable: boolean;
  receiptDate: string | null;
  internalPartNumber: string | null;
  customerPartNumber: string | null;
  materialName: string | null;
  qty: number | null;
  demandOrderNo: string | null;
  validationStatus: string | null;
  resolution: string | null;
  issueText: string | null;
};

export type ReceiptImportReviewResponseSchema = {
  fileId: string;
  customerId: string | null;
  customerName: string | null;
  totalRows: number;
  validCount: number;
  blockedCount: number;
  ignoredCount: number;
  rows: ReceiptImportReviewRowSchema[];
};

export type ShipmentRecordCreateSchema = {
  customerId: string;
  sapCustomerCode: string;
  internalPartNumber: string;
  materialName?: string | null;
  qty: number;
  shipmentDate: string;
  deliveryNo?: string | null;
  demandOrderNo?: string | null;
  remark?: string | null;
};

export type ShipmentRecordUpdateSchema = Partial<Omit<ShipmentRecordCreateSchema, "customerId">>;

export type ShipmentRecordResponseSchema = {
  id: string;
  customerId: string;
  sapCustomerCode: string;
  internalPartNumber: string;
  materialName: string | null;
  qty: number;
  shipmentDate: string;
  deliveryNo: string | null;
  demandOrderNo: string | null;
  materialDocNo: string | null;
  adjustmentSeq: number;
  matchedReceiptQty: number;
  pendingMatchedReceiptQty: number;
  activeConfirmedMatchCount: number;
  reconciliationStatus: ReconciliationRecordStatusSchema;
  effectiveReconciliationStatus: EffectiveReconciliationRecordStatusSchema;
  lastReconciledTaskId: string | null;
  remark: string | null;
  status: string;
  sourceFileId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ShipmentRecordListResponseSchema = {
  records: ShipmentRecordResponseSchema[];
  total: number;
  page: number;
  size: number;
};

export type ShipmentRecordListParamsSchema = {
  page?: number;
  size?: number;
  customerId?: string;
  taskId?: string;
  dateFrom?: string;
  dateTo?: string;
  reconciliationStatus?: string;
};

export type ReceiptRecordCreateSchema = {
  customerId: string;
  customerType?: string;
  internalPartNumber: string;
  materialName?: string | null;
  qty: number;
  receiptDate: string;
  demandOrderNo?: string | null;
  remark?: string | null;
};

export type ReceiptRecordUpdateSchema = Partial<Omit<ReceiptRecordCreateSchema, "customerId" | "customerType">>;

export type ReceiptRecordResponseSchema = {
  id: string;
  customerId: string;
  customerType: string;
  internalPartNumber: string;
  materialName: string | null;
  qty: number;
  receiptDate: string;
  demandOrderNo: string | null;
  adjustmentSeq: number;
  matchedShipmentQty: number;
  pendingMatchedShipmentQty: number;
  activeConfirmedMatchCount: number;
  reconciliationStatus: ReconciliationRecordStatusSchema;
  effectiveReconciliationStatus: EffectiveReconciliationRecordStatusSchema;
  lastReconciledTaskId: string | null;
  remark: string | null;
  status: string;
  sourceFileId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ReceiptRecordListResponseSchema = {
  records: ReceiptRecordResponseSchema[];
  total: number;
  page: number;
  size: number;
};

export type ReceiptRecordListParamsSchema = {
  page?: number;
  size?: number;
  customerId?: string;
  taskId?: string;
  dateFrom?: string;
  dateTo?: string;
  reconciliationStatus?: string;
};

export type ReconciliationMatchResponseSchema = {
  id: string;
  taskId: string;
  shipmentRecordId: string;
  receiptRecordId: string | null;
  matchedQty: number;
  matchType: string;
  matchMethod: string;
  confidenceScore: number | null;
  status: ReconciliationMatchStatusSchema;
  remark: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type MatchListResponseSchema = {
  matches: ReconciliationMatchResponseSchema[];
  returnAnnotations: Array<Record<string, unknown>>;
};

export type MatchSummaryResponseSchema = {
  confirmedCount: number;
  pendingShipDeltas: Record<string, number>;
  pendingRecvDeltas: Record<string, number>;
};

export type MatchConfirmRequestSchema = {
  matchedQty?: number | null;
  remark?: string | null;
};

export type MatchReceiptRemapRequestSchema = {
  receiptRecordId?: string | null;
  matchedQty?: number | null;
  remark?: string | null;
};

export type ManualMatchCreateSchema = {
  shipmentRecordId: string;
  receiptRecordId?: string | null;
  matchedQty: number;
  remark?: string | null;
};

export type BulkConfirmRequestSchema = {
  matchIds: string[];
};

export type BulkConfirmResponseSchema = {
  confirmed: number;
};

export type ReconciliationScheduleCreateSchema = {
  enabled?: boolean;
  periodType: "monthly" | "weekly";
  periodStartDay: number;
  periodEndDay?: number | null;
  triggerDay: number;
  triggerTime: string;
};

export type ReconciliationScheduleUpdateSchema = Partial<ReconciliationScheduleCreateSchema> & {
  enabled?: boolean;
};

export type ReconciliationScheduleResponseSchema = {
  scheduleId: string;
  enabled: boolean;
  periodType: "monthly" | "weekly";
  periodStartDay: number;
  periodEndDay: number | null;
  triggerDay: number;
  triggerTime: string;
};
