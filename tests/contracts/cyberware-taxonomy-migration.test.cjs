const fs = require("node:fs");
const vm = require("node:vm");
const assert = require("node:assert/strict");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "../..");
const context = { window: { WS_APP: {}, WS_APP_DATA: {}, APP_DATA: {} }, console };
context.window.window = context.window;
vm.createContext(context);
for (const file of ["data/cyberware-taxonomy.js", "js/cyberware-taxonomy.js", "js/cyberware-taxonomy-migration.js"]) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, file), "utf8"), context, { filename: file });
}
const migration = context.window.WS_APP.cyberwareTaxonomyMigration;
assert.equal(migration.schemaVersion, 2);
assert.ok(migration.slotDefinitions.some((slot) => slot.key === "JAW"));
assert.ok(!migration.slotDefinitions.some((slot) => /TEMPLE/.test(slot.key)));
for (const group of ["EARS", "LUNGS", "KIDNEYS"]) {
  const node = migration.slotDefinitions.find((slot) => slot.key === group);
  assert.equal(node.presentation, "TWO_COLUMN");
  assert.equal(node.children.length, 2);
}
for (const layer of ["DERMAL", "SKELETAL", "NERVOUS", "VASCULAR"]) {
  assert.ok(migration.slotDefinitions.some((slot) => slot.key === layer));
}
assert.ok(!migration.slotDefinitions.some((slot) => slot.key === "MUSCULAR"));
const bilateral = migration.migrateDefinition({ id: "lungs", subtype: "RESPIRATORY", slots: ["respiratory"] });
assert.deepEqual(Array.from(bilateral.installation.bodySlots), ["LEFT_LUNG", "RIGHT_LUNG"]);
assert.equal(bilateral.installation.slotGroupId, "LUNGS");
const eye = migration.migrateDefinition({ id: "eye", subtype: "OCULAR", slots: ["leftEye"] });
assert.deepEqual(Array.from(eye.installation.bodySlots), ["LEFT_EYE"]);
const systemic = migration.migrateDefinition({ id: "skin", subtype: "DERMAL", slots: ["dermal"] });
assert.ok(systemic.taxonomyReview.required);
assert.ok(systemic.taxonomyReview.codes.includes("CYBERWARE_SYSTEMIC_COVERAGE_UNDEFINED"));
console.log("cyberware taxonomy migration contracts: PASS");
