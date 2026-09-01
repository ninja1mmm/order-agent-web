export type TaskStaleState = {
  pendingReevalSteps: string[];
  staleFieldNames: string[];
};

export type RowPatchResponse = {
  resultRevision: number;
  row: Record<string, unknown>;
  taskStaleState: TaskStaleState;
};

export type EffectiveRowsResponse = {
  rows: Record<string, Record<string, unknown>>;
  resultRevision: number;
  taskStaleState: TaskStaleState;
  deletedRowIds: string[];
};

export type AddedTaskRow = {
  customer_part_number: string;
  quantity: number;
  date_info: string;
  date_format?: string | null;
};

export type ProceedTaskRequest = {
  resultRevision?: number;
  orderTypeOverrides?: Record<string, string>;
  deletedRowIds?: string[];
  addedRows?: AddedTaskRow[];
  restartFromStep?: string | null;
};

export type RowPatchRequest = {
  resultRevision: number;
  changes: Record<string, string | number | null>;
};

export type AddRowRequest = {
  resultRevision: number;
  customerPartNumber: string;
  quantity?: number | null;
  dateInfo?: string | null;
  dateFormat?: string | null;
  classification?: string | null;
};

export type AddRowResponse = {
  resultRevision: number;
  row: Record<string, unknown>;
  taskStaleState: TaskStaleState;
};

export type DeleteRowResponse = {
  resultRevision: number;
  taskStaleState: TaskStaleState;
};
