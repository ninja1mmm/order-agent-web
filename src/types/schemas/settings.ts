export type ContactSchema = {
  contactId: string;
  name: string | null;
  email: string;
};

export type MaterialMappingSchema = {
  mappingId: string;
  customerPartNumber: string;
  internalPartNumber: string;
  scheduleAgreement: string | null;
  productType: string | null;
  productionLine: string | null;
  oem: string | null;
  program: string | null;
  designation: string | null;
  deliveryLocation: string | null;
  status: "active" | "inactive";
};

export type SubmissionScheduleSchema = {
  scheduleId: string;
  documentType: "sales_forecast" | "shipping_plan";
  expectedDay: number;
  graceHours: number;
  enabled: boolean;
};

export type CustomerConfigSchema = {
  id: string;
  name: string;
  abbreviation: string;
  code: string;
  customerServiceRep: string | null;
  contacts: ContactSchema[];
  materialMappings: MaterialMappingSchema[];
  submissionSchedules: SubmissionScheduleSchema[];
  createdAt: string | null;
  updatedAt: string | null;
};

export type CustomerListSchema = {
  customers: CustomerConfigSchema[];
  total: number;
  page: number;
  size: number;
};

export type CustomerCreateSchema = {
  name: string;
  abbreviation: string;
  code: string;
  customerServiceRep?: string | null;
};

export type CustomerUpdateSchema = Partial<CustomerCreateSchema> & {
  contacts?: Array<{ name?: string | null; email: string }>;
  materialMappings?: Array<Omit<MaterialMappingSchema, "mappingId">>;
  submissionSchedules?: Array<Omit<SubmissionScheduleSchema, "scheduleId">>;
};

export type MailboxSettingsSchema = {
  address: string;
  providerType: string;
  host: string;
  port: number;
  syncIntervalSeconds: number;
  syncWindowDays: number;
  enabled: boolean;
  connected: boolean | null;
  lastSyncAt: string | null;
  lastError: string | null;
  lastReceived: number;
  lastCreated: number;
  lastSkipped: number;
};

export type MailboxSettingsUpdateSchema = {
  syncWindowDays?: number;
  syncIntervalSeconds?: number;
};

export type MailboxTestResponseSchema = {
  ok: boolean;
  message: string;
};

export type MailboxSyncResponseSchema = {
  message: string;
};
