import { apiRequest } from "../api/client";

export type Contact = {
  contactId?: string;
  email: string;
};

export type MaterialMapping = {
  mappingId: string;
  customerPartNumber: string;
  internalPartNumber: string;
  scheduleAgreement: string | null;
  productType: string | null;
  productionLine: string | null;
  oem: string | null;
  program: string | null;
  product: string | null;
  status: string;
};

export type SubmissionSchedule = {
  scheduleId: string;
  documentType: string;
  expectedDay: number;
  graceHours: number;
  enabled: boolean;
};

export type CustomerConfig = {
  id: string;
  name: string;
  abbreviation: string;
  code: string;
  contacts: Contact[];
  materialMappings: MaterialMapping[];
  submissionSchedules: SubmissionSchedule[];
  createdAt: string | null;
  updatedAt: string | null;
};

export type MailboxSettings = {
  address: string;
  providerType: string;
  host: string;
  port: number;
  syncIntervalSeconds: number;
  enabled: boolean;
  connected: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  lastReceived: number;
  lastCreated: number;
  lastSkipped: number;
};

type MailboxRaw = {
  address?: string;
  provider_type?: string;
  providerType?: string;
  host?: string;
  port?: number;
  sync_interval_seconds?: number;
  syncIntervalSeconds?: number;
  enabled?: boolean;
  connected?: boolean;
  last_sync_at?: string | null;
  lastSyncAt?: string | null;
  last_error?: string | null;
  lastError?: string | null;
  last_received?: number;
  lastReceived?: number;
  last_created?: number;
  lastCreated?: number;
  last_skipped?: number;
  lastSkipped?: number;
};

async function fetchAllPages<T>(
  path: string, key: string, size = 100
): Promise<T[]> {
  let page = 1;
  const all: T[] = [];
  for (;;) {
    const res = await apiRequest<Record<string, unknown>>(
      `${path}?page=${page}&size=${size}`
    );
    const items = (res[key] ?? []) as T[];
    all.push(...items);
    if (all.length >= (res.total as number)) break;
    page++;
  }
  return all;
}

function normalizeMailbox(raw: MailboxRaw): MailboxSettings {
  return {
    address: raw.address ?? "",
    providerType: raw.providerType ?? raw.provider_type ?? "",
    host: raw.host ?? "",
    port: raw.port ?? 0,
    syncIntervalSeconds: raw.syncIntervalSeconds ?? raw.sync_interval_seconds ?? 0,
    enabled: raw.enabled ?? false,
    connected: raw.connected ?? false,
    lastSyncAt: raw.lastSyncAt ?? raw.last_sync_at ?? null,
    lastError: raw.lastError ?? raw.last_error ?? null,
    lastReceived: raw.lastReceived ?? raw.last_received ?? 0,
    lastCreated: raw.lastCreated ?? raw.last_created ?? 0,
    lastSkipped: raw.lastSkipped ?? raw.last_skipped ?? 0,
  };
}

export async function listCustomers(): Promise<CustomerConfig[]> {
  return fetchAllPages<CustomerConfig>("/api/customers/", "customers");
}

export async function createCustomer(payload: Partial<CustomerConfig>): Promise<CustomerConfig> {
  return apiRequest<CustomerConfig>("/api/customers/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCustomer(customerId: string, payload: Partial<CustomerConfig>): Promise<CustomerConfig> {
  return apiRequest<CustomerConfig>(`/api/customers/${customerId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteCustomer(customerId: string): Promise<void> {
  await apiRequest(`/api/customers/${customerId}`, { method: "DELETE" });
}

export async function getMailboxSettings(): Promise<MailboxSettings> {
  const result = await apiRequest<{ mailbox: MailboxRaw }>("/api/settings/mailbox");
  return normalizeMailbox(result.mailbox);
}

export async function testMailboxConnection(): Promise<{ ok: boolean; message: string }> {
  return apiRequest("/api/settings/mailbox/test", { method: "POST" });
}
