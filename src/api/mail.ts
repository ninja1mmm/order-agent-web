import { apiRequest } from "./client";
import type {
  MailMessageDetailResponseSchema,
  ProcessMailResponseSchema,
  ResyncResponseSchema,
} from "@/types/schemas/mail";
import type {
  MailTaskListResponseSchema,
  MailTaskSummarySchema,
} from "@/types/schemas/inbox";

export function processMailSchema(
  mailId: string,
  attachmentIds?: string[],
): Promise<ProcessMailResponseSchema> {
  return apiRequest<ProcessMailResponseSchema>(`/api/mail-messages/${mailId}/process`, {
    method: "POST",
    body: JSON.stringify(attachmentIds ? { attachmentIds } : {}),
  });
}

export function createManualMailSchema(formData: FormData): Promise<MailMessageDetailResponseSchema> {
  return apiRequest<MailMessageDetailResponseSchema>("/api/mail-messages/manual", {
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
): Promise<MailTaskSummarySchema> {
  return apiRequest<MailTaskSummarySchema>(`/api/mail-messages/${mailId}/tasks/add-source`, {
    method: "POST",
    body: JSON.stringify({ attachmentId, targetSheetName }),
  });
}

export function resyncMailSchema(mailId: string): Promise<ResyncResponseSchema> {
  return apiRequest<ResyncResponseSchema>(`/api/mail-messages/${mailId}/resync`, {
    method: "POST",
  });
}
