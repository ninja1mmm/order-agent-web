import { apiRequest } from "../api/client";

type ProcessMailResponse = {
  tasks: Array<{ taskId: string; status: string; taskType: string }>;
};

export async function processMail(mailId: string, attachmentIds?: string[]): Promise<ProcessMailResponse> {
  const ids = attachmentIds ?? [];
  const results = await Promise.all(
    ids.map((attachmentId) =>
      apiRequest<{
        task?: { task_id?: string; taskId?: string; status?: string; task_type?: string; taskType?: string };
      }>(`/api/mail-attachments/${attachmentId}/parse`, {
        method: "POST",
      }),
    ),
  );

  return {
    tasks: results
      .map((result) => result.task)
      .filter((task): task is NonNullable<typeof task> => Boolean(task))
      .map((task) => ({
        taskId: task.taskId ?? task.task_id ?? "",
        status: task.status ?? "",
        taskType: task.taskType ?? task.task_type ?? "",
      })),
  };
}

export async function createManualMail(formData: FormData): Promise<unknown> {
  return apiRequest("/api/manual-mails", {
    method: "POST",
    body: formData,
  });
}
