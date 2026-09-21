"use client";

import { AlertTriangle, Check, FileSearch, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import type { WorkspaceAttachment, WorkspaceMail, WorkspaceTask } from "@/services/inbox";
import { type Locale, copy } from "../../_components/shared";
import { AttachmentPreview } from "./middle/attachment-preview";

type TaskProcessingWorkspaceProps = {
  locale: Locale;
  task: WorkspaceTask;
  mail: WorkspaceMail | undefined;
  attachment: WorkspaceAttachment | undefined;
  isBodyTextTask: boolean;
  targetSheetName: string | null | undefined;
  parsedSheetNames: string[];
  failed: boolean;
};

const PIPELINE_STEPS = [
  { key: "extraction", label: "读取来源并提取订单字段", detail: "识别表格、正文与关键业务字段" },
  { key: "date_expansion", label: "解析日期语义", detail: "统一日、周、月等交期表达" },
  { key: "conflict_resolution", label: "校验数量与冲突", detail: "检查重复、缺失与数量歧义" },
  { key: "material_mapping", label: "准备物料核对结果", detail: "匹配物料并生成可审查结果" },
] as const;

export function TaskProcessingWorkspace({
  locale,
  task,
  mail,
  attachment,
  isBodyTextTask,
  targetSheetName,
  parsedSheetNames,
  failed,
}: TaskProcessingWorkspaceProps) {
  const t = copy[locale];
  const matchedStepIndex = PIPELINE_STEPS.findIndex((step) => step.key === task.pipelineStep);
  const completedSteps = new Set(
    task.traceSteps
      .filter((step) => step.status === "completed" || step.status === "completed_with_errors")
      .map((step) => step.stepName),
  );
  const lastCompletedIndex = PIPELINE_STEPS.reduce(
    (latest, step, index) => completedSteps.has(step.key) ? index : latest,
    -1,
  );
  const actualStepIndex = Math.max(
    matchedStepIndex >= 0 ? matchedStepIndex : task.pipelineStep ? PIPELINE_STEPS.length - 1 : 0,
    Math.min(lastCompletedIndex + 1, PIPELINE_STEPS.length - 1),
  );
  const [demonstrationStep, setDemonstrationStep] = useState(actualStepIndex);
  const currentIndex = Math.max(actualStepIndex, demonstrationStep);

  useEffect(() => {
    if (failed || demonstrationStep >= PIPELINE_STEPS.length - 1) return;
    const timer = window.setTimeout(() => {
      setDemonstrationStep((step) => Math.min(step + 1, PIPELINE_STEPS.length - 1));
    }, 10_000 + Math.floor(Math.random() * 10_001));
    return () => window.clearTimeout(timer);
  }, [demonstrationStep, failed]);

  return (
    <div className="parse-horizontal-workspace processing-workspace">
      <section className="panel scroll-panel source-preview-panel">
        <div className="panel-head">
          <div className="source-preview-title"><FileSearch className="h-4 w-4" /><span><strong>{isBodyTextTask ? "Email Body" : (attachment?.fileName ?? t.attachmentPreview)}</strong></span></div>
        </div>
        <div className="panel-body source-preview-body">
          <AttachmentPreview
            locale={locale}
            isBodyTextTask={isBodyTextTask}
            selectedMail={mail}
            selectedAttachment={attachment}
            targetSheetName={targetSheetName}
            parsedSheetNames={parsedSheetNames}
            addingSource={false}
            readOnly
            onAddSheetSource={() => undefined}
          />
        </div>
      </section>

      <section className={`panel parse-processing-panel${failed ? " is-error" : ""}`} aria-live="polite">
        <div className="parse-processing-visual" aria-hidden="true">
          {failed ? <AlertTriangle /> : <><span className="parse-scanner-line" /><LoaderCircle className="parse-processing-spinner" /></>}
        </div>
        <div className="parse-processing-copy">
          <span className="parse-processing-kicker">{failed ? "TASK INTERRUPTED" : "AI PARSING"}</span>
          <h2>{failed ? (task.status === "cancelled" ? "解析已取消" : "解析未完成") : "正在生成解析结果"}</h2>
        </div>

        {!failed ? (
          <ol className="parse-processing-steps">
            {PIPELINE_STEPS.map((step, index) => {
              const complete = completedSteps.has(step.key) || index < currentIndex;
              const active = !complete && index === currentIndex;
              return (
                <li key={step.key} className={`${complete ? "is-complete" : ""}${active ? " is-active" : ""}`}>
                  <span className="parse-processing-step-icon">{complete ? <Check /> : active ? <LoaderCircle /> : index + 1}</span>
                  <span><strong>{step.label}</strong><small>{step.detail}</small></span>
                </li>
              );
            })}
          </ol>
        ) : null}
      </section>
    </div>
  );
}
