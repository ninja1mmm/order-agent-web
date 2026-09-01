export type ProcessMailResponseSchema = {
  tasks: Array<{ taskId: string; status: string; taskType: string }>;
};

export type MailAttachmentSchema = {
  attachmentId: string;
  fileName: string;
  contentType: string;
  fileArtifactId: string;
  checksum: string;
};

export type MailRecognitionEvidenceSchema = {
  status: string;
  matchedCustomerId: string | null;
  candidateCustomerIds: string[];
  matchReasons: string[];
  confidence: number | null;
};

export type MailMessageDetailResponseSchema = {
  id: string;
  messageId: string;
  customerId: string | null;
  fromEmail: string;
  subject: string;
  receivedAt: string;
  attachmentCount: number;
  mailStatus: string;
  createdAt: string | null;
  toEmails: string[];
  bodyText: string;
  recognitionEvidence: MailRecognitionEvidenceSchema | null;
  attachments: MailAttachmentSchema[];
};

export type ResyncResponseSchema = {
  customerChanged: boolean;
  previousCustomerId: string | null;
  newCustomerId: string | null;
  newAttachmentCount: number;
  newAttachmentNames: string[];
  tasksCreated: number;
  message: string;
};
