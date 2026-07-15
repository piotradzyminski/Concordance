"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createBrowserRuntime, PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");
const { readProjectFile } = require("../helpers/source-contract.cjs");

function createRuntime() {
  const runtime = createBrowserRuntime();
  runtime.load("js/cyberware-store.js");
  runtime.load("js/cyberware-bodymap-panel.js");
  runtime.load("data/cyberware-bodymap-layouts.js");
  runtime.load("js/cyberware-anatomy-bodymap.js");
  return runtime;
}

test("Cyberware anatomy registry covers the required hierarchy and clean AVIF assets", () => {
  const runtime = createRuntime();
  const data = runtime.window.WS_APP_DATA.CYBERWARE_BODYMAP_LAYOUTS;
  const api = runtime.window.WS_APP.cyberwareAnatomyBodymap;
  const regions = new Map(data.regions.map((entry) => [entry.id, entry]));
  const views = new Map(data.views.map((entry) => [entry.id, entry]));

  ["BODY", "HEAD", "NEURAL", "LEFT_EYE", "RIGHT_EYE", "TORSO", "LEFT_ARM", "LEFT_HAND", "RIGHT_ARM", "RIGHT_HAND", "LEFT_LEG", "RIGHT_LEG"].forEach((id) => assert.ok(regions.has(id), id));
  assert.equal(regions.get("HEAD").parentId, "BODY");
  assert.equal(regions.get("NEURAL").parentId, "HEAD");
  assert.equal(regions.get("LEFT_EYE").parentId, "HEAD");
  assert.equal(regions.get("RIGHT_EYE").parentId, "HEAD");
  assert.equal(regions.get("LEFT_HAND").parentId, "LEFT_ARM");
  assert.equal(regions.get("RIGHT_HAND").parentId, "RIGHT_ARM");

  ["body_front", "body_back", "head_front", "head_back", "neural", "eye_left", "eye_right", "torso_front", "torso_back", "arm_left", "arm_right", "hand_left", "hand_right", "leg_left", "leg_right"].forEach((id) => assert.ok(views.has(id), id));
  for (const entry of data.views) {
    assert.match(entry.assetPath, /^assets\/bodymap\/.+\.avif$/);
    assert.doesNotMatch(entry.assetPath, /_anchor\.avif$/);
    assert.ok(fs.existsSync(path.join(PROJECT_ROOT, entry.assetPath)), entry.assetPath);
  }

  const validation = api.validateLayouts();
  assert.equal(validation.ok, true, validation.errors.join("\n"));
  assert.equal(validation.regionCount, 12);
  assert.equal(validation.viewCount, 15);
});

test("Cyberware anatomy anchor definitions are separate from Equipment anchors but share the visual contract", () => {
  const dataSource = readProjectFile("data/cyberware-bodymap-layouts.js");
  const anatomySource = readProjectFile("js/cyberware-anatomy-bodymap.js");
  const css = readProjectFile("css/cyberware-anatomy-bodymap.css");

  assert.doesNotMatch(dataSource, /equipment-bodymap-panel|EQUIPMENT_BODYMAP_LAYOUT/);
  assert.match(anatomySource, /equipment-bodymap-region__point/);
  assert.match(css, /Cyberware Anatomy Bodymap 16\.0x/);
  assert.match(css, /\.cyberware-anatomy-anchor__point/);
  assert.match(css, /--bodymap-line/);
  assert.match(css, /--bodymap-card-border/);
});

test("Bodymap navigation supports body to arm to hand and body to head to neural or either eye", () => {
  const runtime = createRuntime();
  const api = runtime.window.WS_APP.cyberwareAnatomyBodymap;
  const state = {};

  api.ensureState(state);
  assert.equal(state.bodymapRegion, "BODY");
  assert.equal(api.navigateState(state, "LEFT_ARM"), true);
  assert.equal(api.getBreadcrumb(state.bodymapRegion).map((entry) => entry.id).join("/"), "BODY/LEFT_ARM");
  assert.equal(api.navigateState(state, "LEFT_HAND"), true);
  assert.equal(api.getBreadcrumb(state.bodymapRegion).map((entry) => entry.id).join("/"), "BODY/LEFT_ARM/LEFT_HAND");

  assert.equal(api.navigateState(state, "NEURAL"), true);
  assert.equal(api.getBreadcrumb(state.bodymapRegion).map((entry) => entry.id).join("/"), "BODY/HEAD/NEURAL");
  assert.equal(api.navigateState(state, "LEFT_EYE"), true);
  assert.equal(api.getBreadcrumb(state.bodymapRegion).map((entry) => entry.id).join("/"), "BODY/HEAD/LEFT_EYE");
  assert.equal(api.navigateState(state, "RIGHT_EYE"), true);
  assert.equal(api.getBreadcrumb(state.bodymapRegion).map((entry) => entry.id).join("/"), "BODY/HEAD/RIGHT_EYE");
});

test("ItemInstance slot footprints resolve to the deepest anatomy view without creating another store", () => {
  const runtime = createRuntime();
  const api = runtime.window.WS_APP.cyberwareAnatomyBodymap;

  assert.equal(api.locateItem({ instanceId: "eye-left", slots: ["leftEye"] }).regionId, "LEFT_EYE");
  assert.equal(api.locateItem({ instanceId: "hand-right", slots: ["rightIndexFinger"] }).regionId, "RIGHT_HAND");
  assert.equal(api.locateItem({ instanceId: "core", slots: ["interface"] }).regionId, "NEURAL");
  assert.equal(api.locateItem({ instanceId: "leg", slots: ["leftLowerLeg"] }).regionId, "LEFT_LEG");

  const combined = `${readProjectFile("js/cyberware-anatomy-bodymap.js")}\n${readProjectFile("data/cyberware-bodymap-layouts.js")}`;
  assert.doesNotMatch(combined, /citizen\.cyberwareList\s*=/);
  assert.doesNotMatch(combined, /itemInstances\s*=\s*\[/);
  assert.doesNotMatch(combined, /localStorage\.(?:setItem|removeItem)/);
});

test("Cyberware module bundle loads anatomy registry, renderer and stylesheet before workspace", () => {
  const modules = readProjectFile("js/modules.js");
  const start = modules.indexOf("  cyberware: {");
  const end = modules.indexOf("  market: {", start);
  const block = modules.slice(start, end);

  assert.match(block, /css\/cyberware-anatomy-bodymap\.css\?v=1/);
  assert.match(block, /data\/cyberware-bodymap-layouts\.js\?v=1/);
  assert.match(block, /js\/cyberware-anatomy-bodymap\.js\?v=1/);
  assert.ok(block.indexOf("data/cyberware-bodymap-layouts.js?v=1") < block.indexOf("js/cyberware-anatomy-bodymap.js?v=1"));
  assert.ok(block.indexOf("js/cyberware-anatomy-bodymap.js?v=1") < block.indexOf("js/cyberware-workspace.js?v=3"));
});
