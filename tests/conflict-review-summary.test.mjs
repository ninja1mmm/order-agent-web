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
const { buildConflictReviewSummary } = context.exports;

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
