import type {
  CustomerConfigSchema,
  MailboxSettingsSchema,
  MailboxSettingsUpdateSchema,
} from "@/types/schemas/settings";
import type {
  CustomerConfig,
  MailboxSettings,
  MailboxSettingsUpdate,
} from "@/types/models/settings";

export function transformCustomerConfigSchemaToModel(
  customer: CustomerConfigSchema,
): CustomerConfig {
  return {
    id: customer.id,
    name: customer.name,
    abbreviation: customer.abbreviation,
    code: customer.code,
    customerServiceRep: customer.customerServiceRep ?? customer.customer_service_rep ?? null,
    contacts: (customer.contacts ?? []).map((contact) => ({
      contactId: contact.contactId,
      name: contact.name ?? null,
      email: contact.email,
    })),
    materialMappings: (customer.materialMappings ?? []).map((mapping) => ({
      mappingId: mapping.mappingId,
      customerPartNumber: mapping.customerPartNumber,
      internalPartNumber: mapping.internalPartNumber,
      scheduleAgreement: mapping.scheduleAgreement,
      productType: mapping.productType,
      productionLine: mapping.productionLine,
      oem: mapping.oem,
      program: mapping.program,
      designation: mapping.designation,
      deliveryLocation: mapping.deliveryLocation ?? mapping.delivery_location ?? null,
      status: mapping.status,
    })),
    submissionSchedules: customer.submissionSchedules ?? [],
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}

export function transformCustomerConfigModelToSchema(
  customer: Partial<CustomerConfig>,
): Partial<CustomerConfigSchema> {
  return customer;
}

export function normalizeMailbox(raw: MailboxSettingsSchema): MailboxSettings {
  return {
    address: raw.address ?? "",
    providerType: raw.providerType ?? raw.provider_type ?? "",
    host: raw.host ?? "",
    port: raw.port ?? 0,
    syncIntervalSeconds: raw.syncIntervalSeconds ?? raw.sync_interval_seconds ?? 0,
    syncWindowDays: raw.syncWindowDays ?? raw.sync_window_days ?? 30,
    enabled: raw.enabled ?? false,
    connected: raw.connected ?? false,
    lastSyncAt: raw.lastSyncAt ?? raw.last_sync_at ?? null,
    lastError: raw.lastError ?? raw.last_error ?? null,
    lastReceived: raw.lastReceived ?? raw.last_received ?? 0,
    lastCreated: raw.lastCreated ?? raw.last_created ?? 0,
    lastSkipped: raw.lastSkipped ?? raw.last_skipped ?? 0,
  };
}

export function transformMailboxSettingsUpdateToSchema(
  payload: MailboxSettingsUpdate,
): MailboxSettingsUpdateSchema {
  const body: MailboxSettingsUpdateSchema = {};
  if (payload.syncWindowDays !== undefined) body.sync_window_days = payload.syncWindowDays;
  if (payload.syncIntervalSeconds !== undefined) {
    body.sync_interval_seconds = payload.syncIntervalSeconds;
  }
  return body;
}
