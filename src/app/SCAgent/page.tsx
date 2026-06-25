import type { Metadata } from "next";
import { TopNav } from "../product-shell";
import { SCAgentExperience } from "./sc-agent-experience";

export const metadata: Metadata = {
  title: "SCAgent | Supply Chain Agent",
  description: "Virtual supply chain agent showcase",
};

export default function SCAgentPage() {
  return (
    <div className="app-shell sc-agent-shell">
      <div className="sc-agent-nav-hotspot" aria-hidden="true" />
      <TopNav active="/SCAgent" />
      <main className="sc-agent-page">
        <SCAgentExperience />
      </main>
    </div>
  );
}
