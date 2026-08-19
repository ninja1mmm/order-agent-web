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
  customer_part_number: string;
  quantity: number;
  date_info: string;
};

export type ProceedTaskRequestSchema = {
  result_revision: number;
  order_type_overrides?: Record<string, string>;
  deleted_row_ids?: string[];
  added_rows?: AddedTaskRowSchema[];
};

export type RowPatchRequestSchema = {
  result_revision: number;
  changes: Record<string, string | number | null>;
};

export type AddRowRequestSchema = {
  result_revision: number;
  customer_part_number: string;
  quantity?: number | null;
  date_info?: string | null;
  date_format?: string | null;
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
  result_revision: number;
};
