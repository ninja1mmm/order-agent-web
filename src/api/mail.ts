import { apiRequest } from "./client";
import type { ProcessMailResponseSchema } from "@/types/schemas/mail";

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
