import type { WorkspaceMail, WorkspaceTask } from "@/services/inbox";
import {
  backendDateMs,
  translatePipelineSummary,
} from "../../_components/shared";
import {
  TILE_COLUMNS,
  type TimelineEntry,
} from "./sc-agent-types";

const PIPELINE_STEPS_LOCAL = [
  "extraction",
  "date_expansion",
  "conflict_resolution",
  "material_mapping",
  "published",
] as const;

const STEP_LABELS_LOCAL: Record<string, string> = {
  extraction: "AI 提取",
  date_expansion: "日期扩展",
  conflict_resolution: "冲突检测",
  material_mapping: "料号匹配",
  published: "已发布",
};

export function compactText(value: string, limit = 200) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > limit
    ? `${normalized.slice(0, limit)}...`
    : normalized;
}

export function taskNeedsHuman(task: WorkspaceTask) {
  const status = task.status.toLowerCase();
  return (
    status.includes("pending") ||
    status.includes("review") ||
    status.includes("manual") ||
    status.includes("waiting") ||
    task.warnings.length > 0
  );
}

export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const ms = backendDateMs(dateStr);
  if (!ms) return "-";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return `${Math.floor(diff / 86_400_000)} 天前`;
}

export function buildTimeline(task: WorkspaceTask): TimelineEntry[] {
  const traceMap = new Map<string, (typeof task.traceSteps)[number]>();
  for (const step of task.traceSteps) {
    traceMap.set(step.stepName, step);
  }
  const currentStep = task.pipelineStep;
  const currentIdx = currentStep
    ? PIPELINE_STEPS_LOCAL.indexOf(currentStep as (typeof PIPELINE_STEPS_LOCAL)[number])
    : -1;
  const isCompleted =
    task.status === "completed" || task.status === "published";
  const isWaiting = task.status === "waiting_human_decision";
  const isFailed = task.status === "failed";

  return PIPELINE_STEPS_LOCAL.map((key, index) => {
    const traceEntry = traceMap.get(key);
    const label = STEP_LABELS_LOCAL[key] ?? key;
    let state: TimelineEntry["state"] = "pending";
    let reviewReason: string | null = null;

    const isBlockedHere =
      isWaiting && task.reviewSummary?.blockedAtStep === key;

    if (isBlockedHere) {
      state = "review";
      reviewReason = task.reviewSummary?.reason ?? null;
    } else if (isCompleted) {
      state = "completed";
    } else if (traceEntry) {
      state =
        traceEntry.status === "completed" ||
        traceEntry.status === "completed_with_errors" ||
        traceEntry.status === "skipped"
          ? "completed"
          : traceEntry.status === "failed"
            ? "failed"
            : "current";
    } else if (currentStep === key) {
      if (isWaiting) state = "review";
      else if (isFailed) state = "failed";
      else state = "current";
    } else if (currentIdx >= 0 && index < currentIdx) {
      state = "completed";
    }

    return {
      key,
      label,
      state,
      summary: translatePipelineSummary(traceEntry?.outputSummary),
      reviewReason: translatePipelineSummary(reviewReason),
    };
  });
}

export function relatedCustomerNames(
  mails: WorkspaceMail[],
  tasks: WorkspaceTask[],
  fallback: string[],
  now: number,
) {
  const oneHourAgo = now - 60 * 60 * 1000;
  const names = new Set<string>();
  for (const mail of mails) {
    if (
      backendDateMs(mail.receivedAt || mail.createdAt) >= oneHourAgo &&
      mail.customerName
    ) {
      names.add(mail.customerName);
    }
  }
  for (const task of tasks) {
    if (
      backendDateMs(task.completedAt || task.requestedAt || task.receivedAt) >=
        oneHourAgo &&
      task.customerName
    ) {
      names.add(task.customerName);
    }
  }
  return (
    [...names].slice(0, 4).join("、") ||
    fallback.slice(0, 4).join("、") ||
    "暂无客户"
  );
}

export function agentTileClassName(activeTile: number | null, index: number) {
  if (activeTile === null) return "agent-tile";
  const activeColumn = activeTile % TILE_COLUMNS;
  const activeRow = Math.floor(activeTile / TILE_COLUMNS);
  const column = index % TILE_COLUMNS;
  const row = Math.floor(index / TILE_COLUMNS);
  const distance =
    Math.abs(activeColumn - column) + Math.abs(activeRow - row);
  if (distance === 0) return "agent-tile active";
  if (distance === 1) return "agent-tile near";
  if (distance === 2) return "agent-tile soft";
  return "agent-tile";
}
