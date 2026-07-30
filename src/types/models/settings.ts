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
  designation: string | null;
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
  syncWindowDays: number;
  enabled: boolean;
  connected: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  lastReceived: number;
  lastCreated: number;
  lastSkipped: number;
};

export type MailboxSettingsUpdate = {
  syncWindowDays?: number;
  syncIntervalSeconds?: number;
};

export type MailboxTestResponse = {
  ok: boolean;
  message: string;
};
