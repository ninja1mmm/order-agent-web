import { apiRequest } from "../api/client";

type ParseAttachmentResponse = {
  task: { task_id: string; status: string };
};

export async function parseAttachment(attachmentId: string): Promise<ParseAttachmentResponse> {
  return apiRequest<ParseAttachmentResponse>(`/api/mail-attachments/${attachmentId}/parse`, {
    method: "POST",
  });
}

export async function createManualMail(formData: FormData): Promise<unknown> {
  const backend = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://127.0.0.1:8000";
  const response = await fetch(`${backend}/api/manual-mails`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error(`Manual mail create failed: ${response.status}`);
  }
  return response.json();
}
