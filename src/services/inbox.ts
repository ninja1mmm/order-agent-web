import { getInboxWorkspaceSchema, getInboxMailsSchema } from "@/api/inbox";
import { normalizeInboxWorkspace, normalizeInboxMailList } from "@/lib/transforms/inbox";
import type { InboxMailListResponse, InboxWorkspace } from "@/types/models/inbox";
import type { InboxMailListRequestParams } from "@/types/schemas/inbox";

export type {
  AgentStep,
  AiSummary,
  InboxMailListResponse,
  InboxWorkspace,
  InlineImage,
  MailTaskListResponse,
  MailTaskSummary,
  PendingTaskSummary,
  ReviewSummary,
  TraceStep,
  WorkspaceAttachment,
  WorkspaceAttachmentTaskSummary,
  WorkspaceMail,
  WorkspaceStats,
  WorkspaceTask,
} from "@/types/models/inbox";

export function getInboxWorkspace(signal?: AbortSignal): Promise<InboxWorkspace> {
  return getInboxWorkspaceSchema(signal).then(normalizeInboxWorkspace);
}

export function getInboxMails(params?: InboxMailListRequestParams): Promise<InboxMailListResponse> {
  return getInboxMailsSchema(params).then(normalizeInboxMailList);
}
