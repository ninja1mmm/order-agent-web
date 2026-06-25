"use client";

import { useEffect, useMemo, useState, type PointerEvent } from "react";
import { AlertTriangle, CheckCircle2, FileSearch, Mail, Sparkles, UserCheck } from "lucide-react";
import type { WorkspaceMail, WorkspaceTask } from "../../services/inbox";
import {
  backendDateMs,
  customerLabelFromId,
  useCustomerConfig,
  useWorkspacePolling,
} from "../[section]/sections/shared";

type AgentMessage = {
  key: string;
  tone: "mail" | "summary" | "todo";
  title: string;
  eyebrow: string;
  body: string;
  rows: Array<{ label: string; value: string }>;
  workflow: Array<{ label: string; status: string }>;
};

type MessageHistoryItem = {
  id: string;
  pushedAt: string;
  eyebrow: string;
  title: string;
};

const TILE_COLUMNS = 18;
const TILE_ROWS = 10;
const TILE_COUNT = TILE_COLUMNS * TILE_ROWS;

const fallbackMail: WorkspaceMail = {
  id: "demo-mail",
  messageId: "demo-mail",
  fromEmail: "buyer@example.com",
  subject: "SLP Mexico weekly shipping plan update",
  bodyText: "Please review the updated shipping plan and attached forecast file. Several material quantities changed for next week.",
  receivedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  customerId: null,
  customerName: "SLP Mexico",
  attachments: [
    {
      attachmentId: "demo-attachment",
      fileArtifactId: "demo-attachment",
      fileName: "shipping-plan-weekly.xlsx",
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      status: "parsing",
      taskId: null,
      documentType: "Shipping Plan",
    },
  ],
};

function latestMail(mails: WorkspaceMail[]): WorkspaceMail {
  return [...mails].sort((a, b) => backendDateMs(b.receivedAt || b.createdAt) - backendDateMs(a.receivedAt || a.createdAt))[0] ?? fallbackMail;
}

function compactText(value: string, limit = 136) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > limit ? `${normalized.slice(0, limit)}...` : normalized;
}

function relatedCustomerNames(mails: WorkspaceMail[], tasks: WorkspaceTask[], fallback: string[], now: number) {
  const oneHourAgo = now - 60 * 60 * 1000;
  const names = new Set<string>();
  mails
    .filter((mail) => backendDateMs(mail.receivedAt || mail.createdAt) >= oneHourAgo)
    .forEach((mail) => {
      if (mail.customerName) names.add(mail.customerName);
    });
  tasks
    .filter((task) => backendDateMs(task.completedAt || task.requestedAt || task.receivedAt) >= oneHourAgo)
    .forEach((task) => {
      if (task.customerName) names.add(task.customerName);
    });
  return [...names].slice(0, 4).join("、") || fallback.slice(0, 4).join("、") || "暂无客户";
}

function taskNeedsHuman(task: WorkspaceTask) {
  const status = task.status.toLowerCase();
  return status.includes("pending") || status.includes("review") || status.includes("manual") || task.warnings.length > 0;
}

export function SCAgentExperience() {
  const { mails, tasks, stats } = useWorkspacePolling();
  const { customers } = useCustomerConfig();
  const [now, setNow] = useState(() => Date.now());
  const [eventIndex, setEventIndex] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showMessage, setShowMessage] = useState(false);
  const [history, setHistory] = useState<MessageHistoryItem[]>([]);
  const [activeTile, setActiveTile] = useState<number | null>(null);

  const messages = useMemo<AgentMessage[]>(() => {
    const mail = latestMail(mails);
    const customer = customerLabelFromId(customers, mail.customerId, mail.customerName || "未知客户");
    const attachmentStatus = mail.attachments.length
      ? mail.attachments.map((item) => `${item.fileName}：${item.status || "解析中"}`).join("；")
      : "暂无附件";
    const pendingTasks = stats?.pendingTasks ?? tasks.filter(taskNeedsHuman).slice(0, 3).map((task) => {
      const raw = task as WorkspaceTask & {
        task_id?: string;
        attachment_file_name?: string;
        attachment_id?: string;
        customer_name?: string | null;
      };
      return {
        taskId: task.id ?? raw.task_id ?? "",
        fileName: task.attachmentFileName ?? raw.attachment_file_name ?? task.attachmentId ?? raw.attachment_id ?? task.id ?? raw.task_id ?? "",
        customerName: task.customerName ?? raw.customer_name ?? null,
        status: task.status,
        reason: task.warnings?.[0] || "需要人工确认解析结果",
      };
    });
    const customerNames = stats?.customerNames ?? mails.map((item) => item.customerName).filter((item): item is string => Boolean(item));
    const completedLastHour = tasks.filter((task) => backendDateMs(task.completedAt) >= now - 60 * 60 * 1000).length;

    return [
      {
        key: "mail",
        tone: "mail",
        eyebrow: "新邮件",
        title: `收到 ${customer} 的未读邮件`,
        body: compactText(mail.bodyText || "邮件正文等待同步。"),
        rows: [
          { label: "主题", value: mail.subject || "未命名邮件" },
          { label: "附件", value: attachmentStatus },
          { label: "状态", value: mail.attachments.length ? "附件解析 Agent 正在处理" : "等待附件进入解析队列" },
        ],
        workflow: [
          { label: "Intake", status: "已接收" },
          { label: "Attachment Parse", status: mail.attachments.length ? "运行中" : "等待中" },
          { label: "Structure Extract", status: "排队" },
          { label: "Review Routing", status: "待触发" },
        ],
      },
      {
        key: "summary",
        tone: "summary",
        eyebrow: "小时汇总",
        title: "过去一小时工作摘要",
        body: `已完成 ${completedLastHour || stats?.completedCount || 0} 项解析/归一化动作，当前待处理 ${stats?.pendingCount ?? pendingTasks.length} 项，涉及客户：${relatedCustomerNames(mails, tasks, customerNames, now)}。`,
        rows: [
          { label: "完成解析", value: String(completedLastHour || stats?.completedCount || 0) },
          { label: "进入待办", value: String(stats?.pendingCount ?? pendingTasks.length) },
          { label: "需要跟催", value: String(stats?.followUpCount ?? 0) },
        ],
        workflow: [
          { label: "Mail Sync", status: "完成" },
          { label: "Document Parse", status: "完成" },
          { label: "Order Normalize", status: "完成" },
          { label: "Dashboard Update", status: "已同步" },
        ],
      },
      {
        key: "todo",
        tone: "todo",
        eyebrow: "人工干预",
        title: pendingTasks.length ? "有待处理事项需要确认" : "当前暂无人工干预事项",
        body: pendingTasks.length
          ? pendingTasks.slice(0, 2).map((task) => `${task.customerName || "未知客户"}：${task.reason}`).join("；")
          : "SCAgent 会继续监控解析异常、客户变更和附件缺失状态。",
        rows: pendingTasks.length
          ? pendingTasks.slice(0, 3).map((task) => ({ label: task.customerName || "待办", value: `${task.fileName} · ${task.status}` }))
          : [{ label: "待办", value: "0" }],
        workflow: [
          { label: "Risk Detect", status: pendingTasks.length ? "发现异常" : "监控中" },
          { label: "Human Review", status: pendingTasks.length ? "等待确认" : "空闲" },
          { label: "Apply Fix", status: "待后续动作" },
        ],
      },
    ];
  }, [customers, mails, now, stats, tasks]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const pushMessage = () => {
    const nextIndex = eventIndex % messages.length;
    const nextMessage = messages[nextIndex];
    setActiveIndex(nextIndex);
    setShowMessage(true);
    setEventIndex((current) => (current + 1) % messages.length);
    setHistory((items) => [
      {
        id: `${nextMessage.key}-${Date.now()}`,
        pushedAt: new Intl.DateTimeFormat("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date()),
        eyebrow: nextMessage.eyebrow,
        title: nextMessage.title,
      },
      ...items,
    ].slice(0, 6));
  };

  const message = messages[activeIndex % messages.length];
  const MessageIcon = message.tone === "todo" ? AlertTriangle : message.tone === "summary" ? CheckCircle2 : Mail;

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const column = Math.min(TILE_COLUMNS - 1, Math.max(0, Math.floor(((event.clientX - rect.left) / rect.width) * TILE_COLUMNS)));
    const row = Math.min(TILE_ROWS - 1, Math.max(0, Math.floor(((event.clientY - rect.top) / rect.height) * TILE_ROWS)));
    const nextTile = row * TILE_COLUMNS + column;
    setActiveTile((current) => current === nextTile ? current : nextTile);
  };

  const tileClassName = (index: number) => {
    if (activeTile === null) return "agent-tile";
    const activeColumn = activeTile % TILE_COLUMNS;
    const activeRow = Math.floor(activeTile / TILE_COLUMNS);
    const column = index % TILE_COLUMNS;
    const row = Math.floor(index / TILE_COLUMNS);
    const distance = Math.abs(activeColumn - column) + Math.abs(activeRow - row);
    if (distance === 0) return "agent-tile active";
    if (distance === 1) return "agent-tile near";
    if (distance === 2) return "agent-tile soft";
    return "agent-tile";
  };

  return (
    <section
      className={`sc-agent-experience${showMessage ? " notifying" : ""}`}
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
        <span className="field-node node-mail"><Mail size={18} /></span>
        <span className="field-node node-parse"><FileSearch size={18} /></span>
        <span className="field-node node-review"><UserCheck size={18} /></span>
        {Array.from({ length: 18 }, (_, index) => (
          <span className={`field-particle particle-${index + 1}`} key={index} />
        ))}
      </div>

      <div className="sc-agent-nameplate" aria-hidden="true">
        <span className="agent-title-line top" />
        <strong>Faurecia</strong>
        <span className="agent-title-line bottom" />
      </div>

      <button
        className="sc-agent-orb-button"
        type="button"
        aria-label="推送一条 SCAgent 消息"
        onClick={(event) => {
          event.stopPropagation();
          pushMessage();
        }}
      >
        <span className="sc-agent-orb">
          <span className="sc-agent-orb-grid" />
          <span className="sc-agent-neuron-layer">
            {Array.from({ length: 7 }, (_, index) => <span className={`neuron-line line-${index + 1}`} key={`line-${index}`} />)}
            {Array.from({ length: 3 }, (_, index) => <span className={`neuron-trail trail-${index + 1}`} key={`trail-${index}`} />)}
            {Array.from({ length: 3 }, (_, index) => <span className={`neuron-dot dot-${index + 1}`} key={`dot-${index}`} />)}
          </span>
          <span className="sc-agent-orb-aura" />
          <Sparkles aria-hidden="true" size={32} />
        </span>
      </button>

      <aside
        className={`sc-agent-message ${message.tone}${showMessage ? " visible" : ""}`}
        aria-live="polite"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="message-head">
          <span className="message-icon"><MessageIcon size={18} aria-hidden="true" /></span>
          <div>
            <span>{message.eyebrow}</span>
            <strong>{message.title}</strong>
          </div>
        </div>
        <p>{message.body}</p>
        <div className="message-rows">
          {message.rows.map((row) => (
            <div key={`${row.label}-${row.value}`}>
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
          ))}
        </div>
        <div className="message-workflow" aria-label="Agent 工作流">
          {message.workflow.map((step) => (
            <div key={`${message.key}-${step.label}`}>
              <span />
              <strong>{step.label}</strong>
              <em>{step.status}</em>
            </div>
          ))}
        </div>
        <div className="message-history" aria-label="历史推送消息">
          <div className="message-history-head">
            <strong>历史推送</strong>
            <span>{history.length} 条</span>
          </div>
          <div className="message-history-list">
            {history.map((item) => (
              <div key={item.id}>
                <time>{item.pushedAt}</time>
                <span>{item.eyebrow}</span>
                <strong>{item.title}</strong>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </section>
  );
}
