"use client";

import Link from "next/link";
import { useMemo, useState, type PointerEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileSearch,
  Mail,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { CartoonAgent, type CartoonAgentMood } from "./cartoon-agent";
import type { WorkspaceMail, WorkspaceTask } from "../../services/inbox";
import {
  backendDateMs,
  customerLabelFromId,
  translatePipelineSummary,
  useCustomerConfig,
  useWorkspacePolling,
} from "../[section]/sections/shared";

type AgentViewMode = "orb" | "employee";
type AgentMood = CartoonAgentMood;
type CardTone = "summary" | "mail" | "todo";

const TILE_COLUMNS = 18;
const TILE_ROWS = 10;
const TILE_COUNT = TILE_COLUMNS * TILE_ROWS;

const TONE_ORDER: CardTone[] = ["summary", "mail", "todo"];
const TONE_TO_MOOD: Record<CardTone, AgentMood> = {
  summary: "received",
  mail: "processing",
  todo: "complete",
};

const PIPELINE_STEPS = [
  "extraction",
  "date_expansion",
  "conflict_resolution",
  "material_mapping",
  "published",
] as const;

const STEP_LABELS: Record<string, string> = {
  extraction: "AI 提取",
  date_expansion: "日期扩展",
  conflict_resolution: "冲突检测",
  material_mapping: "料号匹配",
  published: "已发布",
};

type TimelineEntry = {
  key: string;
  label: string;
  state: "completed" | "current" | "pending" | "failed" | "review";
  summary: string | null;
  reviewReason: string | null;
};

function compactText(value: string, limit = 200) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > limit
    ? `${normalized.slice(0, limit)}...`
    : normalized;
}

function taskNeedsHuman(task: WorkspaceTask) {
  const s = task.status.toLowerCase();
  return (
    s.includes("pending") ||
    s.includes("review") ||
    s.includes("manual") ||
    s.includes("waiting") ||
    task.warnings.length > 0
  );
}

function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const ms = backendDateMs(dateStr);
  if (!ms) return "-";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return `${Math.floor(diff / 86_400_000)} 天前`;
}

function buildTimeline(task: WorkspaceTask): TimelineEntry[] {
  const traceMap = new Map<string, (typeof task.traceSteps)[number]>();
  for (const step of task.traceSteps) {
    traceMap.set(step.stepName, step);
  }
  const currentStep = task.pipelineStep;
  const currentIdx = currentStep
    ? PIPELINE_STEPS.indexOf(currentStep as (typeof PIPELINE_STEPS)[number])
    : -1;
  const isCompleted =
    task.status === "completed" || task.status === "published";
  const isWaiting = task.status === "waiting_human_decision";
  const isFailed = task.status === "failed";

  return PIPELINE_STEPS.map((key, idx) => {
    const traceEntry = traceMap.get(key);
    const label = STEP_LABELS[key] ?? key;
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
    } else if (currentIdx >= 0 && idx < currentIdx) {
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

function relatedCustomerNames(
  mails: WorkspaceMail[],
  tasks: WorkspaceTask[],
  fallback: string[],
  now: number,
) {
  const oneHourAgo = now - 60 * 60 * 1000;
  const names = new Set<string>();
  for (const m of mails) {
    if (
      backendDateMs(m.receivedAt || m.createdAt) >= oneHourAgo &&
      m.customerName
    )
      names.add(m.customerName);
  }
  for (const t of tasks) {
    if (
      backendDateMs(t.completedAt || t.requestedAt || t.receivedAt) >=
        oneHourAgo &&
      t.customerName
    )
      names.add(t.customerName);
  }
  return (
    [...names].slice(0, 4).join("、") ||
    fallback.slice(0, 4).join("、") ||
    "暂无客户"
  );
}

export function SCAgentExperience() {
  const { mails, tasks, stats } = useWorkspacePolling();
  const { customers } = useCustomerConfig();
  const [eventIndex, setEventIndex] = useState(0);
  const [showMessage, setShowMessage] = useState(false);
  const [activeTile, setActiveTile] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<AgentViewMode>("orb");
  const [expandedMails, setExpandedMails] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const now = Date.now();
  const activeTone = TONE_ORDER[eventIndex % TONE_ORDER.length];

  const latestMails = useMemo(
    () =>
      [...mails]
        .sort(
          (a, b) =>
            backendDateMs(b.receivedAt || b.createdAt) -
            backendDateMs(a.receivedAt || a.createdAt),
        )
        .slice(0, 5),
    [mails],
  );

  const pendingHumanTasks = useMemo(
    () =>
      tasks
        .filter(taskNeedsHuman)
        .sort(
          (a, b) =>
            backendDateMs(b.requestedAt || b.receivedAt) -
            backendDateMs(a.requestedAt || a.receivedAt),
        )
        .slice(0, 5),
    [tasks],
  );

  const summaryStats = useMemo(() => {
    const completedLastHour = tasks.filter(
      (t) => backendDateMs(t.completedAt) >= now - 60 * 60 * 1000,
    ).length;
    const completedCount = stats?.completedCount ?? completedLastHour;
    const pendingCount = stats?.pendingCount ?? pendingHumanTasks.length;
    const followUpCount = stats?.followUpCount ?? 0;
    const mailCount = stats?.mailCount ?? mails.length;
    const customerNames =
      stats?.customerNames ??
      mails
        .map((m) => m.customerName)
        .filter((n): n is string => Boolean(n));
    return {
      completedCount,
      completedLastHour,
      pendingCount,
      followUpCount,
      mailCount,
      customerNames,
    };
  }, [mails, tasks, stats, pendingHumanTasks, now]);

  const agentMood: AgentMood = !showMessage
    ? "idle"
    : TONE_TO_MOOD[activeTone];

  const pushMessage = () => {
    setShowMessage(true);
    setEventIndex((i) => (i + 1) % TONE_ORDER.length);
  };

  const toggleMail = (id: string) =>
    setExpandedMails((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleTask = (id: string) =>
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const column = Math.min(
      TILE_COLUMNS - 1,
      Math.max(
        0,
        Math.floor(((event.clientX - rect.left) / rect.width) * TILE_COLUMNS),
      ),
    );
    const row = Math.min(
      TILE_ROWS - 1,
      Math.max(
        0,
        Math.floor(((event.clientY - rect.top) / rect.height) * TILE_ROWS),
      ),
    );
    const nextTile = row * TILE_COLUMNS + column;
    setActiveTile((current) => (current === nextTile ? current : nextTile));
  };

  const tileClassName = (index: number) => {
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
  };

  const MessageIcon =
    activeTone === "todo"
      ? AlertTriangle
      : activeTone === "summary"
        ? CheckCircle2
        : Mail;

  return (
    <section
      className={`sc-agent-experience ${viewMode}-mode agent-state-${agentMood}${showMessage ? " notifying" : ""}`}
      aria-label="SCAgent 虚拟智能体"
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setActiveTile(null)}
      onClick={() => {
        if (showMessage) setShowMessage(false);
      }}
    >
      <div className="agent-tile-layer" aria-hidden="true">
        {Array.from({ length: TILE_COUNT }, (_, index) => (
          <span className={tileClassName(index)} key={index} />
        ))}
      </div>

      <div className="sc-agent-field" aria-hidden="true">
        <span className="field-node node-mail">
          <Mail size={18} />
        </span>
        <span className="field-node node-parse">
          <FileSearch size={18} />
        </span>
        <span className="field-node node-review">
          <UserCheck size={18} />
        </span>
        {Array.from({ length: 18 }, (_, index) => (
          <span className={`field-particle particle-${index + 1}`} key={index} />
        ))}
      </div>

      <button
        className="sc-agent-nameplate agent-flip-toggle"
        type="button"
        aria-label={`切换为${viewMode === "orb" ? "卡通数字员工" : "光球智能体"}`}
        aria-pressed={viewMode === "employee"}
        onClick={(event) => {
          event.stopPropagation();
          setViewMode((current) => (current === "orb" ? "employee" : "orb"));
        }}
      >
        <span className="agent-title-line top" aria-hidden="true" />
        <div className="agent-flip-card" aria-hidden="true">
          <div className="agent-flip-face agent-flip-front">
            <strong>Faurecia</strong>
            <small>Light Orb</small>
          </div>
          <div className="agent-flip-face agent-flip-back">
            <strong>Faurecia</strong>
            <small>Digital Employee</small>
          </div>
        </div>
        <span className="agent-title-line bottom" aria-hidden="true" />
      </button>

      <button
        className={`sc-agent-orb-button ${viewMode === "employee" ? "avatar-view" : "orb-view"}`}
        type="button"
        aria-label="推送一条 SCAgent 消息"
        onClick={(event) => {
          event.stopPropagation();
          pushMessage();
        }}
      >
        {viewMode === "orb" ? (
          <span className="sc-agent-orb">
            <span className="sc-agent-orb-grid" />
            <span className="sc-agent-neuron-layer">
              {Array.from({ length: 7 }, (_, index) => (
                <span
                  className={`neuron-line line-${index + 1}`}
                  key={`line-${index}`}
                />
              ))}
              {Array.from({ length: 3 }, (_, index) => (
                <span
                  className={`neuron-trail trail-${index + 1}`}
                  key={`trail-${index}`}
                />
              ))}
              {Array.from({ length: 3 }, (_, index) => (
                <span
                  className={`neuron-dot dot-${index + 1}`}
                  key={`dot-${index}`}
                />
              ))}
            </span>
            <span className="sc-agent-orb-aura" />
            <Sparkles aria-hidden="true" size={32} />
          </span>
        ) : (
          <CartoonAgent mood={agentMood} />
        )}
      </button>

      {/* ---- right-side card (3 tones cycling) ---- */}
      <aside
        className={`sc-agent-message ${activeTone}${showMessage ? " visible" : ""}`}
        aria-live="polite"
        onClick={(event) => event.stopPropagation()}
      >
        {/* ========== Card 1: summary (received) ========== */}
        {activeTone === "summary" && (
          <>
            <div className="message-head">
              <span className="message-icon">
                <MessageIcon size={18} aria-hidden="true" />
              </span>
              <div className="message-head-inline">
                <strong>小时汇总</strong>
                <span>过去一小时工作摘要</span>
              </div>
            </div>
            <p>
              已完成{" "}
              {summaryStats.completedLastHour || summaryStats.completedCount}{" "}
              项解析/归一化动作，当前待处理 {summaryStats.pendingCount}{" "}
              项，涉及客户：
              {relatedCustomerNames(
                mails,
                tasks,
                summaryStats.customerNames,
                now,
              )}
              。
            </p>
            <div className="message-rows">
              <div>
                <span>完成解析</span>
                <strong>
                  {summaryStats.completedLastHour || summaryStats.completedCount}
                </strong>
              </div>
              <div>
                <span>进入待办</span>
                <strong>{summaryStats.pendingCount}</strong>
              </div>
              <div>
                <span>需要跟催</span>
                <strong>{summaryStats.followUpCount}</strong>
              </div>
              <div>
                <span>收件箱</span>
                <strong>{summaryStats.mailCount} 封</strong>
              </div>
            </div>
          </>
        )}

        {/* ========== Card 2: mail (processing) ========== */}
        {activeTone === "mail" && (
          <>
            <div className="message-head">
              <span className="message-icon">
                <MessageIcon size={18} aria-hidden="true" />
              </span>
              <div className="message-head-inline">
                <strong>收到邮件</strong>
                <span>最新 {latestMails.length} 封</span>
              </div>
            </div>
            {latestMails.length === 0 ? (
              <p className="message-empty">暂无邮件</p>
            ) : (
              <div className="message-accordion">
                {latestMails.map((mail) => {
                  const isOpen = expandedMails.has(mail.id);
                  const customer = customerLabelFromId(
                    customers,
                    mail.customerId,
                    mail.customerName || mail.fromEmail,
                  );
                  return (
                    <div
                      key={mail.id}
                      className={`accordion-item${isOpen ? " open" : ""}`}
                    >
                      <button
                        type="button"
                        className="accordion-trigger"
                        onClick={() => toggleMail(mail.id)}
                        aria-expanded={isOpen}
                      >
                        <div className="accordion-trigger-content">
                          <strong>{mail.subject || "未命名邮件"}</strong>
                          <span>
                            {customer} ·{" "}
                            {formatRelativeTime(
                              mail.receivedAt || mail.createdAt,
                            )}
                          </span>
                        </div>
                        <ChevronDown
                          size={14}
                          className={`accordion-chevron${isOpen ? " rotated" : ""}`}
                        />
                      </button>
                      {isOpen && (
                        <div className="accordion-body">
                          <div className="accordion-detail-row">
                            <span>发件人</span>
                            <strong>{mail.fromEmail}</strong>
                          </div>
                          <div className="accordion-detail-row">
                            <span>客户</span>
                            <strong>{customer}</strong>
                          </div>
                          <div className="accordion-detail-row">
                            <span>附件</span>
                            <strong>
                              {mail.attachments.length
                                ? mail.attachments
                                    .map(
                                      (a) =>
                                        `${a.fileName} (${a.status || "待处理"})`,
                                    )
                                    .join("、")
                                : "无附件"}
                            </strong>
                          </div>
                          <p className="accordion-body-text">
                            {compactText(mail.bodyText || "邮件正文暂无。")}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ========== Card 3: todo (complete) ========== */}
        {activeTone === "todo" && (
          <>
            <div className="message-head">
              <span className="message-icon">
                <MessageIcon size={18} aria-hidden="true" />
              </span>
              <div className="message-head-inline">
                <strong>人工干预</strong>
                <span>
                  {pendingHumanTasks.length
                    ? `${pendingHumanTasks.length} 项待处理`
                    : "暂无事项"}
                </span>
              </div>
            </div>
            {pendingHumanTasks.length === 0 ? (
              <p className="message-empty">
                当前暂无需要人工干预的任务，SCAgent
                会继续监控解析异常、客户变更和附件缺失状态。
              </p>
            ) : (
              <div className="message-accordion">
                {pendingHumanTasks.map((task) => {
                  const isOpen = expandedTasks.has(task.id);
                  const customer = customerLabelFromId(
                    customers,
                    task.customerId,
                    task.customerName || "未知客户",
                  );
                  const timeline = buildTimeline(task);
                  return (
                    <div
                      key={task.id}
                      className={`accordion-item${isOpen ? " open" : ""}`}
                    >
                      <button
                        type="button"
                        className="accordion-trigger"
                        onClick={() => toggleTask(task.id)}
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

                          {/* Agent 执行流 */}
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

                          {/* navigate to parse-review */}
                          <Link
                            href={`/parse-review?taskId=${encodeURIComponent(task.id)}`}
                            className="accordion-nav-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink size={12} />
                            前往解析审查
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </aside>
    </section>
  );
}
