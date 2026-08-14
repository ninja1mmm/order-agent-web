import type { CustomerConfig } from "./settings";

export type ReconciliationTaskStatus =
  | "draft"
  | "in_progress"
  | "closed"
  | "voided"
  | "cancelled"
  | string;

export type ReconciliationRecordStatus =
  | "unmatched"
  | "partial"
  | "fully_matched"
  | string;

export type EffectiveReconciliationRecordStatus =
  | ReconciliationRecordStatus
  | "partial_confirmed_pending_writeback"
  | "confirmed_pending_writeback";

export type ReconciliationMatchStatus = "candidate" | "confirmed" | "rejected" | string;

export type ReconciliationTask = {
  id: string;
  taskNo: string;
  customerId: string;
  customerName: string;
  periodFrom: string;
  periodTo: string;
  periodLabel: string;
  status: ReconciliationTaskStatus;
  isTransitioning: boolean;
  statusLabel: string;
  statusVariant: "blue" | "green" | "amber" | "red" | "slate";
  creationSource: string;
  totalRecordCount: number;
  matchedRecordCount: number;
  exceptionRecordCount: number;
  remark: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  closedAt: string | null;
  voidReason: string | null;
};

export type ReconciliationTaskList = {
  tasks: ReconciliationTask[];
  total: number;
  page: number;
  size: number;
};

export type ReconciliationTaskCreate = {
  customerId: string;
  periodFrom: string;
  periodTo: string;
  remark: string;
};

export type ReconciliationSchedule = {
  scheduleId: string;
  enabled: boolean;
  periodType: "monthly" | "weekly" | string;
  periodStartDay: number;
  periodEndDay: number | null;
  triggerDay: number;
  triggerTime: string;
  periodLabel: string;
  triggerLabel: string;
};

export type ReconciliationConfigRow = {
  key: string;
  customer: CustomerConfig;
  customerName: string;
  schedule: ReconciliationSchedule | null;
  configured: boolean;
};

export type ReconciliationScheduleDraft = {
  enabled: boolean;
  periodType: "monthly" | "weekly";
  periodStartDay: number;
  periodEndDay: number;
  triggerDay: number;
  triggerTime: string;
};

export type ShipmentRecord = {
  id: string;
  customerId: string;
  customerName: string;
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
  remainingQty: number;
  reconciliationStatus: ReconciliationRecordStatus;
  effectiveReconciliationStatus: EffectiveReconciliationRecordStatus;
  reconciliationStatusLabel: string;
  statusVariant: "blue" | "green" | "amber" | "red" | "slate";
  locked: boolean;
  remark: string | null;
  sourceFileId: string | null;
  updatedAt: string | null;
};

export type ReceiptRecord = {
  id: string;
  customerId: string;
  customerName: string;
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
  remainingQty: number;
  reconciliationStatus: ReconciliationRecordStatus;
  effectiveReconciliationStatus: EffectiveReconciliationRecordStatus;
  reconciliationStatusLabel: string;
  statusVariant: "blue" | "green" | "amber" | "red" | "slate";
  locked: boolean;
  remark: string | null;
  sourceFileId: string | null;
  updatedAt: string | null;
};

export type RecordList<T> = {
  records: T[];
  total: number;
  page: number;
  size: number;
};

export type ShipmentRecordDraft = {
  customerId: string;
  sapCustomerCode: string;
  internalPartNumber: string;
  materialName: string;
  qty: number;
  shipmentDate: string;
  deliveryNo: string;
  demandOrderNo: string;
  remark: string;
};

export type ReceiptRecordDraft = {
  customerId: string;
  customerType: string;
  internalPartNumber: string;
  materialName: string;
  qty: number;
  receiptDate: string;
  demandOrderNo: string;
  remark: string;
};

export type ParsedImportRecord = {
  id: string;
  sourceRowNumber: number;
  recordType: string;
  normalizedData: Record<string, unknown>;
  validationStatus: string;
  validationIssues: Array<Record<string, unknown>>;
  resolution: string | null;
  issueText: string;
};

export type MergeReview = {
  fileId: string;
  totalRows: number;
  validCount: number;
  blockedCount: number;
  ignoredCount: number;
  records: ParsedImportRecord[];
};

export type FileUploadResult = {
  id: string;
  fileName: string;
  fileType: string;
  parseStatus: string;
  parsedRowCount: number;
  createdAt: string | null;
};

export type MergeSummary = {
  inserted: number;
  skipped: number;
  failed: number;
  enriched: number;
  errors: Array<Record<string, unknown>>;
};

export type ShipmentImportReviewRow = {
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
  validationStatus: string;
  resolution: string | null;
  issueText: string | null;
};

export type ShipmentCustomerResolutionItem = {
  sapCustomerCode: string;
  sapCustomerName: string | null;
  rowCount: number;
  resolved: boolean;
  customerId: string | null;
  customerName: string | null;
};

export type ShipmentCustomerResolutionSummary = {
  totalCustomerCodes: number;
  resolvedCustomerCodes: number;
  unresolvedCustomerCodes: number;
  resolvedRowCount: number;
  unresolvedRowCount: number;
  customers: ShipmentCustomerResolutionItem[];
};

export type ShipmentImportReview = {
  shipmentFileId: string;
  mappingFileId: string;
  totalRows: number;
  linkedCount: number;
  missingMappingCount: number;
  blockedCount: number;
  customerResolutionSummary: ShipmentCustomerResolutionSummary;
  rows: ShipmentImportReviewRow[];
};

export type ReceiptImportReviewRow = {
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
  validationStatus: string;
  resolution: string | null;
  issueText: string | null;
};

export type ReceiptImportReview = {
  fileId: string;
  customerId: string | null;
  customerName: string | null;
  totalRows: number;
  validCount: number;
  blockedCount: number;
  ignoredCount: number;
  rows: ReceiptImportReviewRow[];
};

export type ReconciliationMatch = {
  id: string;
  taskId: string;
  shipmentRecordId: string;
  receiptRecordId: string | null;
  matchedQty: number;
  matchType: string;
  matchMethod: string;
  matchMethodLabel: string;
  confidenceScore: number | null;
  status: ReconciliationMatchStatus;
  statusLabel: string;
  statusVariant: "blue" | "green" | "amber" | "red" | "slate";
  remark: string | null;
  shipment: ShipmentRecord | null;
  receipt: ReceiptRecord | null;
  differenceQty: number | null;
  noDifference: boolean;
};

export type MatchDetailRow = {
  key: string;
  kind: "match" | "shipment_unmatched" | "receipt_unmatched";
  match: ReconciliationMatch | null;
  shipment: ShipmentRecord | null;
  receipt: ReceiptRecord | null;
  matchedQty: number | null;
  matchMethod: string;
  matchMethodLabel: string;
  confidenceScore: number | null;
  status: ReconciliationMatchStatus | null;
  statusLabel: string | null;
  statusVariant: "blue" | "green" | "amber" | "red" | "slate" | null;
  resultLabel: string;
  resultVariant: "blue" | "green" | "amber" | "red" | "slate";
};

export type MatchGroup = {
  key: string;
  materialNo: string;
  materialName: string | null;
  shipment: ShipmentRecord | null;
  matches: ReconciliationMatch[];
  rows: MatchDetailRow[];
  candidateCount: number;
  confirmedCount: number;
  rejectedCount: number;
  receiptCount: number;
  hasShipment: boolean;
  hasReceipt: boolean;
  confirmedQty: number;
  pendingQty: number;
  shipmentQty: number;
  receiptQty: number;
  differenceQty: number;
};

export type MatchList = {
  matches: ReconciliationMatch[];
  groups: MatchGroup[];
};

export type MatchSummary = {
  confirmedCount: number;
  pendingShipDeltas: Record<string, number>;
  pendingRecvDeltas: Record<string, number>;
};

export type CommitPreviewRow = {
  id: string;
  side: "shipment" | "receipt";
  recordNo: string;
  recordDate: string | null;
  customerName: string;
  material: string;
  shipmentQty: number | null;
  beforeStatus: string;
  pendingDelta: number | null;
  afterLabel: string;
  afterVariant: "blue" | "green" | "amber" | "red" | "slate";
};
