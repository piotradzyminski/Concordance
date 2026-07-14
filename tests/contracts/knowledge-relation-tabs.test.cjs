"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("Knowledge relation UI uses protruding left tabs", () => {
  const css = read("css/knowledge-sections.css");
  assert.match(css, /\.knowledge-related-list\s*\{[\s\S]*padding-left:\s*18px/);
  assert.match(css, /\.knowledge-related-link::before[\s\S]*left:\s*-18px/);
  assert.match(css, /\.knowledge-related-link:hover[\s\S]*translateX\(-2px\)/);
});

test("System Index renderer and editor do not expose Encyclopedia relations", () => {
  const source = read("js/system-registry.js");
  assert.match(source, /registry !== "system-index" && termRefs\.length/);
  assert.match(source, /normalizedRegistry !== "system-index" \? renderEntryTextarea\("relatedTerms"/);
  assert.match(source, /relatedTerms:\s*registry === "system-index"\s*\? \[\]/);
});

test("Knowledge relation contract isolates System Index and Encyclopedia", () => {
  const relations = read("js/knowledge-relations.js");
  assert.match(relations, /"system-index":\s*\{\s*relatedEntries:\s*"system-index"\s*\}/);
  assert.doesNotMatch(relations, /"system-index":\s*\{\s*relatedTerms:/);
  assert.match(relations, /removedCrossRegistry/);

  const entriesStore = read("js/entries-store.js");
  assert.match(entriesStore, /delete normalized\.relatedEntries/);

  const systemStore = read("js/system-store.js");
  assert.match(systemStore, /normalized\.registry === "system-index"[\s\S]*normalized\.relatedTerms = \[\]/);
});
