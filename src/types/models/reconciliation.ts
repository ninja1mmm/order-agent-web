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
  | "partially_matched"
  | "fully_matched"
  | "closed"
  | string;

export type ReconciliationMatchStatus = "candidate" | "confirmed" | "rejected" | string;

export type ReconciliationTask = {
  id: string;
  taskNo: string;
  customerId: string;
  customerName: string;
  periodFrom: string;
  periodTo: string;
  periodLabel: string;
  shipmentWindowFrom: string | null;
  shipmentWindowTo: string | null;
  shipmentWindowLabel: string;
  status: ReconciliationTaskStatus;
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
  shipmentWindowFrom: string;
  shipmentWindowTo: string;
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
  remainingQty: number;
  reconciliationStatus: ReconciliationRecordStatus;
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
  remainingQty: number;
  reconciliationStatus: ReconciliationRecordStatus;
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

export type ReconciliationMatch = {
  id: string;
  taskId: string;
  shipmentRecordId: string;
  receiptRecordId: string | null;
  matchedQty: number;
  matchType: string;
  matchMethod: string;
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

export type MatchGroup = {
  key: string;
  shipment: ShipmentRecord | null;
  matches: ReconciliationMatch[];
  candidateCount: number;
  confirmedQty: number;
  pendingQty: number;
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
  customerName: string;
  material: string;
  beforeStatus: string;
  pendingDelta: number;
  afterLabel: string;
};
