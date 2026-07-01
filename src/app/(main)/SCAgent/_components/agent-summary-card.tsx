"use client";

import type { WorkspaceMail, WorkspaceTask } from "@/services/inbox";
import type { SummaryStats } from "./sc-agent-types";
import { relatedCustomerNames } from "./sc-agent-utils";

type AgentSummaryCardProps = {
  mails: WorkspaceMail[];
  tasks: WorkspaceTask[];
  summaryStats: SummaryStats;
  now: number;
};

export function AgentSummaryCard({
  mails,
  tasks,
  summaryStats,
  now,
}: AgentSummaryCardProps) {
  return (
    <>
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
  );
}
