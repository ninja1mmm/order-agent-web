import { addMailSourceSchema, createManualMailSchema, getMailTasksSchema, processMailSchema, resyncMailSchema } from "@/api/mail";
import {
  transformCreatedMailResponseToModel,
  transformProcessMailResponseToModel,
  transformResyncResponseToModel,
} from "@/lib/transforms/mail";
import { normalizeMailTaskList, normalizeMailTaskSummary } from "@/lib/transforms/inbox";
import type { CreatedMail, ProcessMailResponse, ResyncResponse } from "@/types/models/mail";
import type { MailTaskListResponse, MailTaskSummary } from "@/types/models/inbox";

export type { CreatedMail, ProcessMailResponse, ResyncResponse } from "@/types/models/mail";

export async function processMail(
  mailId: string,
  attachmentIds?: string[],
): Promise<ProcessMailResponse> {
  const response = await processMailSchema(mailId, attachmentIds);
  return transformProcessMailResponseToModel(response);
}

export async function createManualMail(formData: FormData): Promise<CreatedMail> {
  const response = await createManualMailSchema(formData);
  return transformCreatedMailResponseToModel(response);
}

export function getMailTasks(mailId: string): Promise<MailTaskListResponse> {
  return getMailTasksSchema(mailId).then(normalizeMailTaskList);
}

export async function addMailSource(
  mailId: string,
  attachmentId: string,
  targetSheetName: string,
): Promise<MailTaskSummary> {
  const response = await addMailSourceSchema(mailId, attachmentId, targetSheetName);
  return normalizeMailTaskSummary(response);
}

export async function resyncMail(mailId: string): Promise<ResyncResponse> {
  const response = await resyncMailSchema(mailId);
  return transformResyncResponseToModel(response);
}
