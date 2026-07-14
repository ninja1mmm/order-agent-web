import { apiRequest } from "../api/client";
import { getInboxWorkspace, type WorkspaceTask } from "./inbox";

export interface TaskStaleState {
  pendingReevalSteps: string[];
  staleFieldNames: string[];
}

export interface RowPatchResponse {
  resultRevision: number;
  row: Record<string, unknown>;
  taskStaleState: TaskStaleState;
}

export interface EffectiveRowsResponse {
  rows: Record<string, Record<string, unknown>>;
  resultRevision: number;
  taskStaleState: TaskStaleState;
  deletedRowIds: string[];
}

export async function getTaskById(taskId: string): Promise<WorkspaceTask | null> {
  const workspace = await getInboxWorkspace();
  return workspace.tasks.find((task) => task.id === taskId) ?? null;
}

export async function proceedTask(
  taskId: string,
  resultRevision = 1,
  orderTypeOverrides?: Record<string, string>,
  deletedRowIds?: string[],
  addedRows?: { customer_part_number: string; quantity: number; date_info: string }[],
): Promise<void> {
  const body: Record<string, unknown> = { result_revision: resultRevision };
  if (orderTypeOverrides && Object.keys(orderTypeOverrides).length > 0) {
    body.order_type_overrides = orderTypeOverrides;
  }
  if (deletedRowIds && deletedRowIds.length > 0) {
    body.deleted_row_ids = deletedRowIds;
  }
  if (addedRows && addedRows.length > 0) {
    body.added_rows = addedRows;
  }
  await apiRequest(`/api/tasks/${taskId}/proceed`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function patchRow(
  taskId: string,
  rowId: string,
  resultRevision: number,
  changes: Record<string, string | number | null>,
): Promise<RowPatchResponse> {
  const body = { result_revision: resultRevision, changes };
  return apiRequest<RowPatchResponse>(`/api/tasks/${taskId}/rows/${rowId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function getEffectiveRows(taskId: string): Promise<EffectiveRowsResponse> {
  return apiRequest<EffectiveRowsResponse>(`/api/tasks/${taskId}/rows`, { method: "GET" });
}

export async function cancelTask(taskId: string): Promise<void> {
  await apiRequest(`/api/tasks/${taskId}/cancel`, { method: "POST" });
}

export async function rerunTask(taskId: string): Promise<void> {
  await apiRequest(`/api/tasks/${taskId}/rerun`, { method: "POST" });
}
