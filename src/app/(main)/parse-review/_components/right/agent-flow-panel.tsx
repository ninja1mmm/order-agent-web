"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, CheckCircle2, FileSearch, LoaderCircle, Play, RefreshCw, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WorkspaceTask } from "@/services/inbox";
import { cancelTask, rerunTask, type TaskStaleState } from "@/services/tasks";
import {
  type Locale,
  copy,
  taskStatusLabel,
} from "../../../_components/shared";
import type { TimelineEntry } from "../parse-review-types";

type StatusBadgeVariant = "green" | "amber" | "red" | "slate";

type AgentFlowPanelProps = {
  locale: Locale;
  selectedTask: WorkspaceTask | undefined;
  timeline: TimelineEntry[];
  isTaskRunning: boolean;
  isWaitingHuman: boolean;
  isProceedLoading: boolean;
  isPublishLoading: boolean;
  resultHref: string;
  taskStaleState: TaskStaleState | null;
  stepLabels: Record<string, string>;
  onProceed: () => void;
  onPublish: () => void;
  onRefresh: () => void;
};

export function AgentFlowPanel({
  locale,
  selectedTask,
  timeline,
  isTaskRunning,
  isWaitingHuman,
  isProceedLoading,
  isPublishLoading,
  resultHref,
  taskStaleState,
  stepLabels,
  onProceed,
  onPublish,
  onRefresh,
}: AgentFlowPanelProps) {
  const t = copy[locale];
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRerunning, setIsRerunning] = useState(false);
  const isCancellable = selectedTask != null && (selectedTask.status === "processing" || selectedTask.status === "queued");
  const isRerunnable = selectedTask != null && (selectedTask.status === "failed" || selectedTask.status === "cancelled" || selectedTask.status === "completed");

  const handleCancel = async () => {
    if (!selectedTask) return;
    setIsCancelling(true);
    try {
      await cancelTask(selectedTask.id);
      onRefresh();
    } catch (err) {
      console.error("Cancel failed:", err);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRerun = async () => {
    if (!selectedTask) return;
    setIsRerunning(true);
    try {
      await rerunTask(selectedTask.id);
      onRefresh();
    } catch (err) {
      console.error("Rerun failed:", err);
    } finally {
      setIsRerunning(false);
    }
  };

  return (
    <aside className="panel scroll-panel">
      <div className="panel-head">
        <h2 className="panel-title">{t.agentFlow}</h2>
        {selectedTask ? (
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Badge variant={statusBadgeVariant(selectedTask.status)} className={isTaskRunning ? "agent-running-badge" : ""}>
              {taskStatusLabel(selectedTask.status, locale)}
            </Badge>
            {isRerunnable ? (
              <Button variant="ghost" size="icon" aria-label="重新解析" disabled={isRerunning} onClick={handleRerun}>
                <RefreshCw className={`h-3.5 w-3.5 ${isRerunning ? "animate-spin" : ""}`} />
              </Button>
            ) : null}
          </span>
        ) : null}
      </div>
      <div className="panel-body stack timeline">
        {selectedTask && timeline.length > 0 ? (
          <>
            {timeline.map((entry, idx) => (
              <div className={`step step-${entry.state}`} key={entry.key}>
                <div className="step-title">
                  {entry.label}
                  {entry.state === "failed" ? (
                    <Badge variant="red" style={{ marginLeft: 6 }}>failed</Badge>
                  ) : entry.state === "review" ? (
                    <Badge variant="amber" style={{ marginLeft: 6 }}>待审核</Badge>
                  ) : null}
                </div>
                {entry.summary ? <div className="step-meta">{entry.summary}</div> : null}
                {entry.reviewReason ? (
                  <div className="step-meta step-review-reason">{entry.reviewReason}</div>
                ) : null}
                {entry.state === "review" && isWaitingHuman ? (
                  <>
                    {taskStaleState && taskStaleState.pendingReevalSteps.length > 0 ? (
                      <div className="step-meta" style={{ color: "var(--warning)", fontStyle: "italic", marginBottom: 4 }}>
                        已修改字段，继续后将重新执行: {taskStaleState.pendingReevalSteps.map((step) => stepLabels[step] ?? step).join(", ")}
                      </div>
                    ) : null}
                    {entry.key === "ready_to_publish" ? (
                      <button
                        type="button"
                        className="proceed-btn"
                        style={{ background: "var(--accent)" }}
                        disabled={isPublishLoading}
                        onClick={onPublish}
                      >
                        {isPublishLoading ? (
                          <LoaderCircle className="animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3" />
                        )}
                        确认并发布
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="proceed-btn"
                        disabled={isProceedLoading}
                        onClick={onProceed}
                      >
                        {isProceedLoading ? (
                          <LoaderCircle className="animate-spin" />
                        ) : (
                          <Play className="h-3 w-3" />
                        )}
                        继续流程
                      </button>
                    )}
                  </>
                ) : null}
                {idx === timeline.length - 1 && resultHref ? (
                  <div className="result-actions">
                    <Link className="btn small agent-result-link" href={resultHref}>
                      <FileSearch className="h-3.5 w-3.5" />
                      {t.viewResult}
                    </Link>
                  </div>
                ) : null}
              </div>
            ))}
            {selectedTask.warnings.length > 0 ? (
              <div className="step step-warnings">
                <div className="step-title">
                  <AlertTriangle className="h-3.5 w-3.5 step-icon-review" aria-hidden="true" />
                  警告
                  <Badge variant="amber" style={{ marginLeft: 6 }}>{selectedTask.warnings.length}</Badge>
                </div>
                <ul className="step-meta" style={{ paddingLeft: 16, margin: 0 }}>
                  {selectedTask.warnings.map((warning, index) => <li key={index}>{warning}</li>)}
                </ul>
              </div>
            ) : null}
          </>
        ) : selectedTask && isTaskRunning ? (
          <div className="step">
            <div className="step-title">
              <LoaderCircle className="step-spinner" aria-hidden="true" />
              流程启动中...
            </div>
          </div>
        ) : selectedTask ? (
          <p className="item-meta">暂无执行流数据</p>
        ) : null}
        {isCancellable ? (
          <button
            type="button"
            className="proceed-btn"
            style={{ background: "var(--danger)", marginTop: 8 }}
            disabled={isCancelling}
            onClick={handleCancel}
          >
            {isCancelling ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <XCircle className="h-3 w-3" />
            )}
            终止任务
          </button>
        ) : null}
      </div>
    </aside>
  );
}

function statusBadgeVariant(status: string): StatusBadgeVariant {
  if (status === "completed" || status === "published") return "green";
  if (status === "running" || status === "processing" || status === "waiting_human_decision") return "amber";
  if (status === "failed" || status === "cancelled") return "red";
  return "slate";
}
