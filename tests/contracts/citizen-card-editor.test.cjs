"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

function read(relativePath) {
  return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");
}

test("Citizen Card Editor loads separate profile and admin workspaces", () => {
  const html = read("index.html");
  assert.match(html, /css\/citizen-profile-editor\.css\?v=2/);
  assert.match(html, /css\/citizen-admin-editor\.css\?v=3/);
  assert.match(html, /js\/citizen-profile-editor\.js\?v=2/);
  assert.match(html, /js\/citizen-admin-editor\.js\?v=5/);
});

test("Citizen editor router does not inject buttons through MutationObserver", () => {
  const router = read("js/citizen-editor.js");
  assert.doesNotMatch(router, /MutationObserver/);
  assert.doesNotMatch(router, /querySelectorAll\(\s*["']\[data-citizen-id\]/);

  const profile = read("js/citizen-profile.js");
  const records = read("js/citizen-records.js");
  assert.match(profile, /data-citizen-editor-open/);
  assert.match(records, /data-citizen-editor-open/);
});

test("Citizen Profile Editor does not expose canonical external domains", () => {
  const source = read("js/citizen-profile-editor.js");
  assert.match(source, /updateCitizenSelfProfile/);
  assert.doesNotMatch(source, /adminAdjustCitizenAccount/);
  assert.doesNotMatch(source, /SubscriptionAPI/);
  assert.doesNotMatch(source, /serviceLog/);
  assert.doesNotMatch(source, /setCitizenRisk/);
});

test("Admin Citizen Editor uses section-specific Citizen commands and linked-domain navigation", () => {
  const source = read("js/citizen-admin-editor.js");
  assert.match(source, /adminUpdateCitizenRecord/);
  assert.match(source, /adminCorrectCitizenMechanics/);
  assert.match(source, /adminUpdateCitizenAccess/);
  assert.match(source, /setCitizenRisk/);
  assert.match(source, /Linked Domains/);
  assert.doesNotMatch(source, /updateCitizen\?\./);
  assert.doesNotMatch(source, /patch\.credits|patch\.debt|patch\.subscriptions|patch\.serviceLog/);
});


test("Citizen polish loads templates and Quick NPC Creator through explicit assets", () => {
  const html = read("index.html");
  assert.match(html, /data\/citizen-templates\.js\?v=1/);
  assert.match(html, /js\/citizen-template-service\.js\?v=1/);
  assert.match(html, /css\/citizen-quick-npc\.css\?v=1/);
  assert.match(html, /js\/citizen-quick-npc\.js\?v=1/);

  const records = read("js/citizen-records.js");
  const quickNpc = read("js/citizen-quick-npc.js");
  assert.match(records, /id="citizen-quick-npc-button"/);
  assert.match(quickNpc, /createQuickNpc/);
  assert.doesNotMatch(quickNpc, /patch\.credits|patch\.debt|SubscriptionAPI|serviceLog/);
});

test("Citizen workspaces expose keyboard save and section navigation shortcuts", () => {
  const creator = read("js/citizen-creator.js");
  const profile = read("js/citizen-profile-editor.js");
  const admin = read("js/citizen-admin-editor.js");
  assert.match(creator, /event\.altKey/);
  assert.match(creator, /citizen-creator-shortcuts/);
  assert.match(profile, /form\.requestSubmit\(\)/);
  assert.match(admin, /Alt\+1–6 sections/);
  assert.match(admin, /saveSection\(activeTab\)/);
});

test("Citizen polish preserves Admin Audit producers from Card Editor 2.0x", () => {
  const admin = read("js/citizen-admin-editor.js");
  const records = read("js/citizen-records.js");
  assert.match(admin, /appendAdminAuditEvent/);
  assert.match(records, /appendAdminAuditEvent/);
});

test("Admin Citizen Editor exposes persistent Save/Discard actions and block-formatted mechanics UI", () => {
  const source = read("js/citizen-admin-editor.js");
  const css = read("css/citizen-admin-editor.css");
  assert.match(source, /data-admin-editor-action="save-current"/);
  assert.match(source, /data-admin-editor-action="discard-current"/);
  assert.match(source, /data-ability-card/);
  assert.match(source, /data-skill-group/);
  assert.match(source, /renderAbilityBlocks/);
  assert.match(source, /renderRatingBlocks/);
  assert.match(css, /citizen-admin-ability-card-grid/);
  assert.match(css, /citizen-rating-mini-block\.is-filled\.is-natural/);
  assert.match(css, /citizen-admin-section-foot\s*\{[\s\S]*position:\s*sticky/);
});

test("Citizen identity editor previews and saves Short ID derived from birth date", () => {
  const source = read("js/citizen-admin-editor.js");
  const identity = read("js/citizen-identity.js");
  const command = read("js/citizen-command-api.js");
  assert.match(source, /data-citizen-short-id-preview/);
  assert.match(source, /bindIdentityLocalControls/);
  assert.match(identity, /recalculateCitizenIdentityCodes/);
  assert.match(command, /identityCodesRecalculated/);
});

test("Citizen browser validation keeps shortcuts stable across rerenders and activation navigation", () => {
  const creator = read("js/citizen-creator.js");
  const admin = read("js/citizen-admin-editor.js");
  assert.match(creator, /const shortcutRoot = document\.querySelector\("\.citizen-creator-view"\)/);
  assert.match(creator, /container\.querySelector\(`\[data-creator-step=/);
  assert.match(creator, /beginModuleNavigation\?\.\(\)/);
  assert.match(creator, /currentModuleId = "citizen-cards"/);
  assert.match(admin, /document\.addEventListener\("keydown"/);
  assert.match(admin, /overlay\.classList\.contains\("is-active"\)/);
});

test("Citizen browser fixtures isolate external network and expose a dedicated Citizen E2E command", () => {
  const fixtures = read("tests/e2e/fixtures.cjs");
  const packageJson = JSON.parse(read("package.json"));
  const runner = read("scripts/run-citizen-e2e.mjs");
  assert.match(fixtures, /localOnlyNetwork/);
  assert.match(fixtures, /context\.route\("\*\*\/\*"/);
  assert.match(fixtures, /ERR_BLOCKED_BY_CLIENT/);
  assert.equal(packageJson.scripts["test:e2e:citizen"], "node scripts/run-citizen-e2e.mjs");
  assert.match(runner, /citizen-creator-editor\.spec\.cjs/);
  assert.match(runner, /spawn\(/);
  assert.match(runner, /timeoutMs = 90_000/);
});

test("Citizen seed portraits and empty portrait renderers do not request missing local assets", () => {
  const citizens = read("data/citizens.js");
  const profile = read("js/citizen-profile.js");
  const records = read("js/citizen-records.js");
  assert.doesNotMatch(citizens, /assets\/portraits\//);
  assert.match(profile, /citizen\.portrait \? `<img/);
  assert.match(records, /citizen\.portrait \? `<img/);
  assert.doesNotMatch(profile, /src="\$\{escapeHtml\(citizen\.portrait \|\| ""/);
  assert.doesNotMatch(records, /src="\$\{escapeHtml\(citizen\.portrait \|\| ""/);
});
