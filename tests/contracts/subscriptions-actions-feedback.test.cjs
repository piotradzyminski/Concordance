"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createBrowserRuntime, PROJECT_ROOT } = require("../helpers/browser-runtime.cjs");

const read = (relativePath) => fs.readFileSync(path.join(PROJECT_ROOT, relativePath), "utf8");

test("Subscriptions Actions & Feedback 4.3 maps domain results into user-facing messages", () => {
  const runtime = createBrowserRuntime();
  runtime.load("js/subscription-action-feedback.js");
  const feedback = runtime.window.WS_APP.SubscriptionActionFeedback;

  assert.equal(feedback.version, "subscriptions_actions_feedback_4_3");

  const insufficient = feedback.describe("PAYMENT", {
    ok: false,
    reason: "INSUFFICIENT_CREDITS",
    total: 1200,
    credits: 450
  });
  assert.equal(insufficient.code, "INSUFFICIENT_CREDITS");
  assert.equal(insufficient.tone, "error");
  assert.match(insufficient.message, /Required 1 200 ₡, available 450 ₡/);

  const target = feedback.describe("TARGET", {
    ok: true,
    resultCode: "SUBSCRIPTION_TARGET_CHANGED"
  }, { targetLabel: "ITEM_INSTANCE:item-01" });
  assert.equal(target.tone, "success");
  assert.match(target.message, /ITEM_INSTANCE:item-01/);
});

test("Feedback state is transient, scoped and renders an accessible result panel", () => {
  const runtime = createBrowserRuntime();
  runtime.load("js/subscription-action-feedback.js");
  const feedback = runtime.window.WS_APP.SubscriptionActionFeedback;

  feedback.present("PLAYER", "PURCHASE", {
    ok: true,
    resultCode: "SUBSCRIPTION_CONTRACT_CREATED"
  }, { packageLabel: "Live & Prevail / Sustain" });

  assert.equal(feedback.get("ADMIN"), null);
  assert.equal(feedback.get("PLAYER").code, "SUBSCRIPTION_CONTRACT_CREATED");
  const html = feedback.render("PLAYER");
  assert.match(html, /role="status"/);
  assert.match(html, /Purchase complete/);
  assert.match(html, /SUBSCRIPTION_CONTRACT_CREATED/);
  assert.match(html, /Live &amp; Prevail \/ Sustain/);

  feedback.clear("PLAYER");
  assert.equal(feedback.render("PLAYER"), "");
});


test("Processing lock prevents duplicate subscription action dispatch and restores the control", () => {
  const runtime = createBrowserRuntime();
  runtime.load("js/subscription-action-feedback.js");
  const feedback = runtime.window.WS_APP.SubscriptionActionFeedback;
  const attributes = new Map();
  const classes = new Set();
  const button = {
    dataset: {},
    disabled: false,
    innerHTML: "Pay",
    matches: () => false,
    getAttribute: (name) => attributes.has(name) ? attributes.get(name) : null,
    setAttribute: (name, value) => attributes.set(name, String(value)),
    removeAttribute: (name) => attributes.delete(name),
    classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name) }
  };

  const release = feedback.lock(button, "PROCESSING...");
  assert.equal(typeof release, "function");
  assert.equal(feedback.isBusy(button), true);
  assert.equal(feedback.lock(button), null);
  assert.equal(button.disabled, true);
  assert.equal(button.innerHTML, "PROCESSING...");
  assert.equal(attributes.get("aria-busy"), "true");

  release();
  assert.equal(feedback.isBusy(button), false);
  assert.equal(button.disabled, false);
  assert.equal(button.innerHTML, "Pay");
  assert.equal(attributes.has("aria-busy"), false);
  assert.equal(classes.has("is-processing"), false);
});

test("Player and Admin bundles load one shared feedback controller before command handlers", () => {
  const modules = read("js/modules.js");
  const playerStart = modules.indexOf("subscriptions: {");
  const playerEnd = modules.indexOf("\n  service:", playerStart);
  const playerBundle = modules.slice(playerStart, playerEnd);
  const adminStart = modules.indexOf('"admin-workspace-subscriptions": {');
  const adminEnd = modules.indexOf('\n  "admin-workspace-service"', adminStart);
  const adminBundle = modules.slice(adminStart, adminEnd);

  assert.ok(playerBundle.indexOf("js/subscription-action-feedback.js?v=1") < playerBundle.indexOf("js/subscriptions.js?v=36"));
  assert.ok(adminBundle.indexOf("js/subscription-action-feedback.js?v=1") < adminBundle.indexOf("js/admin-subscriptions-control.js?v=5"));
  assert.match(read("css/subscription-action-feedback.css"), /Subscriptions Actions & Feedback 4\.3/);
  assert.match(read("js/subscriptions.js"), /presentSubscriptionActionResult/);
  assert.match(read("js/admin-subscriptions-control.js"), /getCommandPreview/);
});
