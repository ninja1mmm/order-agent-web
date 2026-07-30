export type ContactSchema = {
  contactId?: string;
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
  status: string;
};

export type SubmissionScheduleSchema = {
  scheduleId: string;
  documentType: string;
  expectedDay: number;
  graceHours: number;
  enabled: boolean;
};

export type CustomerConfigSchema = {
  id: string;
  name: string;
  abbreviation: string;
  code: string;
  contacts: ContactSchema[];
  materialMappings: MaterialMappingSchema[];
  submissionSchedules: SubmissionScheduleSchema[];
  createdAt: string | null;
  updatedAt: string | null;
};

export type CustomerListSchema = {
  customers: CustomerConfigSchema[];
  total: number;
};

export type MailboxSettingsSchema = {
  address?: string;
  provider_type?: string;
  providerType?: string;
  host?: string;
  port?: number;
  sync_interval_seconds?: number;
  syncIntervalSeconds?: number;
  sync_window_days?: number;
  syncWindowDays?: number;
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

export type MailboxSettingsUpdateSchema = {
  sync_window_days?: number;
  sync_interval_seconds?: number;
};

export type MailboxTestResponseSchema = {
  ok: boolean;
  message: string;
};
