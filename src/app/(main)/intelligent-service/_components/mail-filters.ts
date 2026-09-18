import type { WorkspaceTask } from "@/services/inbox";

export type PendingCategory = "failed" | "review" | "merge";

export type MailFilter =
  | { kind: "category"; category: PendingCategory }
  | { kind: "customer-day"; customerKey: string; customerLabel: string; date: string }
  | null;

export const ACTIVE_MAIL_STATUSES = new Set(["queued", "running", "processing", "waiting_human_decision", "failed"]);

export function mailPendingCategory(tasks: WorkspaceTask[]): PendingCategory | null {
  if (tasks.some((task) => task.status === "failed")) return "failed";
  if (tasks.some((task) => task.status === "waiting_human_decision" && task.pipelineStep !== "ready_to_publish")) return "review";
  if (tasks.some((task) => task.status === "waiting_human_decision")) return "merge";
  return null;
}
