"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

test("index.html has no missing or duplicate local script assets", () => {
  const html = fs.readFileSync(path.join(PROJECT_ROOT, "index.html"), "utf8");
  const references = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)]
    .map((match) => match[1])
    .filter((src) => !/^(?:https?:)?\/\//i.test(src))
    .map((src) => src.split("?")[0].replace(/^\.\//, ""));
  const missing = references.filter((src) => !fs.existsSync(path.join(PROJECT_ROOT, src)));
  const duplicates = references.filter((src, index) => references.indexOf(src) !== index);

  assert.deepEqual(missing, []);
  assert.deepEqual([...new Set(duplicates)], []);
});

test("runtime JavaScript does not use eval or the Function constructor", () => {
  const runtimeDirectories = ["js", "data"];
  const violations = [];
  for (const directory of runtimeDirectories) {
    for (const filename of fs.readdirSync(path.join(PROJECT_ROOT, directory))) {
      if (!filename.endsWith(".js")) continue;
      const relativePath = `${directory}/${filename}`;
      const source = fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
      if (/\beval\s*\(/.test(source) || /\bnew\s+Function\s*\(/.test(source)) violations.push(relativePath);
    }
  }
  assert.deepEqual(violations, []);
});
