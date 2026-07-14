"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("Knowledge relation UI renders tabs behind an opaque article edge without connector lines", () => {
  const css = read("css/knowledge-sections.css");
  const system = read("js/system-registry.js");
  const encyclopedia = read("js/encyclopedia-module.js");

  assert.match(css, /@media \(min-width: 1280px\)[\s\S]*\.knowledge-record-layout--with-sidecar/);
  assert.match(css, /isolation:\s*isolate/);
  assert.match(css, /grid-template-columns:\s*212px minmax\(0, 1fr\)/);
  assert.match(css, /margin-left:\s*-212px/);
  assert.match(css, /\.knowledge-related-sidecar[\s\S]*z-index:\s*0/);
  assert.match(css, /\.knowledge-reading-panel[\s\S]*z-index:\s*2[\s\S]*background:\s*#0b1011/);
  assert.match(css, /\.knowledge-related-sidecar \.knowledge-related-link,[\s\S]*right:\s*-24px/);
  assert.match(css, /\.knowledge-related-sidecar \.knowledge-related-list::before,[\s\S]*content:\s*none/);
  assert.match(system, /<aside class="knowledge-related-sidecar"/);
  assert.match(encyclopedia, /<aside class="knowledge-related-sidecar"/);
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
