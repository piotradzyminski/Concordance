"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("Knowledge relation UI renders equal-length wrapped tabs on a deeper layer without a heading strip", () => {
  const css = read("css/knowledge-sections.css");
  const system = read("js/system-registry.js");
  const encyclopedia = read("js/encyclopedia-module.js");

  assert.match(css, /@media \(min-width: 1280px\)[\s\S]*\.knowledge-record-layout--with-sidecar/);
  assert.match(css, /isolation:\s*isolate/);
  assert.match(css, /\.knowledge-record-layout--with-sidecar \.knowledge-related-sidecar[\s\S]*position:\s*absolute[\s\S]*z-index:\s*-1[\s\S]*left:\s*-184px[\s\S]*width:\s*226px/);
  assert.match(css, /\.knowledge-record-layout--with-sidecar \.knowledge-reading-panel[\s\S]*z-index:\s*3[\s\S]*overflow:\s*hidden[\s\S]*background:\s*#0b1011[\s\S]*box-shadow:\s*-2px 0 0 #0b1011/);
  assert.match(css, /\.knowledge-related-sidecar \.knowledge-related-box > b[\s\S]*width:\s*184px[\s\S]*background:\s*transparent[\s\S]*text-align:\s*right/);
  assert.match(css, /\.knowledge-related-sidecar \.knowledge-related-link,[\s\S]*width:\s*226px[\s\S]*height:\s*68px[\s\S]*background:\s*#070b0c[\s\S]*white-space:\s*normal !important/);
  assert.match(css, /\.knowledge-related-sidecar \.knowledge-related-link__label[\s\S]*max-width:\s*142px[\s\S]*overflow-wrap:\s*anywhere[\s\S]*text-wrap:\s*balance/);
  assert.match(css, /\.knowledge-related-sidecar \.knowledge-related-list[\s\S]*clip-path:\s*inset\(0 58px 0 0\)/);
  assert.match(css, /\.knowledge-related-sidecar \.knowledge-related-list::before,[\s\S]*content:\s*none/);
  assert.match(css, /\.knowledge-related-sidecar \.knowledge-related-link:hover,[\s\S]*transform:\s*none/);
  assert.match(system, /<aside class="knowledge-related-sidecar"/);
  assert.match(system, /knowledge-related-link__label/);
  assert.match(encyclopedia, /<aside class="knowledge-related-sidecar"/);
  assert.match(encyclopedia, /knowledge-related-link__label/);
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
