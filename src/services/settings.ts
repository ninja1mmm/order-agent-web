import {
  createCustomerSchema,
  deleteCustomerSchema,
  getMailboxSettingsSchema,
  listCustomerSchemas,
  testMailboxConnectionSchema,
  triggerMailboxSyncSchema,
  updateCustomerSchema,
  updateMailboxSettingsSchema,
} from "@/api/settings";
import {
  normalizeMailbox,
  transformCustomerConfigModelToCreateSchema,
  transformCustomerConfigModelToUpdateSchema,
  transformCustomerConfigSchemaToModel,
  transformMailboxSyncResponseToModel,
  transformMailboxSettingsUpdateToSchema,
  transformMailboxTestResponseToModel,
} from "@/lib/transforms/settings";
import type {
  CustomerConfig,
  MailboxSettings,
  MailboxSettingsUpdate,
  MailboxSyncResponse,
  MailboxTestResponse,
} from "@/types/models/settings";

export type {
  Contact,
  CustomerConfig,
  MailboxSettings,
  MaterialMapping,
  SubmissionSchedule,
} from "@/types/models/settings";

export async function listCustomers(): Promise<CustomerConfig[]> {
  const customers = await listCustomerSchemas();
  return customers.map(transformCustomerConfigSchemaToModel);
}

export async function createCustomer(
  payload: Partial<CustomerConfig>,
): Promise<CustomerConfig> {
  const customer = await createCustomerSchema(transformCustomerConfigModelToCreateSchema(payload));
  return transformCustomerConfigSchemaToModel(customer);
}

export async function updateCustomer(
  customerId: string,
  payload: Partial<CustomerConfig>,
): Promise<CustomerConfig> {
  const customer = await updateCustomerSchema(
    customerId,
    transformCustomerConfigModelToUpdateSchema(payload),
  );
  return transformCustomerConfigSchemaToModel(customer);
}

export async function deleteCustomer(customerId: string): Promise<void> {
  await deleteCustomerSchema(customerId);
}

export async function getMailboxSettings(): Promise<MailboxSettings> {
  const result = await getMailboxSettingsSchema();
  return normalizeMailbox(result);
}

export async function updateMailboxSettings(
  payload: MailboxSettingsUpdate,
): Promise<MailboxSettings> {
  const result = await updateMailboxSettingsSchema(
    transformMailboxSettingsUpdateToSchema(payload),
  );
  return normalizeMailbox(result);
}

export async function testMailboxConnection(): Promise<MailboxTestResponse> {
  const response = await testMailboxConnectionSchema();
  return transformMailboxTestResponseToModel(response);
}

export async function triggerMailboxSync(): Promise<MailboxSyncResponse> {
  const response = await triggerMailboxSyncSchema();
  return transformMailboxSyncResponseToModel(response);
}
