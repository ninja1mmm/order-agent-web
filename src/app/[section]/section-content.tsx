"use client";

import dynamic from "next/dynamic";

const LiveSectionContent = dynamic(
  () => import("./live-sections").then((m) => m.LiveSectionContent),
  { ssr: false },
);

export function SectionContent({ section }: { section: string }) {
  return <LiveSectionContent section={section} />;
}
