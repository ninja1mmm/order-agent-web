export type TraceStepSchema = {
  stepName: string;
  status: string;
  outputSummary: string | null;
  startedAt: string | null;
  completedAt: string | null;
};

export type ReviewSummarySchema = {
  reviewType: string;
  reason: string;
  blockedAtStep: string | null;
};

export type AgentStepSchema = {
  title: string;
  description: string;
  status: string;
};

export type PendingTaskSummarySchema = {
  taskId: string;
  fileName: string | null;
  customerName: string | null;
  status: string;
  reason: string | null;
};

export type WorkspaceAttachmentTaskSummarySchema = {
  taskId: string;
  status: string;
  targetSheetName: string | null;
  pipelineStep: string | null;
  excluded: boolean;
};

export type WorkspaceAttachmentSchema = {
  attachmentId: string;
  fileArtifactId: string | null;
  fileName: string;
  contentType: string;
  taskId: string | null;
  taskStatus: string | null;
  documentType: string | null;
  status: string;
  labels: string[];
  tasks: WorkspaceAttachmentTaskSummarySchema[];
};

export type InlineImageSchema = {
  imageId: string;
  contentId?: string | null;
  fileArtifactId: string;
  contentType: string;
};

export type MailProcessingStateSchema = "not_started" | "processing" | "completed";
export type PendingMailCategorySchema = "failed" | "review" | "merge";

export type WorkspaceMailSchema = {
  id: string;
  messageId: string;
  customerId: string | null;
  fromEmail: string;
  subject: string;
  receivedAt: string;
  mailStatus: string;
  processingState: MailProcessingStateSchema;
  focusTaskId: string | null;
  pendingCategory: PendingMailCategorySchema | null;
  attachments: WorkspaceAttachmentSchema[];
  bodyText: string;
  bodyHtml: string;
  inlineImages: InlineImageSchema[];
  customerName: string | null;
  createdAt: string | null;
};

export type WorkspaceTaskSchema = {
  id: string;
  mailMessageId: string;
  attachmentId: string | null;
  targetSheetName: string | null;
  taskType: string;
  status: string;
  documentType: string | null;
  pipelineStep: string | null;
  customerId: string | null;
  requestedAt: string;
  warnings: string[];
  traceSteps: TraceStepSchema[];
  resultRows: Record<string, Record<string, unknown>>;
  agentSummary: AgentStepSchema[] | null;
  reviewSummary: ReviewSummarySchema | null;
  resultRevision: number;
  attachmentFileName: string | null;
  customerName: string | null;
  receivedAt: string | null;
  mailCreatedAt: string | null;
  completedAt: string | null;
};

export type InboxStatsSchema = {
  completedCount: number;
  customerCount: number;
  pendingCount: number;
  followUpCount: number;
  mailCount: number;
  notStartedMailCount: number;
  processingMailCount: number;
  completedMailCount: number;
  failedMailCount: number;
  reviewMailCount: number;
  mergeMailCount: number;
  customerNames: string[];
  pendingTasks: PendingTaskSummarySchema[];
  aiSummary: { title: string; detail: string } | null;
};

export type InboxWorkspaceSchema = {
  mails: WorkspaceMailSchema[];
  tasks: WorkspaceTaskSchema[];
  stats: InboxStatsSchema;
};

export type InboxMailListRequestParams = {
  page?: number;
  size?: number;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
  processingState?: MailProcessingStateSchema;
  pendingCategory?: PendingMailCategorySchema;
};

export type InboxMailListMailSchema = WorkspaceMailSchema;

export type InboxMailListResponseSchema = {
  page: number;
  size: number;
  total: number;
  mails: InboxMailListMailSchema[];
  stats: InboxStatsSchema | null;
};

export type MailTaskSummarySchema = {
  id: string;
  attachmentId: string | null;
  attachmentFileName: string | null;
  taskType: string;
  status: string;
  pipelineStep: string | null;
  targetSheetName: string | null;
  warnings: string[];
  traceSteps: TraceStepSchema[];
  reviewSummary: ReviewSummarySchema | null;
  resultRevision: number;
  excluded: boolean;
  customerId: string | null;
  customerName: string | null;
  requestedAt: string;
  completedAt: string | null;
};

export type AttachmentSheetInfoSchema = {
  attachmentId: string;
  fileName: string;
  availableSheets: string[];
};

export type MailTaskListResponseSchema = {
  mailMessageId: string;
  tasks: MailTaskSummarySchema[];
  total: number;
  attachmentSheets: AttachmentSheetInfoSchema[];
};
