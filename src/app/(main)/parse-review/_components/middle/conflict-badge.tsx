"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type ConflictBadgeProps = {
  conflict: string;
  details: string;
};

export function ConflictBadge({ conflict, details }: ConflictBadgeProps) {
  const config = conflictConfig(conflict);
  if (!config) return null;

  const description = conflict === "uncertain"
    ? "无法根据文档内容确定这是确认订单还是预测，请手动选择。"
    : translateConflictDetails(details) || config.fallback;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className="cursor-help focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--forvia-blue-soft)]" variant={config.variant} tabIndex={0}>
          {config.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="space-y-1" side="top">
        <p>{description}</p>
        <p className={config.blocking ? "text-rose-200" : "text-amber-200"}>{config.blocking ? "必须处理后才能合并" : "仅供参考，不阻塞合并"}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function conflictConfig(conflict: string) {
  if (conflict === "quantity_conflict") return { label: "数量冲突", variant: "red" as const, blocking: true, fallback: "同一物料和日期存在多个不同数量，请核对原文。" };
  if (conflict === "granularity_mismatch") return { label: "粒度不匹配", variant: "red" as const, blocking: true, fallback: "日、周或月等不同时间粒度的数量合计不一致。" };
  if (conflict === "invalid_date") return { label: "日期无效", variant: "red" as const, blocking: true, fallback: "日期超出有效范围，请修正日期或日期粒度。" };
  if (conflict === "uncertain") return { label: "待分类", variant: "red" as const, blocking: true, fallback: "请指定确认订单或预测。" };
  if (conflict === "suspected_total") return { label: "疑似合计 ⓘ", variant: "slate" as const, blocking: false, fallback: "该数量可能是合计列，而不是独立需求。" };
  if (conflict === "potentially_incomplete") return { label: "疑似不完整 ⓘ", variant: "amber" as const, blocking: false, fallback: "该物料的日期覆盖可能不完整，请对照原文检查续行。" };
  return null;
}

function translateConflictDetails(details: string) {
  return details
    .replace(/^Quantity conflict:\s*/i, "同一物料和日期存在不同数量：")
    .replace(/(-?\d+|None) \((\d+)x\)/g, (_match, quantity: string, count: string) => `${quantity === "None" ? "空值" : quantity}（出现 ${count} 次）`)
    .replace(/Week (\d+) does not exist in year (\d+) \(max: W(\d+)\)\. Original date_info: '([^']*)'\. Please correct date_info or date_format\./gi, "第 $1 周在 $2 年不存在（最大为 W$3）。原始日期：$4。请修正日期或日期粒度。")
    .replace(/Cross-granularity mismatch also detected\./gi, "同时检测到不同时间粒度的数量合计不一致。")
    .replace(/Cross-granularity mismatch detected\./gi, "检测到日、周或月等不同时间粒度的数量合计不一致。")
    .replace(/Quantity (-?\d+) equals sum of all other rows for part ([^.]+)\. Likely a total\/sum column\./gi, "物料 $2 的数量 $1 等于其他记录的数量之和，该列可能是合计列。")
    .replace(/Part (.+?) coverage ends at date position (\d+)\/(\d+) \(median across parts: (\d+)\)\. Continuation line may have been missed\./gi, "物料 $1 的日期覆盖截止到第 $2/$3 个日期位置，而各物料截止位置的中位数为第 $4 个；可能漏识别了续行。")
    .trim();
}
