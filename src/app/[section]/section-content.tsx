"use client";

import { Suspense } from "react";
import { LiveSectionContent } from "./live-sections";

export function SectionContent({ section }: { section: string }) {
  return (
    <Suspense fallback={null}>
      <LiveSectionContent section={section} />
    </Suspense>
  );
}
