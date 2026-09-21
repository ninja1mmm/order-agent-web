const BLOCKING_CONFLICT_FLAGS = new Set([
  "quantity_conflict",
  "granularity_mismatch",
  "invalid_date",
  "uncertain",
]);

export type ConflictReviewSummary = {
  title: string;
  message: string;
};

export function buildConflictReviewSummary(
  rows: Record<string, unknown>[],
): ConflictReviewSummary | null {
  let blockingCount = 0;
  let informativeCount = 0;

  for (const row of rows) {
    const flag = String(row.conflictFlag ?? "none");
    if (!flag || flag === "none") continue;
    if (BLOCKING_CONFLICT_FLAGS.has(flag)) blockingCount += 1;
    else informativeCount += 1;
  }

  if (blockingCount > 0 && informativeCount > 0) {
    return {
      title: "需要人工确认",
      message: `${blockingCount} 条记录必须处理，${informativeCount} 条记录仅供参考。`,
    };
  }
  if (blockingCount > 0) {
    return {
      title: "需要人工确认",
      message: `检测到 ${blockingCount} 条必须处理的异常，请修正后重新校验。`,
    };
  }
  if (informativeCount > 0) {
    return {
      title: "解析提示",
      message: `检测到 ${informativeCount} 条参考提示，不影响继续合并。`,
    };
  }
  return null;
}

export function localizeReviewReason(reason: string | null): string | null {
  if (!reason) return null;

  let match = reason.match(/^Extraction partially failed: (\d+) chunk\(s\) had errors\.$/);
  if (match) {
    return `部分内容提取失败：有 ${match[1]} 个分块处理异常，请检查解析结果后重试。`;
  }

  if (reason === "Reopened for re-editing") {
    return "任务已重新打开，可以继续编辑。";
  }

  match = reason.match(/^(\d+) rows have conflicts requiring review\.$/);
  if (match) {
    return `有 ${match[1]} 条记录存在冲突，需要人工确认。`;
  }

  match = reason.match(/^(\d+) part numbers could not be mapped\.$/);
  if (match) {
    return `有 ${match[1]} 个客户物料号未找到内部物料映射，请先完成映射。`;
  }

  match = reason.match(/^Pipeline completed with (\d+) row\(s\)\. Please review and confirm before publishing\.$/);
  if (match) {
    return `解析流程已完成，共 ${match[1]} 条记录。请检查并确认后发布。`;
  }

  return reason;
}
