import { apiRequest } from "../api/client";

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

export type WorkspaceAttachment = {
  attachmentId: string;
  fileArtifactId: string | null;
  fileName: string;
  contentType: string;
  status: string;
  taskId: string | null;
  documentType: string | null;
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

type PendingTaskSummaryRaw = {
  task_id?: string;
  taskId?: string;
  file_name?: string;
  fileName?: string;
  customer_name?: string | null;
  customerName?: string | null;
  status: string;
  reason: string;
};

type WorkspaceAttachmentRaw = {
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

type InlineImageRaw = {
  image_id?: string;
  imageId?: string;
  file_artifact_id?: string;
  fileArtifactId?: string;
  content_type?: string;
  contentType?: string;
};

type WorkspaceMailRaw = {
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
  attachments?: WorkspaceAttachmentRaw[];
  inline_images?: InlineImageRaw[];
  inlineImages?: InlineImageRaw[];
};

type TraceStepRaw = {
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

type ReviewSummaryRaw = {
  review_type?: string;
  reviewType?: string;
  reason?: string;
  blocked_at_step?: string | null;
  blockedAtStep?: string | null;
};

type WorkspaceTaskRaw = {
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
  trace_steps?: TraceStepRaw[];
  traceSteps?: TraceStep[];
  result_rows?: Record<string, Record<string, unknown>>;
  resultRows?: Record<string, Record<string, unknown>>;
  attachment_file_name?: string;
  attachmentFileName?: string;
  agent_summary?: AgentStep[];
  agentSummary?: AgentStep[];
  result_revision?: number;
  resultRevision?: number;
  review_summary?: ReviewSummaryRaw | null;
  reviewSummary?: ReviewSummaryRaw | null;
  customer_id?: string | null;
  customerId?: string | null;
  customer_name?: string | null;
  customerName?: string | null;
  received_at?: string | null;
  receivedAt?: string | null;
  mail_created_at?: string | null;
  mailCreatedAt?: string | null;
};

function normalizePendingTask(task: PendingTaskSummaryRaw): PendingTaskSummary {
  return {
    taskId: task.taskId ?? task.task_id ?? "",
    fileName: task.fileName ?? task.file_name ?? "",
    customerName: task.customerName ?? task.customer_name ?? null,
    status: task.status,
    reason: task.reason,
  };
}

function normalizeAttachment(raw: WorkspaceAttachmentRaw): WorkspaceAttachment {
  const attachmentId = raw.attachmentId ?? raw.attachment_id ?? "";
  return {
    attachmentId,
    fileArtifactId: raw.fileArtifactId ?? raw.file_artifact_id ?? null,
    fileName: raw.fileName ?? raw.file_name ?? "",
    contentType: raw.contentType ?? raw.content_type ?? "",
    status: raw.status ?? "",
    taskId: raw.taskId ?? raw.task_id ?? null,
    documentType: raw.documentType ?? raw.document_type ?? null,
  };
}

function normalizeInlineImage(raw: InlineImageRaw): InlineImage {
  return {
    imageId: raw.imageId ?? raw.image_id ?? "",
    fileArtifactId: raw.fileArtifactId ?? raw.file_artifact_id ?? "",
    contentType: raw.contentType ?? raw.content_type ?? "",
  };
}

function normalizeMail(raw: WorkspaceMailRaw): WorkspaceMail {
  const receivedAt = raw.receivedAt ?? raw.received_at ?? raw.createdAt ?? raw.created_at ?? "";
  const createdAt = raw.createdAt ?? raw.created_at ?? raw.receivedAt ?? raw.received_at ?? "";
  return {
    id: raw.id ?? raw.mail_id ?? "",
    messageId: raw.messageId ?? raw.external_message_id ?? "",
    fromEmail: raw.fromEmail ?? raw.sender ?? "",
    subject: raw.subject ?? "",
    bodyText: raw.bodyText ?? raw.body_text ?? "",
    receivedAt,
    createdAt,
    customerId: raw.customerId ?? raw.customer_id ?? null,
    customerName: raw.customerName ?? raw.customer_name ?? null,
    attachments: (raw.attachments ?? []).map(normalizeAttachment),
    inlineImages: (raw.inlineImages ?? raw.inline_images ?? []).map(normalizeInlineImage),
  };
}

function normalizeTraceStep(raw: TraceStepRaw): TraceStep {
  return {
    stepName: raw.stepName ?? raw.step_name ?? "",
    status: raw.status ?? "",
    outputSummary: raw.outputSummary ?? raw.output_summary ?? null,
    startedAt: raw.startedAt ?? raw.started_at ?? null,
    completedAt: raw.completedAt ?? raw.completed_at ?? null,
  };
}

function normalizeReviewSummary(raw: ReviewSummaryRaw | null | undefined): ReviewSummary | null {
  if (!raw) return null;
  return {
    reviewType: raw.reviewType ?? raw.review_type ?? "",
    reason: raw.reason ?? "",
    blockedAtStep: raw.blockedAtStep ?? raw.blocked_at_step ?? null,
  };
}

function normalizeTask(raw: WorkspaceTaskRaw): WorkspaceTask {
  return {
    id: raw.id ?? raw.task_id ?? "",
    mailMessageId: raw.mailMessageId ?? raw.mail_id ?? "",
    attachmentId: raw.attachmentId ?? raw.attachment_id ?? null,
    taskType: raw.taskType ?? raw.task_type ?? "",
    status: raw.status ?? "",
    pipelineStep: raw.pipelineStep ?? raw.pipeline_step ?? null,
    warnings: raw.warnings ?? [],
    requestedAt: raw.requestedAt ?? raw.requested_at ?? null,
    completedAt: raw.completedAt ?? raw.completed_at ?? null,
    traceSteps: (raw.traceSteps ?? raw.trace_steps ?? []).map(normalizeTraceStep),
    resultRows: raw.resultRows ?? raw.result_rows ?? {},
    resultRevision: raw.resultRevision ?? raw.result_revision ?? 1,
    attachmentFileName: raw.attachmentFileName ?? raw.attachment_file_name,
    agentSummary: raw.agentSummary ?? raw.agent_summary,
    reviewSummary: normalizeReviewSummary(raw.reviewSummary ?? raw.review_summary),
    customerId: raw.customerId ?? raw.customer_id ?? null,
    customerName: raw.customerName ?? raw.customer_name ?? null,
    receivedAt: raw.receivedAt ?? raw.received_at ?? null,
    mailCreatedAt: raw.mailCreatedAt ?? raw.mail_created_at ?? null,
  };
}

export function getInboxWorkspace(): Promise<InboxWorkspace> {
  return apiRequest<{
    mails: WorkspaceMailRaw[];
    tasks: WorkspaceTaskRaw[];
    stats?: Omit<WorkspaceStats, "pendingTasks"> & {
      pendingTasks?: PendingTaskSummaryRaw[];
    };
  }>("/api/inbox/workspace").then((workspace) => ({
    mails: workspace.mails.map(normalizeMail),
    tasks: workspace.tasks.map(normalizeTask),
    stats: workspace.stats
      ? {
          ...workspace.stats,
          pendingTasks: workspace.stats.pendingTasks?.map(normalizePendingTask),
        }
      : undefined,
  }));
}
