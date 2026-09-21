import type {
  MailMessageDetailResponseSchema,
  ProcessMailResponseSchema,
  ResyncResponseSchema,
} from "@/types/schemas/mail";
import type {
  CreatedMail,
  ProcessMailResponse,
  ResyncResponse,
} from "@/types/models/mail";

export function transformProcessMailResponseToModel(
  response: ProcessMailResponseSchema,
): ProcessMailResponse {
  return response;
}

export function transformCreatedMailResponseToModel(
  response: MailMessageDetailResponseSchema,
): CreatedMail {
  return {
    id: response.id,
    messageId: response.messageId,
    customerId: response.customerId,
    fromEmail: response.fromEmail,
    subject: response.subject,
    receivedAt: response.receivedAt,
    attachmentCount: response.attachmentCount,
    mailStatus: response.mailStatus,
    createdAt: response.createdAt,
    toEmails: response.toEmails,
    bodyText: response.bodyText,
    recognitionEvidence: response.recognitionEvidence,
    attachments: response.attachments,
  };
}

export function transformResyncResponseToModel(
  response: ResyncResponseSchema,
): ResyncResponse {
  return {
    ...response,
    repairedInlineImageCount: response.repairedInlineImageCount ?? 0,
  };
}
