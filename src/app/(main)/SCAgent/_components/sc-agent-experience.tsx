"use client";

import { useMemo, useState, type PointerEvent } from "react";
import { AgentActionButton } from "./agent-action-button";
import { AgentField } from "./agent-field";
import { AgentMessageCard } from "./agent-message-card";
import { AgentNameplate } from "./agent-nameplate";
import {
  TILE_COLUMNS,
  TILE_ROWS,
  TONE_ORDER,
  TONE_TO_MOOD,
  type AgentMood,
  type AgentViewMode,
  type SummaryStats,
} from "./sc-agent-types";
import {
  agentTileClassName,
  taskNeedsHuman,
} from "./sc-agent-utils";
import {
  backendDateMs,
  useCustomerConfig,
  useWorkspacePolling,
} from "../../_components/shared";

export function SCAgentExperience() {
  const { mails, tasks, stats } = useWorkspacePolling();
  const { customers } = useCustomerConfig();
  const [eventIndex, setEventIndex] = useState(0);
  const [showMessage, setShowMessage] = useState(false);
  const [activeTile, setActiveTile] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<AgentViewMode>("orb");
  const [expandedMails, setExpandedMails] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [now] = useState(() => Date.now());

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

  const summaryStats: SummaryStats = useMemo(() => {
    const completedLastHour = tasks.filter(
      (task) => backendDateMs(task.completedAt) >= now - 60 * 60 * 1000,
    ).length;
    const customerNames =
      stats?.customerNames ??
      mails
        .map((mail) => mail.customerName)
        .filter((name): name is string => Boolean(name));

    return {
      completedCount: stats?.completedCount ?? completedLastHour,
      completedLastHour,
      pendingCount: stats?.pendingCount ?? pendingHumanTasks.length,
      followUpCount: stats?.followUpCount ?? 0,
      mailCount: stats?.mailCount ?? mails.length,
      customerNames,
    };
  }, [mails, tasks, stats, pendingHumanTasks, now]);

  const agentMood: AgentMood = !showMessage
    ? "idle"
    : TONE_TO_MOOD[activeTone];

  const pushMessage = () => {
    setShowMessage(true);
    setEventIndex((index) => (index + 1) % TONE_ORDER.length);
  };

  const toggleMail = (id: string) =>
    setExpandedMails((prev) => toggleSetValue(prev, id));

  const toggleTask = (id: string) =>
    setExpandedTasks((prev) => toggleSetValue(prev, id));

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
      <AgentField tileClassName={(index) => agentTileClassName(activeTile, index)} />
      <AgentNameplate
        viewMode={viewMode}
        onToggleViewMode={() => setViewMode((current) => (current === "orb" ? "employee" : "orb"))}
      />
      <AgentActionButton
        viewMode={viewMode}
        agentMood={agentMood}
        onPushMessage={pushMessage}
      />
      <AgentMessageCard
        activeTone={activeTone}
        showMessage={showMessage}
        mails={mails}
        tasks={tasks}
        latestMails={latestMails}
        pendingHumanTasks={pendingHumanTasks}
        customers={customers}
        summaryStats={summaryStats}
        expandedMails={expandedMails}
        expandedTasks={expandedTasks}
        now={now}
        onToggleMail={toggleMail}
        onToggleTask={toggleTask}
      />
    </section>
  );
}

function toggleSetValue<T>(set: Set<T>, value: T) {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}
