const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "../..");
function read(file) { return fs.readFileSync(path.join(root, file), "utf8"); }
function run(files) {
  const context = { window: { APP_DATA: {}, WS_APP: {} }, structuredClone: (value) => JSON.parse(JSON.stringify(value)), console };
  context.window.window = context.window;
  vm.createContext(context);
  files.forEach((file) => vm.runInContext(read(file), context, { filename: file }));
  return context.window;
}

const window = run(["data/housing-rent-standards.js", "js/housing-rent-standards-store.js", "data/subscription-catalog.js"]);
const api = window.WS_APP.HousingRentStandards;
assert(api, "Housing Rent Standards API must be registered");
assert.strictEqual(api.validateCatalog().valid, true);

const standards = api.getStandards();
assert.deepStrictEqual(JSON.parse(JSON.stringify(standards.map((item) => item.code))), ["H", "G", "F", "E", "D", "C", "B", "A"]);
assert.deepStrictEqual(JSON.parse(JSON.stringify(standards.map((item) => item.maxAreaM2))), [null, 18, 22, 25, 30, 40, 50, 100]);
assert.strictEqual(api.getStandard("G").layoutPolicy, "RANDOM_POOL");
assert.strictEqual(api.getStandard("C").layoutPolicy, "CHOICE_POOL");
assert.strictEqual(api.getStandard("A").layoutPolicy, "INDIVIDUAL_ASSIGNMENT");
assert.strictEqual(api.getWeeklyWearPercent("ECONOMY"), 4);
assert.strictEqual(api.getWeeklyWearPercent("PREMIUM"), 0.5);

const g4 = api.getTier("G", 4);
assert.strictEqual(g4.tier.areaM2, 18);
assert(g4.tier.capabilities.includes("PRIVATE_SHOWER"));
assert.strictEqual(g4.tier.logistics.parcelMaxFootprint, "2x2");
assert.strictEqual(g4.tier.disposalAccess, "LOCAL_SEGMENT_CHUTE");

const f2 = api.getTier("F", "housing-f-t2");
assert.strictEqual(f2.tier.occupancy.childCapacity, 1);
assert(f2.tier.capabilities.includes("CHILD_SLEEP_SPACE"));

const c2 = api.resolveTierFromSubscription({ subscriptionCatalogId: "sub-housing-standard-c", tierId: "housing-c-t2" });
assert.strictEqual(c2.standard.code, "C");
assert.strictEqual(c2.tier.areaM2, 35);
assert.strictEqual(c2.tier.defaultFurnishingGrade, "QUALITY");

const legacy = api.resolveTierFromSubscription({ subscriptionCatalogId: "sub-habitat-ledger", tierId: "hab-secured" });
assert.strictEqual(legacy.standard.code, "C");
assert.strictEqual(legacy.tier.tierLevel, 2);

const rentProducts = window.APP_DATA.subscriptionCatalog.subscriptions.filter((item) => item.category === "RENT");
assert.strictEqual(rentProducts.length, 8);
assert(!rentProducts.some((item) => item.subscriptionCatalogId === "sub-habitat-ledger"));
standards.forEach((standard) => {
  const product = rentProducts.find((item) => item.subscriptionCatalogId === standard.subscriptionCatalogId);
  assert(product, `Missing subscription product for ${standard.code}`);
  assert.strictEqual(product.tiers.length, standard.tiers.length);
});

const storage = api.buildStorageUnits(c2, "housing-test");
assert(storage.length >= 5);
assert(storage.every((unit) => unit.slotCapacity === unit.width * unit.height));

const index = read("index.html");
assert(index.includes("data/housing-rent-standards.js?v=1"));
assert(index.includes("js/housing-rent-standards-store.js?v=1"));
assert(index.indexOf("data/housing-rent-standards.js") < index.indexOf("data/subscription-catalog.js"));
assert(index.indexOf("js/housing-rent-standards-store.js") < index.indexOf("js/housing-bridge-store.js"));

console.log("housing rent standards catalog contract: PASS");
