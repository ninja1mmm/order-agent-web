"use client";

import type { MouseEvent, ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Mail,
} from "lucide-react";
import type { WorkspaceMail, WorkspaceTask } from "@/services/inbox";
import type { CustomerConfig } from "@/services/settings";
import type { CardTone, SummaryStats } from "./sc-agent-types";
import { AgentMailCard } from "./agent-mail-card";
import { AgentSummaryCard } from "./agent-summary-card";
import { AgentTodoCard } from "./agent-todo-card";

type AgentMessageCardProps = {
  activeTone: CardTone;
  showMessage: boolean;
  mails: WorkspaceMail[];
  tasks: WorkspaceTask[];
  latestMails: WorkspaceMail[];
  pendingHumanTasks: WorkspaceTask[];
  customers: CustomerConfig[];
  summaryStats: SummaryStats;
  expandedMails: Set<string>;
  expandedTasks: Set<string>;
  now: number;
  onToggleMail: (id: string) => void;
  onToggleTask: (id: string) => void;
};

export function AgentMessageCard({
  activeTone,
  showMessage,
  mails,
  tasks,
  latestMails,
  pendingHumanTasks,
  customers,
  summaryStats,
  expandedMails,
  expandedTasks,
  now,
  onToggleMail,
  onToggleTask,
}: AgentMessageCardProps) {
  const MessageIcon =
    activeTone === "todo"
      ? AlertTriangle
      : activeTone === "summary"
        ? CheckCircle2
        : Mail;

  const stopClick = (event: MouseEvent<HTMLElement>) => event.stopPropagation();

  return (
    <aside
      className={`sc-agent-message ${activeTone}${showMessage ? " visible" : ""}`}
      aria-live="polite"
      onClick={stopClick}
    >
      <MessageHeader activeTone={activeTone} icon={<MessageIcon size={18} aria-hidden="true" />} count={activeTone === "mail" ? latestMails.length : pendingHumanTasks.length} />
      {activeTone === "summary" ? (
        <AgentSummaryCard
          mails={mails}
          tasks={tasks}
          summaryStats={summaryStats}
          now={now}
        />
      ) : activeTone === "mail" ? (
        <AgentMailCard
          mails={latestMails}
          customers={customers}
          expandedMails={expandedMails}
          onToggleMail={onToggleMail}
        />
      ) : (
        <AgentTodoCard
          tasks={pendingHumanTasks}
          customers={customers}
          expandedTasks={expandedTasks}
          onToggleTask={onToggleTask}
        />
      )}
    </aside>
  );
}

function MessageHeader({
  activeTone,
  icon,
  count,
}: {
  activeTone: CardTone;
  icon: ReactNode;
  count: number;
}) {
  const title = activeTone === "summary" ? "小时汇总" : activeTone === "mail" ? "收到邮件" : "人工干预";
  const subtitle = activeTone === "summary"
    ? "过去一小时工作摘要"
    : activeTone === "mail"
      ? `最新 ${count} 封`
      : count
        ? `${count} 项待处理`
        : "暂无事项";

  return (
    <div className="message-head">
      <span className="message-icon">
        {icon}
      </span>
      <div className="message-head-inline">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
    </div>
  );
}
