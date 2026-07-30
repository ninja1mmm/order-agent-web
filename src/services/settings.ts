import {
  createCustomerSchema,
  deleteCustomerSchema,
  getMailboxSettingsSchema,
  listCustomerSchemas,
  testMailboxConnectionSchema,
  updateCustomerSchema,
  updateMailboxSettingsSchema,
} from "@/api/settings";
import {
  normalizeMailbox,
  transformCustomerConfigModelToSchema,
  transformCustomerConfigSchemaToModel,
  transformMailboxSettingsUpdateToSchema,
} from "@/lib/transforms/settings";
import type {
  CustomerConfig,
  MailboxSettings,
  MailboxSettingsUpdate,
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
  const customer = await createCustomerSchema(transformCustomerConfigModelToSchema(payload));
  return transformCustomerConfigSchemaToModel(customer);
}

export async function updateCustomer(
  customerId: string,
  payload: Partial<CustomerConfig>,
): Promise<CustomerConfig> {
  const customer = await updateCustomerSchema(
    customerId,
    transformCustomerConfigModelToSchema(payload),
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

export function testMailboxConnection(): Promise<MailboxTestResponse> {
  return testMailboxConnectionSchema();
}
