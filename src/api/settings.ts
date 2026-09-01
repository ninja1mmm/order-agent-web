import { apiRequest } from "./client";
import type {
  CustomerConfigSchema,
  CustomerCreateSchema,
  CustomerListSchema,
  CustomerUpdateSchema,
  MailboxSettingsSchema,
  MailboxSettingsUpdateSchema,
  MailboxSyncResponseSchema,
  MailboxTestResponseSchema,
} from "@/types/schemas/settings";

async function fetchAllCustomerPages(size = 100): Promise<CustomerConfigSchema[]> {
  let page = 1;
  const all: CustomerConfigSchema[] = [];
  for (;;) {
    const response = await apiRequest<CustomerListSchema>(
      `/api/customers/?page=${page}&size=${size}`,
    );
    all.push(...response.customers);
    if (all.length >= response.total) break;
    page++;
  }
  return all;
}

export function listCustomerSchemas(): Promise<CustomerConfigSchema[]> {
  return fetchAllCustomerPages();
}

export function listCustomerPageSchema(page = 1, size = 100): Promise<CustomerListSchema> {
  return apiRequest<CustomerListSchema>(`/api/customers/?page=${page}&size=${size}`);
}

export function createCustomerSchema(
  payload: CustomerCreateSchema,
): Promise<CustomerConfigSchema> {
  return apiRequest<CustomerConfigSchema>("/api/customers/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCustomerSchema(
  customerId: string,
  payload: CustomerUpdateSchema,
): Promise<CustomerConfigSchema> {
  return apiRequest<CustomerConfigSchema>(`/api/customers/${customerId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteCustomerSchema(customerId: string): Promise<void> {
  await apiRequest<void>(`/api/customers/${customerId}`, { method: "DELETE" });
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

export function triggerMailboxSyncSchema(): Promise<MailboxSyncResponseSchema> {
  return apiRequest<MailboxSyncResponseSchema>("/api/settings/mailbox/sync", { method: "POST" });
}
