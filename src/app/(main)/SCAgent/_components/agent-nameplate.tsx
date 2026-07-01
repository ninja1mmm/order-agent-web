"use client";

import type { MouseEvent } from "react";
import type { AgentViewMode } from "./sc-agent-types";

type AgentNameplateProps = {
  viewMode: AgentViewMode;
  onToggleViewMode: () => void;
};

export function AgentNameplate({ viewMode, onToggleViewMode }: AgentNameplateProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onToggleViewMode();
  };

  return (
    <button
      className="sc-agent-nameplate agent-flip-toggle"
      type="button"
      aria-label={`切换为${viewMode === "orb" ? "卡通数字员工" : "光球智能体"}`}
      aria-pressed={viewMode === "employee"}
      onClick={handleClick}
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
  );
}
