import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const sourcePath = path.resolve("src/lib/mail-inline-images.ts");
const source = fs.readFileSync(sourcePath, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const context = { exports: {} };
vm.runInNewContext(compiled, context);
const { replaceInlineImageCids, stripInlineImageCidPlaceholders } = context.exports;

test("replaces an email cid with its streamed file URL", () => {
  const result = replaceInlineImageCids(
    '<p>Plan</p><img src="cid:Image001%40example.com">',
    [{
      imageId: "internal-image-id",
      contentId: "<image001@example.com>",
      fileArtifactId: "artifact/id",
      contentType: "image/png",
    }],
    "",
  );

  assert.equal(result, '<p>Plan</p><img src="/api/files/artifact%2Fid/content">');
});

test("does not confuse the internal image id with the MIME content id", () => {
  const html = '<img src="cid:internal-image-id">';
  const result = replaceInlineImageCids(
    html,
    [{
      imageId: "internal-image-id",
      contentId: "actual-content-id",
      fileArtifactId: "artifact-id",
      contentType: "image/png",
    }],
    "",
  );

  assert.equal(result, html);
});

test("removes a plain-text cid placeholder when the matching image is available", () => {
  const result = stripInlineImageCidPlaceholders(
    "Signature\n[cid:image001.png@EXAMPLE]\nThanks",
    [{
      imageId: "internal-image-id",
      contentId: "image001.png@example",
      fileArtifactId: "artifact-id",
      contentType: "image/png",
    }],
  );

  assert.equal(result, "Signature\n\nThanks");
});
