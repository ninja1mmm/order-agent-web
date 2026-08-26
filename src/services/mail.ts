import { addMailSourceSchema, createManualMailSchema, getMailTasksSchema, processMailSchema, resyncMailSchema, type ResyncResponseSchema } from "@/api/mail";
import { transformProcessMailResponseToModel } from "@/lib/transforms/mail";
import { normalizeMailTaskList } from "@/lib/transforms/inbox";
import type { ProcessMailResponse } from "@/types/models/mail";
import type { MailTaskListResponse } from "@/types/models/inbox";

export type { ProcessMailResponse } from "@/types/models/mail";
export type ResyncResponse = ResyncResponseSchema;

export async function processMail(
  mailId: string,
  attachmentIds?: string[],
): Promise<ProcessMailResponse> {
  const response = await processMailSchema(mailId, attachmentIds);
  return transformProcessMailResponseToModel(response);
}

export function createManualMail(formData: FormData): Promise<unknown> {
  return createManualMailSchema(formData);
}

export function getMailTasks(mailId: string): Promise<MailTaskListResponse> {
  return getMailTasksSchema(mailId).then(normalizeMailTaskList);
}

export function addMailSource(mailId: string, attachmentId: string, targetSheetName: string): Promise<unknown> {
  return addMailSourceSchema(mailId, attachmentId, targetSheetName);
}

export function resyncMail(mailId: string): Promise<ResyncResponse> {
  return resyncMailSchema(mailId);
}
