"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

const INDEX = read("index.html");
const STORE = read("js/store.js");
const ADAPTER = read("js/citizen-subscription-adapter.js");

function scriptPosition(asset) {
  return INDEX.indexOf(`src="${asset}"`);
}

test("Citizen Subscription Adapter loads before Citizen Store and SubscriptionAPI", () => {
  const adapterPosition = scriptPosition("js/citizen-subscription-adapter.js?v=1");
  const storePosition = scriptPosition("js/store.js?v=147");
  const apiPosition = scriptPosition("js/subscription-api.js?v=6");

  assert.ok(adapterPosition >= 0, "Citizen Subscription Adapter must be eager.");
  assert.ok(storePosition > adapterPosition, "Citizen Store must initialize the already-loaded adapter factory.");
  assert.ok(apiPosition > storePosition, "SubscriptionAPI must capture the hidden low-level commands after Citizen Store initialization.");
});

test("Citizen Store delegates subscription commands instead of owning their implementations", () => {
  const directAssignments = [
    "addCitizenSubscription",
    "updateCitizenSubscription",
    "cancelCitizenSubscription",
    "deleteCitizenSubscription",
    "clearCancelledCitizenSubscriptions",
    "payCitizenSubscriptions",
    "processWeeklySubscriptionSettlement"
  ];

  directAssignments.forEach((name) => {
    assert.doesNotMatch(STORE, new RegExp(`window\\.WS_APP\\.${name}\\s*=\\s*function`));
    assert.match(ADAPTER, new RegExp(`function ${name}\\b`));
  });

  assert.match(STORE, /createCitizenSubscriptionAdapter\(\{/);
  assert.match(STORE, /addCitizenSubscription: citizenSubscriptionAdapter\.addCitizenSubscription/);
  assert.match(STORE, /Object\.defineProperty\(window\.WS_APP, "__subscriptionStoreCommands"/);
  assert.match(STORE, /SUBSCRIPTION_MUTATION_BOUNDARY_VERSION = "subscriptions_command_boundary_3_1x"/);
  assert.doesNotMatch(STORE, /const nextCitizenStore = getCitizenStore\(\)\.map/);
  assert.match(ADAPTER, /const nextCitizenStore = getCitizenStore\(\)\.map/);
});

test("Adapter remains a command adapter over canonical Citizen persistence", () => {
  assert.match(ADAPTER, /window\.WS_APP\.updateCitizen\(/);
  assert.match(ADAPTER, /getCitizenStore\(\)/);
  assert.match(ADAPTER, /replaceCitizenStore\(nextCitizenStore\)/);
  assert.match(ADAPTER, /saveCitizenStore\(\)/);
  assert.doesNotMatch(ADAPTER, /localStorage|sessionStorage|STORAGE_KEY/);
  assert.doesNotMatch(ADAPTER, /SubscriptionAPI\s*=|subscriptionCatalog\s*=/);
});
