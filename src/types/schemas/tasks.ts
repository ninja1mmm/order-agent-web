export type TaskStaleStateSchema = {
  pendingReevalSteps: string[];
  staleFieldNames: string[];
};

export type RowPatchResponseSchema = {
  resultRevision: number;
  row: Record<string, unknown>;
  taskStaleState: TaskStaleStateSchema;
};

export type EffectiveRowsResponseSchema = {
  rows: Record<string, Record<string, unknown>>;
  resultRevision: number;
  taskStaleState: TaskStaleStateSchema;
  deletedRowIds: string[];
};

export type AddedTaskRowSchema = {
  customerPartNumber: string;
  quantity: number;
  dateInfo: string;
  dateFormat?: string | null;
};

export type ProceedTaskRequestSchema = {
  resultRevision: number;
  orderTypeOverrides?: Record<string, string>;
  deletedRowIds?: string[];
  addedRows?: AddedTaskRowSchema[];
  restartFromStep?: string | null;
};

export type RowPatchRequestSchema = {
  resultRevision: number;
  changes: Record<string, string | number | null>;
};

export type AddRowRequestSchema = {
  resultRevision: number;
  customerPartNumber: string;
  quantity?: number | null;
  dateInfo?: string | null;
  dateFormat?: string | null;
  classification?: string | null;
};

export type AddRowResponseSchema = {
  resultRevision: number;
  row: Record<string, unknown>;
  taskStaleState: TaskStaleStateSchema;
};

export type DeleteRowResponseSchema = {
  resultRevision: number;
  taskStaleState: TaskStaleStateSchema;
};

export type PublishTaskRequestSchema = {
  resultRevision: number;
};

export type ProcessingTaskStatusSchema =
  | "queued"
  | "processing"
  | "waiting_human_decision"
  | "completed"
  | "failed"
  | "cancelled";

export type ProcessingTaskTypeSchema =
  | "email_body_analysis"
  | "customer_recognition"
  | "classify_document"
  | "extract_forecast"
  | "extract_shipping"
  | "analyze_revision"
  | "mailbox_sync"
  | "order_extraction";

export type ProcessingTraceStepSchema = {
  stepName: string;
  stepType: string;
  status: "started" | "completed" | "completed_with_errors" | "failed";
  inputSummary: string | null;
  outputSummary: string | null;
  warnings: string[];
  startedAt: string;
  completedAt: string | null;
};

export type SourceReferenceSchema = {
  fieldPath: string | null;
  sourceType: "cell" | "region" | "text" | "page";
  attachmentId: string | null;
  sheetName: string | null;
  cellRange: string | null;
  pageNumber: number | null;
  region: Record<string, unknown> | null;
  textSnippet: string | null;
};

export type NormalizedTaskRowSchema = {
  rowId: string;
  customerPartNumber: string | null;
  designation: string | null;
  quantity: number | null;
  dateFormat: string | null;
  dateInfo: string | null;
  classification: string | null;
  sourceFile: string | null;
  sourceLocation: string | null;
  expandedDay: string | null;
  expandedWeek: string | null;
  expandedMonth: string | null;
  conflictFlag: string | null;
  conflictDetails: string | null;
  mergedQuantities: number[] | null;
  internalPartNumber: string | null;
  mappingStatus: string | null;
  mergeStrategy: "replace" | "increment" | "decrement";
  sourceRefs: SourceReferenceSchema[];
};

export type ProcessingTaskDetailResponseSchema = {
  id: string;
  customerId: string | null;
  mailMessageId: string;
  attachmentId: string | null;
  targetSheetName: string | null;
  taskType: ProcessingTaskTypeSchema;
  status: ProcessingTaskStatusSchema;
  pipelineStep: string | null;
  attemptNo: number;
  isLatest: boolean;
  excluded: boolean;
  resultRevision: number;
  publishedResultRevision: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  requestedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
  extractionResult: {
    normalizedRows: NormalizedTaskRowSchema[];
    rawLlmOutput: string | null;
    warnings: string[];
    traceSteps: ProcessingTraceStepSchema[];
  } | null;
  reviewRequest: {
    reviewType: string;
    reason: string;
    context: Record<string, unknown> | null;
    requestedAt: string;
  } | null;
  reviewCommits: Array<{
    commitId: string;
    baseResultRevision: number;
    resultRevision: number;
    authorUserId: string;
    message: string | null;
    changes: Array<{
      rowId: string;
      fieldPath: string;
      oldValue: string | number | null;
      newValue: string | number | null;
      reason: string | null;
    }>;
    createdAt: string;
  }>;
};

export type ReviewResetResponseSchema = {
  resultRevision: number;
};

export type BulkStrategyResponseSchema = {
  resultRevision: number;
  updatedCount: number;
};
