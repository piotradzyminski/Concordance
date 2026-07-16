const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "../..");
const context = {
  window: { WS_APP: {}, WS_APP_DATA: {} },
  console,
  JSON,
  Object,
  Set,
  Map
};
context.window.window = context.window;
vm.createContext(context);
for (const file of ["data/cyberware-taxonomy.js", "js/cyberware-taxonomy.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}

const data = context.window.WS_APP_DATA.CYBERWARE_TAXONOMY;
const api = context.window.WS_APP.cyberwareTaxonomy;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(data.schemaVersion === 2, "taxonomy schema must be v2");
assert(!data.bodySlots.some((slot) => slot.id.includes("TEMPLE")), "temple slots must not exist");
assert(data.bodySlots.some((slot) => slot.id === "JAW"), "JAW slot must exist");
assert(!data.systemicLayers.some((layer) => layer.id === "MUSCULAR"), "MUSCULAR systemic layer must not exist");
for (const id of ["DERMAL", "SKELETAL", "NERVOUS", "VASCULAR"]) {
  assert(data.systemicLayers.some((layer) => layer.id === id), `${id} systemic layer must exist`);
}
for (const groupId of ["EARS", "LUNGS", "KIDNEYS"]) {
  const group = data.slotGroups.find((entry) => entry.id === groupId);
  assert(group, `${groupId} group must exist`);
  assert(group.presentation === "TWO_COLUMN", `${groupId} must use two-column presentation`);
  assert(group.columns.length === 2, `${groupId} must expose two mechanical slots`);
}
assert(!data.slotGroups.some((group) => group.id === "EYES"), "eyes must not be a shared slot group");
assert(data.bodyRegions.some((region) => region.id === "LEFT_EYE"), "LEFT_EYE detail region missing");
assert(data.bodyRegions.some((region) => region.id === "RIGHT_EYE"), "RIGHT_EYE detail region missing");

const bilateralLungs = api.validateCyberwareDefinitionTaxonomy({
  taxonomy: { family: "ORGAN", subtype: "RESPIRATORY", capabilities: ["TOXIN_FILTER"] },
  installation: { mode: "BILATERAL_SINGLE_INSTANCE", regionId: "TORSO", slotGroupId: "LUNGS", bodySlots: ["LEFT_LUNG", "RIGHT_LUNG"] }
});
assert(bilateralLungs.ok, `bilateral lungs should validate: ${bilateralLungs.errors.join(",")}`);

const auditory = api.validateCyberwareDefinitionTaxonomy({
  taxonomy: { family: "SENSORY", subtype: "AUDITORY", capabilities: ["NOISE_FILTER"] },
  installation: { mode: "SINGLE_SIDE", regionId: "HEAD", slotGroupId: "EARS", bodySlots: ["LEFT_EAR"] }
});
assert(auditory.ok, `auditory single-side should validate: ${auditory.errors.join(",")}`);

const collision = api.validateCyberwareDefinitionTaxonomy({
  taxonomy: { family: "SENSORY", subtype: "OCULAR", capabilities: ["LEFT_EYE"] },
  installation: { mode: "SINGLE", regionId: "LEFT_EYE", bodySlots: ["LEFT_EYE"] }
});
assert(collision.errors.includes("CYBERWARE_CAPABILITY_USES_ANATOMY_ID"), "capability/body-slot collision must be rejected");

console.log("PASS cyberware taxonomy foundation");
