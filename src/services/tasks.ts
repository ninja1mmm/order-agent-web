import {
  addRowSchema,
  cancelTaskSchema,
  deleteSourceTaskSchema,
  deleteRowSchema,
  getEffectiveRowsSchema,
  parseSheetSchema,
  patchRowSchema,
  proceedTaskSchema,
  publishTaskSchema,
  rerunTaskSchema,
  setTaskExcludedSchema,
  bulkMergeStrategySchema,
  type BulkMergeStrategy,
} from "@/api/tasks";
import {
  transformEffectiveRowsResponseToModel,
  transformProceedTaskRequestToSchema,
  transformRowPatchRequestToSchema,
  transformRowPatchResponseToModel,
} from "@/lib/transforms/tasks";
import { getInboxWorkspace, type WorkspaceTask } from "./inbox";
import type {
  AddRowResponse,
  DeleteRowResponse,
  EffectiveRowsResponse,
  RowPatchResponse,
} from "@/types/models/tasks";

export type {
  AddedTaskRow,
  AddRowResponse,
  DeleteRowResponse,
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

export async function addRow(
  taskId: string,
  resultRevision: number,
  customerPartNumber: string,
  quantity?: number | null,
  dateInfo?: string | null,
  dateFormat?: string | null,
  classification?: string | null,
): Promise<AddRowResponse> {
  const response = await addRowSchema(taskId, {
    result_revision: resultRevision,
    customer_part_number: customerPartNumber,
    quantity,
    date_info: dateInfo,
    date_format: dateFormat,
    classification,
  });
  return response;
}

export async function deleteRow(
  taskId: string,
  rowId: string,
  resultRevision: number,
): Promise<DeleteRowResponse> {
  const response = await deleteRowSchema(taskId, rowId, resultRevision);
  return response;
}

export async function publishTask(
  taskId: string,
  resultRevision: number,
): Promise<void> {
  await publishTaskSchema(taskId, { result_revision: resultRevision });
}

export async function cancelTask(taskId: string): Promise<void> {
  await cancelTaskSchema(taskId);
}

export async function deleteSourceTask(taskId: string): Promise<void> {
  await deleteSourceTaskSchema(taskId);
}

export async function rerunTask(taskId: string): Promise<void> {
  await rerunTaskSchema(taskId);
}

export async function parseSheet(taskId: string, sheetName: string): Promise<void> {
  await parseSheetSchema(taskId, sheetName);
}

export async function setTaskExcluded(taskId: string, excluded: boolean): Promise<void> {
  await setTaskExcludedSchema(taskId, excluded);
}

export async function bulkMergeStrategy(
  taskId: string,
  resultRevision: number,
  rowIds: string[],
  mergeStrategy: BulkMergeStrategy,
): Promise<{ resultRevision: number; updatedCount: number }> {
  const response = await bulkMergeStrategySchema(taskId, resultRevision, rowIds, mergeStrategy);
  return {
    resultRevision: response.resultRevision ?? response.result_revision ?? resultRevision,
    updatedCount: response.updatedCount ?? response.updated_count ?? 0,
  };
}

export type { BulkMergeStrategy } from "@/api/tasks";
