"use client";

import type { MouseEvent } from "react";
import { Sparkles } from "lucide-react";
import { CartoonAgent } from "./cartoon-agent";
import type { AgentMood, AgentViewMode } from "./sc-agent-types";

type AgentActionButtonProps = {
  viewMode: AgentViewMode;
  agentMood: AgentMood;
  onPushMessage: () => void;
};

export function AgentActionButton({ viewMode, agentMood, onPushMessage }: AgentActionButtonProps) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onPushMessage();
  };

  return (
    <button
      className={`sc-agent-orb-button ${viewMode === "employee" ? "avatar-view" : "orb-view"}`}
      type="button"
      aria-label="推送一条 SCAgent 消息"
      onClick={handleClick}
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
  );
}
