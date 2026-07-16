"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

test("Knowledge relation UI uses a deterministic grid viewport with equal wrapped tabs", () => {
  const css = read("css/knowledge-sections.css");
  const system = read("js/system-registry.js");
  const encyclopedia = read("js/encyclopedia-module.js");

  assert.match(css, /@media \(min-width: 1280px\)[\s\S]*\.knowledge-record-layout--with-sidecar/);
  assert.match(css, /\.knowledge-record-layout--with-sidecar \{[\s\S]*grid-template-columns:\s*184px minmax\(0, 1fr\)[\s\S]*width:\s*calc\(100% \+ 184px\)[\s\S]*margin-left:\s*-184px/);
  assert.match(css, /\.knowledge-record-layout--with-sidecar \.knowledge-related-sidecar\s*\{[^}]*position:\s*static[^}]*grid-column:\s*1[^}]*width:\s*184px[^}]*padding:\s*48px 0 0/);
  assert.match(css, /\.knowledge-record-layout--with-sidecar \.knowledge-reading-panel\s*\{[^}]*z-index:\s*auto[^}]*grid-column:\s*2[^}]*background:\s*var\(--panel\)[^}]*box-shadow:\s*none/);
  assert.match(css, /\.knowledge-related-sidecar \.knowledge-related-box > b\s*\{[^}]*width:\s*184px[^}]*background:\s*transparent[^}]*text-align:\s*right/);
  assert.match(css, /\.knowledge-related-sidecar \.knowledge-related-list\s*\{[^}]*width:\s*168px[^}]*max-width:\s*168px[^}]*overflow:\s*hidden/);
  assert.match(css, /\.knowledge-related-sidecar \.knowledge-related-link,[\s\S]*width:\s*226px[\s\S]*height:\s*68px[\s\S]*background:\s*#070b0c[\s\S]*white-space:\s*normal/);
  assert.match(css, /\.knowledge-related-sidecar \.knowledge-related-link__label\s*\{[^}]*max-width:\s*142px[^}]*overflow-wrap:\s*anywhere[^}]*text-wrap:\s*balance/);
  assert.match(css, /\.knowledge-related-sidecar \.knowledge-related-list::before,[\s\S]*content:\s*none/);
  assert.match(css, /\.knowledge-related-sidecar \.knowledge-related-link:hover,[\s\S]*transform:\s*none/);
  assert.doesNotMatch(css, /\.knowledge-record-layout--with-sidecar \.knowledge-related-sidecar\s*\{[^}]*position:\s*absolute/);
  assert.doesNotMatch(css, /\.knowledge-record-layout--with-sidecar \.knowledge-related-sidecar\s*\{[^}]*z-index:\s*-1/);
  assert.doesNotMatch(css, /\.knowledge-record-layout--with-sidecar\s*\{[^}]*isolation:\s*isolate/);
  assert.doesNotMatch(css, /\.knowledge-related-sidecar \.knowledge-related-list\s*\{[^}]*clip-path:/);
  assert.doesNotMatch(css, /\.knowledge-related-sidecar \.knowledge-related-link(?:__label)?\s*\{[^}]*!important/);
  assert.match(system, /<aside class="knowledge-related-sidecar"/);
  assert.match(system, /knowledge-related-link__label/);
  assert.match(encyclopedia, /<aside class="knowledge-related-sidecar"/);
  assert.match(encyclopedia, /knowledge-related-link__label/);
});

test("System Index renderer and editor do not expose Encyclopedia relations", () => {
  const source = read("js/system-registry.js");
  assert.match(source, /registry !== "system-index" && termRefs\.length/);
  assert.match(source, /normalizedRegistry !== "system-index" \? window\.WS_APP\.registryUI\.renderTextarea\("relatedTerms"/);
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
