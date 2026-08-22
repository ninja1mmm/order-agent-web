export type AiSummary = {
  title: string;
  detail: string;
};

export type PendingTaskSummary = {
  taskId: string;
  fileName: string;
  customerName: string | null;
  status: string;
  reason: string;
};

export type WorkspaceStats = {
  completedCount: number;
  customerCount: number;
  pendingCount: number;
  followUpCount: number;
  mailCount: number;
  customerNames?: string[];
  pendingTasks?: PendingTaskSummary[];
  aiSummary?: AiSummary;
};

export type WorkspaceAttachmentTaskSummary = {
  taskId: string;
  status: string;
  targetSheetName?: string | null;
  pipelineStep?: string | null;
};

export type WorkspaceAttachment = {
  attachmentId: string;
  fileArtifactId: string | null;
  fileName: string;
  contentType: string;
  status: string;
  taskId: string | null;
  documentType: string | null;
  tasks?: WorkspaceAttachmentTaskSummary[];
};

export type InlineImage = {
  imageId: string;
  fileArtifactId: string;
  contentType: string;
};

export type WorkspaceMail = {
  id: string;
  messageId: string;
  fromEmail: string;
  subject: string;
  bodyText: string;
  receivedAt: string;
  createdAt: string;
  customerId: string | null;
  customerName: string | null;
  attachments: WorkspaceAttachment[];
  inlineImages: InlineImage[];
};

export type AgentStep = {
  title: string;
  description: string;
  status: string;
};

export type TraceStep = {
  stepName: string;
  status: string;
  outputSummary: string | null;
  startedAt: string | null;
  completedAt: string | null;
};

export type ReviewSummary = {
  reviewType: string;
  reason: string;
  blockedAtStep: string | null;
};

export type WorkspaceTask = {
  id: string;
  mailMessageId: string;
  attachmentId: string | null;
  targetSheetName?: string | null;
  taskType: string;
  status: string;
  pipelineStep: string | null;
  warnings: string[];
  requestedAt?: string | null;
  completedAt?: string | null;
  traceSteps: TraceStep[];
  resultRows: Record<string, Record<string, unknown>>;
  attachmentFileName?: string;
  agentSummary?: AgentStep[];
  resultRevision: number;
  reviewSummary: ReviewSummary | null;
  customerId?: string | null;
  customerName?: string | null;
  receivedAt?: string | null;
  mailCreatedAt?: string | null;
};

export type InboxWorkspace = {
  mails: WorkspaceMail[];
  tasks: WorkspaceTask[];
  stats?: WorkspaceStats;
};

// --- Layered API types (mail-workbench) ---

export type MailTaskSummary = {
  id: string;
  attachmentId: string | null;
  attachmentFileName: string | null;
  taskType: string;
  status: string;
  pipelineStep: string | null;
  targetSheetName: string | null;
  warnings: string[];
  traceSteps: TraceStep[];
  reviewSummary: ReviewSummary | null;
  resultRevision: number;
  customerId: string | null;
  customerName: string | null;
  requestedAt: string;
  completedAt: string | null;
};

export type MailTaskListResponse = {
  mailMessageId: string;
  tasks: MailTaskSummary[];
};

export type InboxMailListResponse = {
  page: number;
  size: number;
  total: number;
  mails: WorkspaceMail[];
  stats: WorkspaceStats | null;
};
