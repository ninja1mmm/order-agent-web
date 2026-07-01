"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { WorkspaceTask } from "@/services/inbox";

type MappingStatusProps = {
  value: unknown;
  selectedTask: WorkspaceTask | undefined;
  customerPartNumber: string;
  langParam: string | null;
};

export function MappingStatus({
  value,
  selectedTask,
  customerPartNumber,
  langParam,
}: MappingStatusProps) {
  if (value === "unmapped") {
    const href = `/system-settings?tab=materials&customerId=${encodeURIComponent(selectedTask?.customerId ?? "")}&addPN=${encodeURIComponent(customerPartNumber)}${langParam ? `&lang=${langParam}` : ""}`;
    return (
      <Link href={href}>
        <Badge variant="amber" style={{ cursor: "pointer" }}>unmapped</Badge>
      </Link>
    );
  }

  if (value === "mapped") return <Badge variant="green">mapped</Badge>;
  return String(value ?? "");
}
