import Image from "next/image";
import { FileSearch, Mail } from "lucide-react";

export type CartoonAgentMood = "idle" | "received" | "processing" | "complete";

type CartoonAgentProps = {
  mood: CartoonAgentMood;
};

const characterByMood: Record<CartoonAgentMood, { src: string; className: string }> = {
  idle: { src: "/sc-agent/digital-employee-idle.png", className: "image-idle" },
  received: { src: "/sc-agent/digital-employee-idle-ver2.0.png", className: "image-received" },
  processing: { src: "/sc-agent/digital-employee-processing-ver2.0.png", className: "image-processing" },
  complete: { src: "/sc-agent/digital-employee-complete-ver2.0.png", className: "image-complete" },
};

export function CartoonAgent({ mood }: CartoonAgentProps) {
  const character = characterByMood[mood];

  return (
    <span className="sc-agent-employee" data-mood={mood} aria-hidden="true">
      <span className="employee-status-glow" />
      <span className="employee-progress-ring" />
      <span className="employee-document document-one"><Mail size={18} /></span>
      <span className="employee-document document-two"><FileSearch size={18} /></span>
      <span className="employee-spark spark-one" />
      <span className="employee-spark spark-two" />
      <span className="employee-spark spark-three" />
      <span className="employee-image-frame">
        <Image
          key={character.src}
          className={`employee-state-image ${character.className}`}
          src={character.src}
          alt=""
          width={320}
          height={860}
          priority
        />
      </span>
    </span>
  );
}
