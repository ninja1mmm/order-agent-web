"use client";

import { useMemo, useState } from "react";
import { LoaderCircle, Play, CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cancelTask, rerunTask } from "@/services/tasks";
import type { MailTaskSummary } from "@/types/models/inbox";
import type { Locale } from "../../../_components/shared";
import { copy, taskStatusLabel, translatePipelineSummary } from "../../../_components/shared";

type TimelineEntry = {
  key: string;
  label: string;
  state: "done" | "active" | "failed" | "review" | "pending";
  summary: string | null;
  reviewReason?: string | null;
};

type Props = {
  task: MailTaskSummary | null;
  locale: Locale;
  onRefreshTasks: () => void;
};

const STEP_LABELS: Record<string, string> = {
  extraction: "AI 提取",
  date_expansion: "日期扩展",
  conflict_resolution: "冲突检测",
  material_mapping: "料号匹配",
  ready_to_publish: "确认发布",
};

export function PipelineSidebar({ task, locale, onRefreshTasks }: Props) {
  const t = copy[locale];
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRerunning, setIsRerunning] = useState(false);

  const isRunning = task != null && (task.status === "processing" || task.status === "queued");
  const isCancellable = isRunning;
  const isRerunnable = task != null && (task.status === "failed" || task.status === "cancelled" || task.status === "completed");

  const timeline = useMemo((): TimelineEntry[] => {
    if (!task || task.traceSteps.length === 0) return [];
    return task.traceSteps.map((step) => {
      let state: TimelineEntry["state"] = "pending";
      if (step.status === "completed" || step.status === "done") state = "done";
      else if (step.status === "running" || step.status === "active") state = "active";
      else if (step.status === "failed") state = "failed";
      else if (step.status === "review" || step.status === "waiting_human_decision") state = "review";

      return {
        key: step.stepName,
        label: STEP_LABELS[step.stepName] ?? step.stepName,
        state,
        summary: translatePipelineSummary(step.outputSummary) ?? step.outputSummary,
        reviewReason: task.reviewSummary?.reason ?? null,
      };
    });
  }, [task]);

  const handleCancel = async () => {
    if (!task) return;
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
    if (!task) return;
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

  if (!task) {
    return (
      <div className="pipeline-sidebar">
        <p style={{ fontSize: 12, color: "var(--muted)" }}>
          {locale === "en" ? "No task selected" : "未选择任务"}
        </p>
      </div>
    );
  }

  return (
    <div className="pipeline-sidebar">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{t.agentFlow}</span>
        <Badge variant={statusBadgeVariant(task.status)}>
          {taskStatusLabel(task.status, locale)}
        </Badge>
      </div>

      <div className="stack timeline">
        {timeline.length > 0 ? (
          timeline.map((entry) => (
            <div className={`step step-${entry.state}`} key={entry.key}>
              <div className="step-title">{entry.label}</div>
              {entry.summary ? <div className="step-meta">{entry.summary}</div> : null}
            </div>
          ))
        ) : isRunning ? (
          <div className="step">
            <div className="step-title">
              <LoaderCircle className="step-spinner" aria-hidden="true" />
              {locale === "en" ? "Processing..." : "流程启动中..."}
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 12, color: "var(--muted)" }}>
            {locale === "en" ? "No pipeline data" : "暂无执行流数据"}
          </p>
        )}
      </div>

      {task.warnings.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--warning)", marginBottom: 4 }}>
            Warnings ({task.warnings.length})
          </div>
          <ul style={{ fontSize: 11, color: "var(--muted)", paddingLeft: 16, margin: 0 }}>
            {task.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      <div className="pipeline-actions">
        {isRerunnable && (
          <Button variant="default" size="sm" disabled={isRerunning} onClick={handleRerun}>
            <RefreshCw className={`h-3.5 w-3.5 ${isRerunning ? "animate-spin" : ""}`} />
            {locale === "en" ? "Re-parse" : "重新解析"}
          </Button>
        )}
        {isCancellable && (
          <Button variant="default" size="sm" disabled={isCancelling} onClick={handleCancel} style={{ background: "var(--danger)", color: "#fff" }}>
            {isCancelling ? <LoaderCircle className="animate-spin h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
            {locale === "en" ? "Cancel" : "终止任务"}
          </Button>
        )}
      </div>
    </div>
  );
}

function statusBadgeVariant(status: string): "green" | "amber" | "red" | "slate" {
  if (status === "completed" || status === "published") return "green";
  if (status === "running" || status === "processing" || status === "waiting_human_decision") return "amber";
  if (status === "failed" || status === "cancelled") return "red";
  return "slate";
}
