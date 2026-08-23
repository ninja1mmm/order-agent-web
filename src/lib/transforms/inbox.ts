import type {
  InboxWorkspaceSchema,
  InlineImageSchema,
  InboxMailListResponseSchema,
  InboxMailListMailSchema,
  MailTaskListResponseSchema,
  MailTaskSummarySchema,
  PendingTaskSummarySchema,
  ReviewSummarySchema,
  TraceStepSchema,
  WorkspaceAttachmentSchema,
  WorkspaceAttachmentTaskSummarySchema,
  WorkspaceMailSchema,
  WorkspaceTaskSchema,
} from "@/types/schemas/inbox";
import type {
  InboxMailListResponse,
  InboxWorkspace,
  InlineImage,
  MailTaskListResponse,
  MailTaskSummary,
  PendingTaskSummary,
  ReviewSummary,
  TraceStep,
  WorkspaceAttachment,
  WorkspaceAttachmentTaskSummary,
  WorkspaceMail,
  WorkspaceStats,
  WorkspaceTask,
} from "@/types/models/inbox";

export function normalizePendingTask(task: PendingTaskSummarySchema): PendingTaskSummary {
  return {
    taskId: task.taskId ?? task.task_id ?? "",
    fileName: task.fileName ?? task.file_name ?? "",
    customerName: task.customerName ?? task.customer_name ?? null,
    status: task.status,
    reason: task.reason,
  };
}

export function normalizeAttachment(raw: WorkspaceAttachmentSchema): WorkspaceAttachment {
  return {
    attachmentId: raw.attachmentId ?? raw.attachment_id ?? "",
    fileArtifactId: raw.fileArtifactId ?? raw.file_artifact_id ?? null,
    fileName: raw.fileName ?? raw.file_name ?? "",
    contentType: raw.contentType ?? raw.content_type ?? "",
    status: raw.status ?? "",
    taskId: raw.taskId ?? raw.task_id ?? null,
    documentType: raw.documentType ?? raw.document_type ?? null,
    labels: raw.labels ?? [],
    tasks: (raw.tasks ?? []).map(normalizeAttachmentTaskSummary),
  };
}

export function normalizeInlineImage(raw: InlineImageSchema): InlineImage {
  return {
    imageId: raw.imageId ?? raw.image_id ?? "",
    fileArtifactId: raw.fileArtifactId ?? raw.file_artifact_id ?? "",
    contentType: raw.contentType ?? raw.content_type ?? "",
  };
}

export function normalizeMail(raw: WorkspaceMailSchema): WorkspaceMail {
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
    mailStatus: raw.mailStatus ?? raw.mail_status ?? "pending",
    attachments: (raw.attachments ?? []).map(normalizeAttachment),
    inlineImages: (raw.inlineImages ?? raw.inline_images ?? []).map(normalizeInlineImage),
  };
}

export function normalizeTraceStep(raw: TraceStepSchema): TraceStep {
  return {
    stepName: raw.stepName ?? raw.step_name ?? "",
    status: raw.status ?? "",
    outputSummary: raw.outputSummary ?? raw.output_summary ?? null,
    startedAt: raw.startedAt ?? raw.started_at ?? null,
    completedAt: raw.completedAt ?? raw.completed_at ?? null,
  };
}

export function normalizeReviewSummary(
  raw: ReviewSummarySchema | null | undefined,
): ReviewSummary | null {
  if (!raw) return null;
  return {
    reviewType: raw.reviewType ?? raw.review_type ?? "",
    reason: raw.reason ?? "",
    blockedAtStep: raw.blockedAtStep ?? raw.blocked_at_step ?? null,
  };
}

export function normalizeTask(raw: WorkspaceTaskSchema): WorkspaceTask {
  return {
    id: raw.id ?? raw.task_id ?? "",
    mailMessageId: raw.mailMessageId ?? raw.mail_id ?? "",
    attachmentId: raw.attachmentId ?? raw.attachment_id ?? null,
    targetSheetName: raw.targetSheetName ?? raw.target_sheet_name ?? null,
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

export function normalizeInboxWorkspace(workspace: InboxWorkspaceSchema): InboxWorkspace {
  return {
    mails: workspace.mails.map(normalizeMail),
    tasks: workspace.tasks.map(normalizeTask),
    stats: workspace.stats
      ? {
          ...workspace.stats,
          pendingTasks: workspace.stats.pendingTasks?.map(normalizePendingTask),
        }
      : undefined,
  };
}

// --- Layered API normalizers (mail-workbench) ---

export function normalizeAttachmentTaskSummary(
  raw: WorkspaceAttachmentTaskSummarySchema,
): WorkspaceAttachmentTaskSummary {
  return {
    taskId: raw.taskId ?? raw.task_id ?? "",
    status: raw.status ?? "",
    targetSheetName: raw.targetSheetName ?? raw.target_sheet_name ?? null,
    pipelineStep: raw.pipelineStep ?? raw.pipeline_step ?? null,
    excluded: raw.excluded ?? false,
  };
}

function normalizeMailListMail(raw: InboxMailListMailSchema): WorkspaceMail {
  const receivedAt = raw.receivedAt ?? raw.received_at ?? raw.createdAt ?? raw.created_at ?? "";
  const createdAt = raw.createdAt ?? raw.created_at ?? raw.receivedAt ?? raw.received_at ?? "";
  return {
    id: raw.id ?? "",
    messageId: raw.messageId ?? raw.message_id ?? "",
    fromEmail: raw.fromEmail ?? raw.from_email ?? "",
    subject: raw.subject ?? "",
    bodyText: raw.bodyText ?? raw.body_text ?? "",
    receivedAt,
    createdAt,
    customerId: raw.customerId ?? raw.customer_id ?? null,
    customerName: raw.customerName ?? raw.customer_name ?? null,
    mailStatus: raw.mailStatus ?? raw.mail_status ?? "pending",
    attachments: (raw.attachments ?? []).map((att) => ({
      ...normalizeAttachment(att),
      tasks: (att.tasks ?? []).map(normalizeAttachmentTaskSummary),
    })),
    inlineImages: (raw.inlineImages ?? raw.inline_images ?? []).map(normalizeInlineImage),
  };
}

function normalizeMailListStats(raw: NonNullable<InboxMailListResponseSchema["stats"]>): WorkspaceStats {
  return {
    completedCount: raw.completedCount ?? raw.completed_count ?? 0,
    customerCount: raw.customerCount ?? raw.customer_count ?? 0,
    pendingCount: raw.pendingCount ?? raw.pending_count ?? 0,
    followUpCount: raw.followUpCount ?? raw.follow_up_count ?? 0,
    mailCount: raw.mailCount ?? raw.mail_count ?? 0,
    customerNames: raw.customerNames ?? raw.customer_names,
  };
}

export function normalizeInboxMailList(response: InboxMailListResponseSchema): InboxMailListResponse {
  return {
    page: response.page,
    size: response.size,
    total: response.total,
    mails: response.mails.map(normalizeMailListMail),
    stats: response.stats ? normalizeMailListStats(response.stats) : null,
  };
}

export function normalizeMailTaskSummary(raw: MailTaskSummarySchema): MailTaskSummary {
  return {
    id: raw.id ?? raw.taskId ?? raw.task_id ?? "",
    attachmentId: raw.attachmentId ?? raw.attachment_id ?? null,
    attachmentFileName: raw.attachmentFileName ?? raw.attachment_file_name ?? null,
    taskType: raw.taskType ?? raw.task_type ?? "",
    status: raw.status ?? "",
    pipelineStep: raw.pipelineStep ?? raw.pipeline_step ?? null,
    targetSheetName: raw.targetSheetName ?? raw.target_sheet_name ?? null,
    warnings: raw.warnings ?? [],
    traceSteps: (raw.traceSteps ?? raw.trace_steps ?? []).map(normalizeTraceStep),
    reviewSummary: normalizeReviewSummary(raw.reviewSummary ?? raw.review_summary),
    resultRevision: raw.resultRevision ?? raw.result_revision ?? 1,
    excluded: raw.excluded ?? false,
    customerId: raw.customerId ?? raw.customer_id ?? null,
    customerName: raw.customerName ?? raw.customer_name ?? null,
    requestedAt: raw.requestedAt ?? raw.requested_at ?? "",
    completedAt: raw.completedAt ?? raw.completed_at ?? null,
  };
}

export function normalizeMailTaskList(response: MailTaskListResponseSchema): MailTaskListResponse {
  return {
    mailMessageId: response.mailMessageId ?? response.mail_message_id ?? "",
    tasks: response.tasks.map(normalizeMailTaskSummary),
    total: response.total ?? response.tasks.length,
    attachmentSheets: (response.attachmentSheets ?? response.attachment_sheets ?? []).map((sheet) => ({
      attachmentId: sheet.attachmentId ?? sheet.attachment_id ?? "",
      fileName: sheet.fileName ?? sheet.file_name ?? "",
      availableSheets: sheet.availableSheets ?? sheet.available_sheets ?? [],
    })),
  };
}
