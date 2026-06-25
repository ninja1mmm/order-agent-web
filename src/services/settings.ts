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

type CustomerRaw = {
  customer_id?: string;
  customer_name?: string;
  customer_code?: string;
  default_owner?: string;
  sender_rules?: Array<{
    rule_id?: string;
    value?: string;
    status?: string;
  }>;
  material_mappings?: Array<{
    mapping_id?: string;
    customer_part_number?: string;
    faurecia_part_number?: string;
    customer_ref?: string;
  }>;
  id?: string;
  name?: string;
  abbreviation?: string;
  code?: string;
  contacts?: Contact[];
  materialMappings?: MaterialMapping[];
  submissionSchedules?: SubmissionSchedule[];
  createdAt?: string | null;
  updatedAt?: string | null;
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

function normalizeCustomer(raw: CustomerRaw): CustomerConfig {
  return {
    id: raw.id ?? raw.customer_id ?? "",
    name: raw.name ?? raw.customer_name ?? "",
    abbreviation: raw.abbreviation ?? raw.customer_code ?? "",
    code: raw.code ?? raw.customer_code ?? "",
    contacts:
      raw.contacts ??
      (raw.sender_rules ?? []).map((rule) => ({
        contactId: rule.rule_id,
        email: rule.value ?? "",
      })),
    materialMappings:
      raw.materialMappings ??
      (raw.material_mappings ?? []).map((mapping) => ({
        mappingId: mapping.mapping_id ?? "",
        customerPartNumber: mapping.customer_part_number ?? "",
        internalPartNumber: mapping.faurecia_part_number ?? "",
        scheduleAgreement: mapping.customer_ref ?? null,
        productType: null,
        productionLine: null,
        oem: null,
        program: null,
        product: null,
        status: "active",
      })),
    submissionSchedules: raw.submissionSchedules ?? [],
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
  };
}

function denormalizeCustomer(payload: Partial<CustomerConfig>) {
  return {
    customer_id: payload.id,
    customer_name: payload.name,
    customer_code: payload.code ?? payload.abbreviation,
    default_owner: "",
    sender_rules: (payload.contacts ?? []).map((contact) => ({
      rule_id: contact.contactId,
      value: contact.email,
      status: "active",
    })),
    material_mappings: (payload.materialMappings ?? []).map((mapping) => ({
      mapping_id: mapping.mappingId,
      customer_part_number: mapping.customerPartNumber,
      faurecia_part_number: mapping.internalPartNumber,
    })),
  };
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
  const result = await apiRequest<{ customers: CustomerRaw[] }>("/api/settings/customers");
  return result.customers.map(normalizeCustomer);
}

export async function createCustomer(payload: Partial<CustomerConfig>): Promise<CustomerConfig> {
  const result = await apiRequest<{ customer: CustomerRaw }>("/api/settings/customers", {
    method: "POST",
    body: JSON.stringify(denormalizeCustomer(payload)),
  });
  return normalizeCustomer(result.customer);
}

export async function updateCustomer(customerId: string, payload: Partial<CustomerConfig>): Promise<CustomerConfig> {
  const result = await apiRequest<{ customer: CustomerRaw }>(`/api/settings/customers/${customerId}`, {
    method: "PUT",
    body: JSON.stringify(denormalizeCustomer(payload)),
  });
  return normalizeCustomer(result.customer);
}

export async function deleteCustomer(customerId: string): Promise<void> {
  await apiRequest(`/api/settings/customers/${customerId}`, { method: "DELETE" });
}

export async function getMailboxSettings(): Promise<MailboxSettings> {
  const result = await apiRequest<{ mailbox: MailboxRaw }>("/api/settings/mailbox");
  return normalizeMailbox(result.mailbox);
}

export async function testMailboxConnection(): Promise<{ ok: boolean; message: string }> {
  return apiRequest("/api/settings/mailbox/test", { method: "POST" });
}
