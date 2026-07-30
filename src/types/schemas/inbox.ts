import type { AgentStep, TraceStep } from "../models/inbox";

export type PendingTaskSummarySchema = {
  task_id?: string;
  taskId?: string;
  file_name?: string;
  fileName?: string;
  customer_name?: string | null;
  customerName?: string | null;
  status: string;
  reason: string;
};

export type WorkspaceAttachmentSchema = {
  attachment_id?: string;
  attachmentId?: string;
  file_artifact_id?: string | null;
  fileArtifactId?: string | null;
  file_name?: string;
  fileName?: string;
  content_type?: string;
  contentType?: string;
  status?: string;
  task_id?: string | null;
  taskId?: string | null;
  document_type?: string | null;
  documentType?: string | null;
};

export type InlineImageSchema = {
  image_id?: string;
  imageId?: string;
  file_artifact_id?: string;
  fileArtifactId?: string;
  content_type?: string;
  contentType?: string;
};

export type WorkspaceMailSchema = {
  mail_id?: string;
  id?: string;
  external_message_id?: string;
  messageId?: string;
  sender?: string;
  fromEmail?: string;
  subject?: string;
  body_text?: string;
  bodyText?: string;
  received_at?: string;
  receivedAt?: string;
  created_at?: string;
  createdAt?: string;
  customer_id?: string | null;
  customerId?: string | null;
  customer_name?: string | null;
  customerName?: string | null;
  attachments?: WorkspaceAttachmentSchema[];
  inline_images?: InlineImageSchema[];
  inlineImages?: InlineImageSchema[];
};

export type TraceStepSchema = {
  step_name?: string;
  stepName?: string;
  status?: string;
  output_summary?: string | null;
  outputSummary?: string | null;
  started_at?: string | null;
  startedAt?: string | null;
  completed_at?: string | null;
  completedAt?: string | null;
};

export type ReviewSummarySchema = {
  review_type?: string;
  reviewType?: string;
  reason?: string;
  blocked_at_step?: string | null;
  blockedAtStep?: string | null;
};

export type WorkspaceTaskSchema = {
  task_id?: string;
  id?: string;
  mail_id?: string;
  mailMessageId?: string;
  attachment_id?: string | null;
  attachmentId?: string | null;
  task_type?: string;
  taskType?: string;
  status?: string;
  pipeline_step?: string | null;
  pipelineStep?: string | null;
  warnings?: string[];
  requested_at?: string | null;
  requestedAt?: string | null;
  completed_at?: string | null;
  completedAt?: string | null;
  trace_steps?: TraceStepSchema[];
  traceSteps?: TraceStep[];
  result_rows?: Record<string, Record<string, unknown>>;
  resultRows?: Record<string, Record<string, unknown>>;
  attachment_file_name?: string;
  attachmentFileName?: string;
  agent_summary?: AgentStep[];
  agentSummary?: AgentStep[];
  result_revision?: number;
  resultRevision?: number;
  review_summary?: ReviewSummarySchema | null;
  reviewSummary?: ReviewSummarySchema | null;
  customer_id?: string | null;
  customerId?: string | null;
  customer_name?: string | null;
  customerName?: string | null;
  received_at?: string | null;
  receivedAt?: string | null;
  mail_created_at?: string | null;
  mailCreatedAt?: string | null;
};

export type InboxWorkspaceSchema = {
  mails: WorkspaceMailSchema[];
  tasks: WorkspaceTaskSchema[];
  stats?: {
    completedCount: number;
    customerCount: number;
    pendingCount: number;
    followUpCount: number;
    mailCount: number;
    customerNames?: string[];
    pendingTasks?: PendingTaskSummarySchema[];
    aiSummary?: {
      title: string;
      detail: string;
    };
  };
};
