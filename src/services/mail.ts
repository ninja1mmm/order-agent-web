import { createManualMailSchema, processMailSchema } from "@/api/mail";
import { transformProcessMailResponseToModel } from "@/lib/transforms/mail";
import type { ProcessMailResponse } from "@/types/models/mail";

export type { ProcessMailResponse } from "@/types/models/mail";

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
