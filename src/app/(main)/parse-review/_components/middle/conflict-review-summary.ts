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
