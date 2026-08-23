import { apiRequest } from "./client";
import type {
  AddRowRequestSchema,
  AddRowResponseSchema,
  DeleteRowResponseSchema,
  EffectiveRowsResponseSchema,
  ProceedTaskRequestSchema,
  PublishTaskRequestSchema,
  RowPatchRequestSchema,
  RowPatchResponseSchema,
} from "@/types/schemas/tasks";

export async function proceedTaskSchema(
  taskId: string,
  payload: ProceedTaskRequestSchema,
): Promise<void> {
  await apiRequest(`/api/tasks/${taskId}/proceed`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function patchRowSchema(
  taskId: string,
  rowId: string,
  payload: RowPatchRequestSchema,
): Promise<RowPatchResponseSchema> {
  return apiRequest<RowPatchResponseSchema>(`/api/tasks/${taskId}/rows/${rowId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function addRowSchema(
  taskId: string,
  payload: AddRowRequestSchema,
): Promise<AddRowResponseSchema> {
  return apiRequest<AddRowResponseSchema>(`/api/tasks/${taskId}/rows`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function deleteRowSchema(
  taskId: string,
  rowId: string,
  resultRevision: number,
): Promise<DeleteRowResponseSchema> {
  return apiRequest<DeleteRowResponseSchema>(
    `/api/tasks/${taskId}/rows/${rowId}?result_revision=${resultRevision}`,
    { method: "DELETE" },
  );
}

export async function publishTaskSchema(
  taskId: string,
  payload: PublishTaskRequestSchema,
): Promise<void> {
  await apiRequest(`/api/tasks/${taskId}/publish`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getEffectiveRowsSchema(taskId: string): Promise<EffectiveRowsResponseSchema> {
  return apiRequest<EffectiveRowsResponseSchema>(`/api/tasks/${taskId}/rows`, { method: "GET" });
}

export async function cancelTaskSchema(taskId: string): Promise<void> {
  await apiRequest(`/api/tasks/${taskId}/cancel`, { method: "POST" });
}

export async function deleteSourceTaskSchema(taskId: string): Promise<void> {
  await apiRequest(`/api/tasks/${taskId}`, { method: "DELETE" });
}

export async function rerunTaskSchema(taskId: string): Promise<void> {
  await apiRequest(`/api/tasks/${taskId}/rerun`, { method: "POST" });
}

export async function parseSheetSchema(taskId: string, sheetName: string): Promise<void> {
  await apiRequest(`/api/tasks/${taskId}/parse-sheet`, {
    method: "POST",
    body: JSON.stringify({ sheet_name: sheetName }),
  });
}

export async function setTaskExcludedSchema(taskId: string, excluded: boolean): Promise<void> {
  await apiRequest(`/api/tasks/${taskId}/${excluded ? "exclude" : "include"}`, { method: "POST" });
}

export type BulkMergeStrategy = "replace" | "increment" | "decrement";

export function bulkMergeStrategySchema(
  taskId: string,
  resultRevision: number,
  rowIds: string[],
  mergeStrategy: BulkMergeStrategy,
): Promise<{ resultRevision?: number; result_revision?: number; updatedCount?: number; updated_count?: number }> {
  return apiRequest(`/api/tasks/${taskId}/rows/bulk-strategy`, {
    method: "PATCH",
    body: JSON.stringify({
      result_revision: resultRevision,
      row_ids: rowIds,
      merge_strategy: mergeStrategy,
    }),
  });
}
