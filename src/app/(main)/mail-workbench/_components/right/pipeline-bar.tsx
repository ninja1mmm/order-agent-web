"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, LoaderCircle, Play, RefreshCw, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cancelTask, rerunTask } from "@/services/tasks";
import type { MailTaskSummary } from "@/types/models/inbox";
import type { TaskStaleState } from "@/types/models/tasks";
import type { Locale } from "../../../_components/shared";
import { copy, taskStatusLabel } from "../../../_components/shared";

type Props = {
  task: MailTaskSummary | null;
  locale: Locale;
  taskStaleState?: TaskStaleState | null;
  isProceedLoading?: boolean;
  onProceed?: () => void;
  onRefreshTasks: () => void;
};

const PIPELINE_STEPS = ["extraction", "date_expansion", "conflict_resolution", "material_mapping", "ready_to_publish"] as const;

const STEP_LABELS: Record<string, string> = {
  extraction: "AI 提取",
  date_expansion: "日期扩展",
  conflict_resolution: "冲突检测",
  material_mapping: "料号匹配",
  ready_to_publish: "确认发布",
};

type TimelineEntry = {
  key: string;
  label: string;
  state: "completed" | "current" | "pending" | "failed" | "review";
  summary: string | null;
  reviewReason: string | null;
};

export function PipelineBar({ task, locale, taskStaleState, isProceedLoading, onProceed, onRefreshTasks }: Props) {
  const t = copy[locale];
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRerunning, setIsRerunning] = useState(false);

  const isRunning = task != null && (task.status === "processing" || task.status === "queued");
  const isRerunnable = task != null && (task.status === "failed" || task.status === "cancelled" || task.status === "completed");
  const isWaitingHuman = task?.status === "waiting_human_decision";
  const isTaskCompleted = task?.status === "completed" || task?.status === "published";
  const isTaskFailed = task?.status === "failed";

  const timeline: TimelineEntry[] = useMemo(() => {
    if (!task) return [];
    const traceMap = new Map<string, (typeof task.traceSteps)[number]>();
    for (const step of task.traceSteps) {
      traceMap.set(step.stepName, step);
    }
    const currentStep = task.pipelineStep;
    const currentIdx = currentStep ? PIPELINE_STEPS.indexOf(currentStep as (typeof PIPELINE_STEPS)[number]) : -1;

    return PIPELINE_STEPS.map((key, idx) => {
      const traceEntry = traceMap.get(key);
      const label = STEP_LABELS[key] ?? key;
      let state: TimelineEntry["state"] = "pending";
      let reviewReason: string | null = null;

      const isBlockedHere = isWaitingHuman && task.reviewSummary?.blockedAtStep === key;

      if (isBlockedHere) {
        state = "review";
        reviewReason = task.reviewSummary?.reason ?? null;
      } else if (isTaskCompleted) {
        state = "completed";
      } else if (traceEntry) {
        state = traceEntry.status === "completed" ? "completed"
          : traceEntry.status === "completed_with_errors" ? "completed"
          : traceEntry.status === "failed" ? "failed"
          : traceEntry.status === "skipped" ? "completed"
          : "current";
      } else if (currentStep === key) {
        if (isWaitingHuman) state = "review";
        else if (isTaskFailed) state = "failed";
        else state = "current";
      } else if (currentIdx >= 0 && idx < currentIdx) {
        state = "completed";
      }

      return { key, label, state, summary: traceEntry?.outputSummary ?? null, reviewReason };
    });
  }, [task, isTaskCompleted, isWaitingHuman, isTaskFailed]);

  if (!task) {
    return <div className="pipeline-bar empty" />;
  }

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await cancelTask(task.id);
      onRefreshTasks();
    } catch (err) {
      console.error("Cancel failed:", err);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRerun = async () => {
    setIsRerunning(true);
    try {
      await rerunTask(task.id);
      onRefreshTasks();
    } catch (err) {
      console.error("Rerun failed:", err);
    } finally {
      setIsRerunning(false);
    }
  };

  const blockedStep = timeline.find((e) => e.state === "review");
  const isPublishStep = blockedStep?.key === "ready_to_publish";

  return (
    <div className="pipeline-bar">
      <div className="pipeline-bar-header">
        <div className="pipeline-bar-label">
          <span style={{ fontWeight: 700, fontSize: 12 }}>{t.agentFlow}</span>
          <Badge variant={statusBadgeVariant(task.status)} style={{ fontSize: 10 }}>
            {taskStatusLabel(task.status, locale)}
          </Badge>
        </div>
        <div className="pipeline-bar-actions">
          {isRerunnable && (
            <Button variant="default" size="sm" disabled={isRerunning} onClick={handleRerun} style={{ height: 26, fontSize: 11 }}>
              <RefreshCw className={`h-3 w-3 ${isRerunning ? "animate-spin" : ""}`} />
              {locale === "en" ? "Re-parse" : "重新解析"}
            </Button>
          )}
          {isRunning && (
            <Button variant="default" size="sm" disabled={isCancelling} onClick={handleCancel} style={{ height: 26, fontSize: 11, background: "var(--danger)", color: "#fff" }}>
              {isCancelling ? <LoaderCircle className="animate-spin h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {locale === "en" ? "Cancel" : "终止"}
            </Button>
          )}
          {isWaitingHuman && onProceed && (
            <button
              type="button"
              className="proceed-btn"
              style={isPublishStep ? { background: "var(--accent)" } : undefined}
              disabled={isProceedLoading}
              onClick={onProceed}
            >
              {isProceedLoading ? (
                <LoaderCircle className="animate-spin h-3 w-3" />
              ) : isPublishStep ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              {isPublishStep
                ? (locale === "en" ? "Confirm & Publish" : "确认并发布")
                : (locale === "en" ? "Continue Process" : "继续流程")}
            </button>
          )}
        </div>
      </div>
      <div className="pipeline-bar-steps">
        {timeline.map((entry) => (
          <div key={entry.key} className={`pipeline-step-chip ${entry.state}`}>
            {entry.state === "current" && <LoaderCircle className="h-3 w-3 animate-spin" />}
            <span>{entry.label}</span>
            {entry.state === "failed" && <Badge variant="red" style={{ fontSize: 9, marginLeft: 2 }}>failed</Badge>}
            {entry.state === "review" && <Badge variant="amber" style={{ fontSize: 9, marginLeft: 2 }}>待审核</Badge>}
          </div>
        ))}
        {isRunning && timeline.every((e) => e.state === "pending") && (
          <div className="pipeline-step-chip current">
            <LoaderCircle className="h-3 w-3 animate-spin" />
            <span>{locale === "en" ? "Starting..." : "启动中..."}</span>
          </div>
        )}
      </div>
      {(blockedStep?.summary || blockedStep?.reviewReason || (taskStaleState && taskStaleState.pendingReevalSteps.length > 0) || task.warnings.length > 0) && (
        <div className="pipeline-bar-details">
          {blockedStep?.summary && (
            <div className="pipeline-detail-item">{blockedStep.summary}</div>
          )}
          {blockedStep?.reviewReason && (
            <div className="pipeline-detail-item review-reason">{blockedStep.reviewReason}</div>
          )}
          {taskStaleState && taskStaleState.pendingReevalSteps.length > 0 && (
            <div className="pipeline-detail-item stale-warning">
              已修改字段，继续后将重新执行: {taskStaleState.pendingReevalSteps.map((s) => STEP_LABELS[s] ?? s).join(", ")}
            </div>
          )}
          {task.warnings.length > 0 && (
            <div className="pipeline-detail-item warning-item">
              ⚠ {task.warnings.join("; ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function statusBadgeVariant(status: string): "green" | "amber" | "red" | "slate" {
  if (status === "completed" || status === "published") return "green";
  if (status === "running" || status === "processing" || status === "waiting_human_decision") return "amber";
  if (status === "failed" || status === "cancelled") return "red";
  return "slate";
}
