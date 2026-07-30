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
};

export type ProceedTaskRequest = {
  resultRevision?: number;
  orderTypeOverrides?: Record<string, string>;
  deletedRowIds?: string[];
  addedRows?: AddedTaskRow[];
};

export type RowPatchRequest = {
  resultRevision: number;
  changes: Record<string, string | number | null>;
};
