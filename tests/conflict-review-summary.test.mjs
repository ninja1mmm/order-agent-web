import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const sourcePath = path.resolve(
  "src/app/(main)/parse-review/_components/middle/conflict-review-summary.ts",
);
const source = fs.readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const context = { exports: {} };
vm.runInNewContext(compiled, context);
const { buildConflictReviewSummary, localizeReviewReason } = context.exports;

test("summarizes blocking and informative conflicts in Chinese", () => {
  const summary = buildConflictReviewSummary([
    { conflictFlag: "quantity_conflict" },
    { conflictFlag: "uncertain" },
    { conflictFlag: "potentially_incomplete" },
  ]);

  assert.equal(summary.title, "需要人工确认");
  assert.equal(summary.message, "2 条记录必须处理，1 条记录仅供参考。");
});

test("describes informative-only conflicts without claiming they block merging", () => {
  const summary = buildConflictReviewSummary([
    { conflictFlag: "potentially_incomplete" },
    { conflictFlag: "suspected_total" },
  ]);

  assert.equal(summary.title, "解析提示");
  assert.equal(summary.message, "检测到 2 条参考提示，不影响继续合并。");
});

test("returns no summary when rows have no conflicts", () => {
  assert.equal(buildConflictReviewSummary([
    { conflictFlag: "none" },
    { conflictFlag: null },
  ]), null);
});

test("localizes every review reason emitted by the extraction pipeline", () => {
  const cases = [
    [
      "Extraction partially failed: 2 chunk(s) had errors.",
      "部分内容提取失败：有 2 个分块处理异常，请检查解析结果后重试。",
    ],
    ["Reopened for re-editing", "任务已重新打开，可以继续编辑。"],
    [
      "26 rows have conflicts requiring review.",
      "有 26 条记录存在冲突，需要人工确认。",
    ],
    [
      "3 part numbers could not be mapped.",
      "有 3 个客户物料号未找到内部物料映射，请先完成映射。",
    ],
    [
      "Pipeline completed with 12 row(s). Please review and confirm before publishing.",
      "解析流程已完成，共 12 条记录。请检查并确认后发布。",
    ],
  ];

  for (const [reason, expected] of cases) {
    assert.equal(localizeReviewReason(reason), expected);
  }
});

test("keeps an unknown review reason so information is not lost", () => {
  assert.equal(localizeReviewReason("A new backend reason"), "A new backend reason");
});
