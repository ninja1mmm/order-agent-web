import { apiRequest } from "../api/client";
import { getInboxWorkspace, type WorkspaceTask } from "./inbox";

export async function getTaskById(taskId: string): Promise<WorkspaceTask | null> {
  const workspace = await getInboxWorkspace();
  return workspace.tasks.find((task) => task.id === taskId) ?? null;
}

export async function proceedTask(
  taskId: string,
  resultRevision = 1,
  orderTypeOverrides?: Record<string, string>,
): Promise<void> {
  const body: Record<string, unknown> = { result_revision: resultRevision };
  if (orderTypeOverrides && Object.keys(orderTypeOverrides).length > 0) {
    body.order_type_overrides = orderTypeOverrides;
  }
  await apiRequest(`/api/tasks/${taskId}/proceed`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
