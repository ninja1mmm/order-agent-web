import { apiRequest } from "./client";
import type { InboxWorkspaceSchema } from "@/types/schemas/inbox";

export function getInboxWorkspaceSchema(): Promise<InboxWorkspaceSchema> {
  return apiRequest<InboxWorkspaceSchema>("/api/inbox/workspace");
}
