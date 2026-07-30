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
