import { getInboxWorkspaceSchema } from "@/api/inbox";
import { normalizeInboxWorkspace } from "@/lib/transforms/inbox";
import type { InboxWorkspace } from "@/types/models/inbox";

export type {
  AgentStep,
  AiSummary,
  InboxWorkspace,
  InlineImage,
  PendingTaskSummary,
  ReviewSummary,
  TraceStep,
  WorkspaceAttachment,
  WorkspaceMail,
  WorkspaceStats,
  WorkspaceTask,
} from "@/types/models/inbox";

export function getInboxWorkspace(): Promise<InboxWorkspace> {
  return getInboxWorkspaceSchema().then(normalizeInboxWorkspace);
}
