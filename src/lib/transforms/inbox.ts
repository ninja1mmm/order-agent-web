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
    taskId: task.taskId,
    fileName: task.fileName ?? "",
    customerName: task.customerName,
    status: task.status,
    reason: task.reason,
  };
}

export function normalizeAttachment(raw: WorkspaceAttachmentSchema): WorkspaceAttachment {
  return {
    attachmentId: raw.attachmentId,
    fileArtifactId: raw.fileArtifactId,
    fileName: raw.fileName,
    contentType: raw.contentType,
    status: raw.status,
    taskId: raw.taskId,
    taskStatus: raw.taskStatus,
    documentType: raw.documentType,
    labels: raw.labels,
    tasks: raw.tasks.map(normalizeAttachmentTaskSummary),
  };
}

export function normalizeInlineImage(raw: InlineImageSchema): InlineImage {
  return {
    imageId: raw.imageId,
    contentId: raw.contentId ?? null,
    fileArtifactId: raw.fileArtifactId,
    contentType: raw.contentType,
  };
}

export function normalizeMail(raw: WorkspaceMailSchema): WorkspaceMail {
  return {
    id: raw.id,
    messageId: raw.messageId,
    fromEmail: raw.fromEmail,
    subject: raw.subject,
    bodyText: raw.bodyText,
    bodyHtml: raw.bodyHtml ?? "",
    receivedAt: raw.receivedAt,
    createdAt: raw.createdAt ?? raw.receivedAt,
    customerId: raw.customerId,
    customerName: raw.customerName,
    mailStatus: raw.mailStatus,
    processingState: raw.processingState,
    focusTaskId: raw.focusTaskId,
    pendingCategory: raw.pendingCategory,
    attachments: raw.attachments.map(normalizeAttachment),
    inlineImages: raw.inlineImages.map(normalizeInlineImage),
  };
}

export function normalizeTraceStep(raw: TraceStepSchema): TraceStep {
  return {
    stepName: raw.stepName,
    status: raw.status,
    outputSummary: raw.outputSummary,
    startedAt: raw.startedAt,
    completedAt: raw.completedAt,
  };
}

export function normalizeReviewSummary(
  raw: ReviewSummarySchema | null | undefined,
): ReviewSummary | null {
  if (!raw) return null;
  return {
    reviewType: raw.reviewType,
    reason: raw.reason,
    blockedAtStep: raw.blockedAtStep,
  };
}

export function normalizeTask(raw: WorkspaceTaskSchema): WorkspaceTask {
  return {
    id: raw.id,
    mailMessageId: raw.mailMessageId,
    attachmentId: raw.attachmentId,
    targetSheetName: raw.targetSheetName,
    taskType: raw.taskType,
    status: raw.status,
    documentType: raw.documentType,
    pipelineStep: raw.pipelineStep,
    warnings: raw.warnings,
    requestedAt: raw.requestedAt,
    completedAt: raw.completedAt,
    traceSteps: raw.traceSteps.map(normalizeTraceStep),
    resultRows: raw.resultRows,
    resultRevision: raw.resultRevision,
    attachmentFileName: raw.attachmentFileName,
    agentSummary: raw.agentSummary,
    reviewSummary: normalizeReviewSummary(raw.reviewSummary),
    customerId: raw.customerId,
    customerName: raw.customerName,
    receivedAt: raw.receivedAt,
    mailCreatedAt: raw.mailCreatedAt,
  };
}

export function normalizeInboxWorkspace(workspace: InboxWorkspaceSchema): InboxWorkspace {
  return {
    mails: workspace.mails.map(normalizeMail),
    tasks: workspace.tasks.map(normalizeTask),
    stats: {
      ...workspace.stats,
      pendingTasks: workspace.stats.pendingTasks.map(normalizePendingTask),
    },
  };
}

// --- Layered inbox API normalizers ---

export function normalizeAttachmentTaskSummary(
  raw: WorkspaceAttachmentTaskSummarySchema,
): WorkspaceAttachmentTaskSummary {
  return {
    taskId: raw.taskId,
    status: raw.status,
    targetSheetName: raw.targetSheetName,
    pipelineStep: raw.pipelineStep,
    excluded: raw.excluded,
  };
}

function normalizeMailListMail(raw: InboxMailListMailSchema): WorkspaceMail {
  return normalizeMail(raw);
}

function normalizeMailListStats(raw: NonNullable<InboxMailListResponseSchema["stats"]>): WorkspaceStats {
  return {
    completedCount: raw.completedCount,
    customerCount: raw.customerCount,
    pendingCount: raw.pendingCount,
    followUpCount: raw.followUpCount,
    mailCount: raw.mailCount,
    notStartedMailCount: raw.notStartedMailCount,
    processingMailCount: raw.processingMailCount,
    completedMailCount: raw.completedMailCount,
    failedMailCount: raw.failedMailCount,
    reviewMailCount: raw.reviewMailCount,
    mergeMailCount: raw.mergeMailCount,
    customerNames: raw.customerNames,
    pendingTasks: raw.pendingTasks.map(normalizePendingTask),
    aiSummary: raw.aiSummary,
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
    id: raw.id,
    attachmentId: raw.attachmentId,
    attachmentFileName: raw.attachmentFileName,
    taskType: raw.taskType,
    status: raw.status,
    pipelineStep: raw.pipelineStep,
    targetSheetName: raw.targetSheetName,
    warnings: raw.warnings,
    traceSteps: raw.traceSteps.map(normalizeTraceStep),
    reviewSummary: normalizeReviewSummary(raw.reviewSummary),
    resultRevision: raw.resultRevision,
    excluded: raw.excluded,
    customerId: raw.customerId,
    customerName: raw.customerName,
    requestedAt: raw.requestedAt,
    completedAt: raw.completedAt,
  };
}

export function normalizeMailTaskList(response: MailTaskListResponseSchema): MailTaskListResponse {
  return {
    mailMessageId: response.mailMessageId,
    tasks: response.tasks.map(normalizeMailTaskSummary),
    total: response.total,
    attachmentSheets: response.attachmentSheets.map((sheet) => ({
      attachmentId: sheet.attachmentId,
      fileName: sheet.fileName,
      availableSheets: sheet.availableSheets,
    })),
  };
}
