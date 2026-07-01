import type { Metadata } from "next";
import { SCAgentExperience } from "./_components/sc-agent-experience";

export const metadata: Metadata = {
  title: "SCAgent | Supply Chain Agent",
  description: "Virtual supply chain agent showcase",
};

export default function SCAgentPage() {
  return <SCAgentExperience />;
}
