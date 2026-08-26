import { apiRequest } from "./client";
import type {
  CustomerConfigSchema,
  CustomerListSchema,
  MailboxSettingsSchema,
  MailboxSettingsUpdateSchema,
  MailboxTestResponseSchema,
} from "@/types/schemas/settings";

async function fetchAllPages<T>(path: string, key: string, size = 100): Promise<T[]> {
  let page = 1;
  const all: T[] = [];
  for (;;) {
    const res = await apiRequest<Record<string, unknown>>(
      `${path}?page=${page}&size=${size}`,
    );
    const items = (res[key] ?? []) as T[];
    all.push(...items);
    if (all.length >= (res.total as number)) break;
    page++;
  }
  return all;
}

export function listCustomerSchemas(): Promise<CustomerConfigSchema[]> {
  return fetchAllPages<CustomerConfigSchema>("/api/customers/", "customers");
}

export function listCustomerPageSchema(page = 1, size = 100): Promise<CustomerListSchema> {
  return apiRequest<CustomerListSchema>(`/api/customers/?page=${page}&size=${size}`);
}

export function createCustomerSchema(
  payload: Partial<CustomerConfigSchema>,
): Promise<CustomerConfigSchema> {
  return apiRequest<CustomerConfigSchema>("/api/customers/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCustomerSchema(
  customerId: string,
  payload: Partial<CustomerConfigSchema>,
): Promise<CustomerConfigSchema> {
  return apiRequest<CustomerConfigSchema>(`/api/customers/${customerId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteCustomerSchema(customerId: string): Promise<void> {
  await apiRequest(`/api/customers/${customerId}`, { method: "DELETE" });
}

export function getMailboxSettingsSchema(): Promise<MailboxSettingsSchema> {
  return apiRequest<MailboxSettingsSchema>("/api/settings/mailbox");
}

export function updateMailboxSettingsSchema(
  payload: MailboxSettingsUpdateSchema,
): Promise<MailboxSettingsSchema> {
  return apiRequest<MailboxSettingsSchema>("/api/settings/mailbox", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function testMailboxConnectionSchema(): Promise<MailboxTestResponseSchema> {
  return apiRequest<MailboxTestResponseSchema>("/api/settings/mailbox/test", { method: "POST" });
}

export function triggerMailboxSyncSchema(): Promise<{ message: string }> {
  return apiRequest<{ message: string }>("/api/settings/mailbox/sync", { method: "POST" });
}
