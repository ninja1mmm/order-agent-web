import type {
  CustomerConfigSchema,
  CustomerCreateSchema,
  CustomerUpdateSchema,
  MailboxSettingsSchema,
  MailboxSettingsUpdateSchema,
  MailboxSyncResponseSchema,
  MailboxTestResponseSchema,
} from "@/types/schemas/settings";
import type {
  CustomerConfig,
  MailboxSettings,
  MailboxSyncResponse,
  MailboxSettingsUpdate,
  MailboxTestResponse,
} from "@/types/models/settings";

export function transformCustomerConfigSchemaToModel(
  customer: CustomerConfigSchema,
): CustomerConfig {
  return {
    id: customer.id,
    name: customer.name,
    abbreviation: customer.abbreviation,
    code: customer.code,
    customerServiceRep: customer.customerServiceRep,
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
      deliveryLocation: mapping.deliveryLocation,
      status: mapping.status,
    })),
    submissionSchedules: customer.submissionSchedules ?? [],
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}

export function transformCustomerConfigModelToCreateSchema(
  customer: Partial<CustomerConfig>,
): CustomerCreateSchema {
  return {
    name: customer.name ?? "",
    abbreviation: customer.abbreviation ?? "",
    code: customer.code ?? "",
    customerServiceRep: customer.customerServiceRep ?? null,
  };
}

export function transformCustomerConfigModelToUpdateSchema(
  customer: Partial<CustomerConfig>,
): CustomerUpdateSchema {
  return {
    name: customer.name,
    abbreviation: customer.abbreviation,
    code: customer.code,
    customerServiceRep: customer.customerServiceRep,
    contacts: customer.contacts?.map(({ name, email }) => ({ name, email })),
    materialMappings: customer.materialMappings?.map(({ mappingId: _mappingId, ...mapping }) => mapping),
    submissionSchedules: customer.submissionSchedules?.map(({ scheduleId: _scheduleId, ...schedule }) => schedule),
  };
}

export function normalizeMailbox(raw: MailboxSettingsSchema): MailboxSettings {
  return {
    address: raw.address,
    providerType: raw.providerType,
    host: raw.host,
    port: raw.port,
    syncIntervalSeconds: raw.syncIntervalSeconds,
    syncWindowDays: raw.syncWindowDays,
    enabled: raw.enabled,
    connected: raw.connected ?? false,
    lastSyncAt: raw.lastSyncAt,
    lastError: raw.lastError,
    lastReceived: raw.lastReceived,
    lastCreated: raw.lastCreated,
    lastSkipped: raw.lastSkipped,
  };
}

export function transformMailboxSettingsUpdateToSchema(
  payload: MailboxSettingsUpdate,
): MailboxSettingsUpdateSchema {
  const body: MailboxSettingsUpdateSchema = {};
  if (payload.syncWindowDays !== undefined) body.syncWindowDays = payload.syncWindowDays;
  if (payload.syncIntervalSeconds !== undefined) {
    body.syncIntervalSeconds = payload.syncIntervalSeconds;
  }
  return body;
}

export function transformMailboxTestResponseToModel(
  response: MailboxTestResponseSchema,
): MailboxTestResponse {
  return response;
}

export function transformMailboxSyncResponseToModel(
  response: MailboxSyncResponseSchema,
): MailboxSyncResponse {
  return response;
}
