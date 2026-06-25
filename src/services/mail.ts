import { apiRequest } from "../api/client";

type ProcessMailResponse = {
  tasks: Array<{ taskId: string; status: string; taskType: string }>;
};

export async function processMail(mailId: string, attachmentIds?: string[]): Promise<ProcessMailResponse> {
  return apiRequest<ProcessMailResponse>(`/api/mail-messages/${mailId}/process`, {
    method: "POST",
    body: JSON.stringify(attachmentIds ? { attachmentIds } : {}),
  });
}

export async function createManualMail(formData: FormData): Promise<unknown> {
  return apiRequest("/api/mail-messages/manual", {
    method: "POST",
    body: formData,
  });
}
