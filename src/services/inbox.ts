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
};

export type WorkspaceTask = {
  id: string;
  mailMessageId: string;
  attachmentId: string | null;
  taskType: string;
  status: string;
  warnings: string[];
  requestedAt?: string | null;
  completedAt?: string | null;
  traceSteps: TraceStep[];
  resultRows: Record<string, Record<string, unknown>>;
  attachmentFileName?: string;
  agentSummary?: AgentStep[];
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
};

type TraceStepRaw = {
  step_name?: string;
  stepName?: string;
  status?: string;
  output_summary?: string | null;
  outputSummary?: string | null;
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
  };
}

function normalizeTraceStep(raw: TraceStepRaw): TraceStep {
  return {
    stepName: raw.stepName ?? raw.step_name ?? "",
    status: raw.status ?? "",
    outputSummary: raw.outputSummary ?? raw.output_summary ?? null,
  };
}

function normalizeTask(raw: WorkspaceTaskRaw): WorkspaceTask {
  return {
    id: raw.id ?? raw.task_id ?? "",
    mailMessageId: raw.mailMessageId ?? raw.mail_id ?? "",
    attachmentId: raw.attachmentId ?? raw.attachment_id ?? null,
    taskType: raw.taskType ?? raw.task_type ?? "",
    status: raw.status ?? "",
    warnings: raw.warnings ?? [],
    requestedAt: raw.requestedAt ?? raw.requested_at ?? null,
    completedAt: raw.completedAt ?? raw.completed_at ?? null,
    traceSteps: (raw.traceSteps ?? raw.trace_steps ?? []).map(normalizeTraceStep),
    resultRows: raw.resultRows ?? raw.result_rows ?? {},
    attachmentFileName: raw.attachmentFileName ?? raw.attachment_file_name,
    agentSummary: raw.agentSummary ?? raw.agent_summary,
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
