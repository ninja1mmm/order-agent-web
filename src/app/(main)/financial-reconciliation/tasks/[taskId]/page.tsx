import { TaskDetailPage } from "../../_components/task-detail-page";

export const dynamic = "force-dynamic";

export default async function ReconciliationTaskDetailRoutePage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;
  return <TaskDetailPage taskId={taskId} />;
}
