import assert from "node:assert/strict";
import test from "node:test";

import { phaseOnePages } from "../src/config/navigation.mjs";

test("phase one exposes the operational pages, Skill Studio, and settings", () => {
  assert.deepEqual(
    phaseOnePages.map((page) => page.key),
    ["intelligent-service", "task-workbench", "parse-review", "orders", "skill-studio", "customer-profile", "financial-reconciliation", "system-settings"],
  );
});

test("every page has a stable production route", () => {
  const routes = new Set();
  for (const page of phaseOnePages) {
    assert.match(page.productionPath, /^\//);
    routes.add(page.productionPath);
  }
  assert.equal(routes.size, phaseOnePages.length);
});

test("prototype references remain metadata only", () => {
  for (const page of phaseOnePages) {
    assert.match(page.prototypePath, /^\/prototype-3\.0\/.+\.html$/);
  }
});
