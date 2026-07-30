import {
  cancelTaskSchema,
  getEffectiveRowsSchema,
  patchRowSchema,
  proceedTaskSchema,
  rerunTaskSchema,
} from "@/api/tasks";
import {
  transformEffectiveRowsResponseToModel,
  transformProceedTaskRequestToSchema,
  transformRowPatchRequestToSchema,
  transformRowPatchResponseToModel,
} from "@/lib/transforms/tasks";
import { getInboxWorkspace, type WorkspaceTask } from "./inbox";
import type {
  EffectiveRowsResponse,
  RowPatchResponse,
} from "@/types/models/tasks";

export type {
  AddedTaskRow,
  EffectiveRowsResponse,
  ProceedTaskRequest,
  RowPatchRequest,
  RowPatchResponse,
  TaskStaleState,
} from "@/types/models/tasks";

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
  await proceedTaskSchema(
    taskId,
    transformProceedTaskRequestToSchema({
      resultRevision,
      orderTypeOverrides,
      deletedRowIds,
      addedRows,
    }),
  );
}

export async function patchRow(
  taskId: string,
  rowId: string,
  resultRevision: number,
  changes: Record<string, string | number | null>,
): Promise<RowPatchResponse> {
  const response = await patchRowSchema(
    taskId,
    rowId,
    transformRowPatchRequestToSchema({ resultRevision, changes }),
  );
  return transformRowPatchResponseToModel(response);
}

export async function getEffectiveRows(taskId: string): Promise<EffectiveRowsResponse> {
  const response = await getEffectiveRowsSchema(taskId);
  return transformEffectiveRowsResponseToModel(response);
}

export async function cancelTask(taskId: string): Promise<void> {
  await cancelTaskSchema(taskId);
}

export async function rerunTask(taskId: string): Promise<void> {
  await rerunTaskSchema(taskId);
}
