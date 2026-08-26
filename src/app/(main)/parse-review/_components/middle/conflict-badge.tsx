"use client";

import { Badge } from "@/components/ui/badge";

type ConflictBadgeProps = {
  conflict: string;
  details: string;
};

export function ConflictBadge({ conflict, details }: ConflictBadgeProps) {
  if (conflict === "granularity_mismatch") {
    return <Badge variant="amber" title={details}>粒度不匹配</Badge>;
  }
  if (conflict === "quantity_conflict") {
    return <Badge variant="red" title={details}>数量冲突</Badge>;
  }
  if (conflict === "suspected_total") {
    return <Badge variant="slate" title={details}>疑似合计</Badge>;
  }
  if (conflict === "potentially_incomplete") {
    return <Badge variant="amber" title={details}>疑似不完整</Badge>;
  }
  return null;
}
