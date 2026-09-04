"use client";

import { Badge } from "@/components/ui/badge";

type ConflictBadgeProps = {
  conflict: string;
  details: string;
};

export function ConflictBadge({ conflict, details }: ConflictBadgeProps) {
  // Blocking flags — red, must resolve before publish
  if (conflict === "quantity_conflict") {
    return <Badge variant="red" title={`${details}\n必须处理`}>数量冲突</Badge>;
  }
  if (conflict === "granularity_mismatch") {
    return <Badge variant="red" title={`${details}\n必须处理`}>粒度不匹配</Badge>;
  }
  if (conflict === "invalid_date") {
    return <Badge variant="red" title={`${details}\n必须处理`}>日期无效</Badge>;
  }
  if (conflict === "uncertain") {
    return <Badge variant="red" title="请指定确认订单或预测\n必须处理">待分类</Badge>;
  }
  // Informative flags — muted, do not block publish
  if (conflict === "suspected_total") {
    return <Badge variant="slate" title={`${details}\n仅供参考`}>疑似合计 ⓘ</Badge>;
  }
  if (conflict === "potentially_incomplete") {
    return <Badge variant="amber" title={`${details}\n仅供参考`}>疑似不完整 ⓘ</Badge>;
  }
  return null;
}
