export type ProcessMailResponse = {
  tasks: Array<{ taskId: string; status: string; taskType: string }>;
};

export type CreatedMail = {
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
  recognitionEvidence: {
    status: string;
    matchedCustomerId: string | null;
    candidateCustomerIds: string[];
    matchReasons: string[];
    confidence: number | null;
  } | null;
  attachments: Array<{
    attachmentId: string;
    fileName: string;
    contentType: string;
    fileArtifactId: string;
    checksum: string;
  }>;
};

export type ResyncResponse = {
  customerChanged: boolean;
  previousCustomerId: string | null;
  newCustomerId: string | null;
  newAttachmentCount: number;
  newAttachmentNames: string[];
  tasksCreated: number;
  message: string;
};
