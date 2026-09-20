import { apiRequest } from "./client";
import type { InboxWorkspaceSchema, InboxMailListRequestParams, InboxMailListResponseSchema } from "@/types/schemas/inbox";

export function getInboxWorkspaceSchema(signal?: AbortSignal): Promise<InboxWorkspaceSchema> {
  return apiRequest<InboxWorkspaceSchema>("/api/inbox/workspace", { signal });
}

export function getInboxMailsSchema(params?: InboxMailListRequestParams): Promise<InboxMailListResponseSchema> {
  const searchParams = new URLSearchParams();
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.size) searchParams.set("size", String(params.size));
  if (params?.customerId) searchParams.set("customerId", params.customerId);
  if (params?.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params?.dateTo) searchParams.set("dateTo", params.dateTo);
  const qs = searchParams.toString();
  return apiRequest<InboxMailListResponseSchema>(`/api/inbox/mails${qs ? `?${qs}` : ""}`);
}
