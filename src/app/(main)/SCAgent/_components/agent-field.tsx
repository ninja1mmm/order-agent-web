"use client";

import { FileSearch, Mail, UserCheck } from "lucide-react";
import { TILE_COUNT } from "./sc-agent-types";

type AgentFieldProps = {
  tileClassName: (index: number) => string;
};

export function AgentField({ tileClassName }: AgentFieldProps) {
  return (
    <>
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
    </>
  );
}
