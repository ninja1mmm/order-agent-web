"use client";

import Link from "next/link";
import { AlertTriangle, ChevronDown, ExternalLink } from "lucide-react";
import type { WorkspaceTask } from "@/services/inbox";
import type { CustomerConfig } from "@/services/settings";
import { customerLabelFromId } from "../../_components/shared";
import { buildTimeline } from "./sc-agent-utils";

type AgentTodoCardProps = {
  tasks: WorkspaceTask[];
  customers: CustomerConfig[];
  expandedTasks: Set<string>;
  onToggleTask: (id: string) => void;
};

export function AgentTodoCard({
  tasks,
  customers,
  expandedTasks,
  onToggleTask,
}: AgentTodoCardProps) {
  if (tasks.length === 0) {
    return (
      <p className="message-empty">
        当前暂无需要人工干预的任务，SCAgent
        会继续监控解析异常、客户变更和附件缺失状态。
      </p>
    );
  }

  return (
    <div className="message-accordion">
      {tasks.map((task) => (
        <TaskAccordionItem
          key={task.id}
          task={task}
          customers={customers}
          isOpen={expandedTasks.has(task.id)}
          onToggle={() => onToggleTask(task.id)}
        />
      ))}
    </div>
  );
}

function TaskAccordionItem({
  task,
  customers,
  isOpen,
  onToggle,
}: {
  task: WorkspaceTask;
  customers: CustomerConfig[];
  isOpen: boolean;
  onToggle: () => void;
}) {
  const customer = customerLabelFromId(
    customers,
    task.customerId,
    task.customerName || "未知客户",
  );
  const timeline = buildTimeline(task);

  return (
    <div className={`accordion-item${isOpen ? " open" : ""}`}>
      <button
        type="button"
        className="accordion-trigger"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <div className="accordion-trigger-content">
          <strong>
            {task.attachmentFileName ||
              task.taskType ||
              task.id}
          </strong>
          <span>
            {customer} · {task.status}
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`accordion-chevron${isOpen ? " rotated" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="accordion-body">
          {task.reviewSummary && (
            <div className="accordion-alert">
              <AlertTriangle size={12} />
              <span>
                {task.reviewSummary.reason || "需要人工确认"}
              </span>
            </div>
          )}
          {task.warnings.length > 0 && !task.reviewSummary && (
            <div className="accordion-alert">
              <AlertTriangle size={12} />
              <span>{task.warnings[0]}</span>
            </div>
          )}

          <div className="accordion-timeline-wrap">
            <div className="timeline">
              {timeline.map((entry) => (
                <div
                  className={`step step-${entry.state}`}
                  key={entry.key}
                >
                  <div className="step-title">
                    {entry.label}
                    {entry.state === "review" && (
                      <span className="agent-badge-review">
                        待审核
                      </span>
                    )}
                    {entry.state === "failed" && (
                      <span className="agent-badge-failed">
                        failed
                      </span>
                    )}
                  </div>
                  {entry.summary && (
                    <div className="step-meta">
                      {entry.summary}
                    </div>
                  )}
                  {entry.reviewReason && (
                    <div className="step-meta step-review-reason">
                      {entry.reviewReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Link
            href={`/parse-review?taskId=${encodeURIComponent(task.id)}`}
            className="accordion-nav-link"
            onClick={(event) => event.stopPropagation()}
          >
            <ExternalLink size={12} />
            前往解析审查
          </Link>
        </div>
      )}
    </div>
  );
}
