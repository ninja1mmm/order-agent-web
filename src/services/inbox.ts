import { apiRequest } from "../api/client";

export type AiSummary = {
  title: string;
  detail: string;
};

export type PendingTaskSummary = {
  task_id: string;
  file_name: string;
  customer_name: string | null;
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
  attachment_id: string;
  file_name: string;
  content_type: string;
  status: string;
  task_id: string | null;
};

export type WorkspaceMail = {
  mail_id: string;
  sender: string;
  subject: string;
  body_text: string;
  received_at: string;
  customer_id: string | null;
  customer_name: string | null;
  attachments: WorkspaceAttachment[];
};

export type AgentStep = {
  title: string;
  description: string;
  status: string;
};

export type WorkspaceTask = {
  task_id: string;
  mail_id: string;
  attachment_id: string | null;
  task_type: string;
  status: string;
  warnings: string[];
  trace_steps: Array<{
    step_name: string;
    status: string;
    output_summary: string | null;
  }>;
  result_rows: Record<string, Record<string, unknown>>;
  attachment_file_name?: string;
  agent_summary?: AgentStep[];
  customer_name?: string | null;
  received_at?: string | null;
};

export type InboxWorkspace = {
  mails: WorkspaceMail[];
  tasks: WorkspaceTask[];
  selectedMail: WorkspaceMail | null;
  stats?: WorkspaceStats;
};

export function getInboxWorkspace(): Promise<InboxWorkspace> {
  return apiRequest<InboxWorkspace>("/api/inbox/workspace");
}
