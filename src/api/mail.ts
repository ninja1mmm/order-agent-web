import { apiRequest } from "./client";
import type { ProcessMailResponseSchema } from "@/types/schemas/mail";
import type { MailTaskListResponseSchema } from "@/types/schemas/inbox";

export function processMailSchema(
  mailId: string,
  attachmentIds?: string[],
): Promise<ProcessMailResponseSchema> {
  return apiRequest<ProcessMailResponseSchema>(`/api/mail-messages/${mailId}/process`, {
    method: "POST",
    body: JSON.stringify(attachmentIds ? { attachmentIds } : {}),
  });
}

export function createManualMailSchema(formData: FormData): Promise<unknown> {
  return apiRequest("/api/mail-messages/manual", {
    method: "POST",
    body: formData,
  });
}

export function getMailTasksSchema(mailId: string): Promise<MailTaskListResponseSchema> {
  return apiRequest<MailTaskListResponseSchema>(`/api/mail-messages/${mailId}/tasks`);
}

export function addMailSourceSchema(
  mailId: string,
  attachmentId: string,
  targetSheetName: string,
): Promise<unknown> {
  return apiRequest(`/api/mail-messages/${mailId}/tasks/add-source`, {
    method: "POST",
    body: JSON.stringify({ attachment_id: attachmentId, target_sheet_name: targetSheetName }),
  });
}
