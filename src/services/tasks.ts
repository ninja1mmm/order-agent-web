import { getInboxWorkspace, type WorkspaceTask } from "./inbox";

export async function getTaskById(taskId: string): Promise<WorkspaceTask | null> {
  const workspace = await getInboxWorkspace();
  return workspace.tasks.find((task) => task.task_id === taskId) ?? null;
}
