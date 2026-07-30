import { apiRequest } from "./client";
import type {
  EffectiveRowsResponseSchema,
  ProceedTaskRequestSchema,
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

export function getEffectiveRowsSchema(taskId: string): Promise<EffectiveRowsResponseSchema> {
  return apiRequest<EffectiveRowsResponseSchema>(`/api/tasks/${taskId}/rows`, { method: "GET" });
}

export async function cancelTaskSchema(taskId: string): Promise<void> {
  await apiRequest(`/api/tasks/${taskId}/cancel`, { method: "POST" });
}

export async function rerunTaskSchema(taskId: string): Promise<void> {
  await apiRequest(`/api/tasks/${taskId}/rerun`, { method: "POST" });
}
