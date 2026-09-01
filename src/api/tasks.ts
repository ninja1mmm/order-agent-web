import { apiRequest } from "./client";
import type {
  AddRowRequestSchema,
  AddRowResponseSchema,
  BulkStrategyResponseSchema,
  DeleteRowResponseSchema,
  EffectiveRowsResponseSchema,
  ProcessingTaskDetailResponseSchema,
  ProceedTaskRequestSchema,
  PublishTaskRequestSchema,
  ReviewResetResponseSchema,
  RowPatchRequestSchema,
  RowPatchResponseSchema,
} from "@/types/schemas/tasks";

export async function proceedTaskSchema(
  taskId: string,
  payload: ProceedTaskRequestSchema,
): Promise<ProcessingTaskDetailResponseSchema> {
  return apiRequest<ProcessingTaskDetailResponseSchema>(`/api/tasks/${taskId}/proceed`, {
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
): Promise<ProcessingTaskDetailResponseSchema> {
  return apiRequest<ProcessingTaskDetailResponseSchema>(`/api/tasks/${taskId}/publish`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function resetTaskReviewSchema(
  taskId: string,
  resultRevision: number,
): Promise<ReviewResetResponseSchema> {
  return apiRequest<ReviewResetResponseSchema>(`/api/tasks/${taskId}/review/reset`, {
    method: "POST",
    body: JSON.stringify({ resultRevision }),
  });
}

export function getEffectiveRowsSchema(taskId: string): Promise<EffectiveRowsResponseSchema> {
  return apiRequest<EffectiveRowsResponseSchema>(`/api/tasks/${taskId}/rows`, { method: "GET" });
}

export function cancelTaskSchema(taskId: string): Promise<ProcessingTaskDetailResponseSchema> {
  return apiRequest<ProcessingTaskDetailResponseSchema>(`/api/tasks/${taskId}/cancel`, { method: "POST" });
}

export function rerunTaskSchema(taskId: string): Promise<ProcessingTaskDetailResponseSchema> {
  return apiRequest<ProcessingTaskDetailResponseSchema>(`/api/tasks/${taskId}/rerun`, { method: "POST" });
}

export function setTaskExcludedSchema(
  taskId: string,
  excluded: boolean,
): Promise<ProcessingTaskDetailResponseSchema> {
  return apiRequest<ProcessingTaskDetailResponseSchema>(
    `/api/tasks/${taskId}/${excluded ? "exclude" : "include"}`,
    { method: "POST" },
  );
}

export type BulkMergeStrategy = "replace" | "increment" | "decrement";

export function bulkMergeStrategySchema(
  taskId: string,
  resultRevision: number,
  rowIds: string[],
  mergeStrategy: BulkMergeStrategy,
): Promise<BulkStrategyResponseSchema> {
  return apiRequest<BulkStrategyResponseSchema>(`/api/tasks/${taskId}/rows/actions/bulk-strategy`, {
    method: "PATCH",
    body: JSON.stringify({
      resultRevision,
      rowIds,
      mergeStrategy,
    }),
  });
}
