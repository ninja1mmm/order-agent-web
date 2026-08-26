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

export type ResyncResponseSchema = {
  customer_changed: boolean;
  previous_customer_id: string | null;
  new_customer_id: string | null;
  new_attachment_count: number;
  new_attachment_names: string[];
  tasks_created: number;
  message: string;
};

export function resyncMailSchema(mailId: string): Promise<ResyncResponseSchema> {
  return apiRequest<ResyncResponseSchema>(`/api/mail-messages/${mailId}/resync`, {
    method: "POST",
  });
}
