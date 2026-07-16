const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = path.resolve(__dirname, "../..");
const context = { window: { WS_APP: {}, WS_APP_DATA: {} }, console, JSON, Object, Set, Map };
context.window.window = context.window;
vm.createContext(context);
for (const file of ["data/cyberware-taxonomy.js", "js/cyberware-taxonomy.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}
const api = context.window.WS_APP.cyberwareTaxonomy;
function assert(condition, message) { if (!condition) throw new Error(message); }
assert(api.resolveLegacyCyberwareSlotId("interface").bodySlotId === "OCCIPITAL_INTERFACE", "interface alias mismatch");
assert(api.resolveLegacyCyberwareSlotId("neckService").bodySlotId === "NECK_SERVICE_PORT", "service port alias mismatch");
assert(api.resolveLegacyCyberwareSlotId("leftEar").bodySlotId === "LEFT_EAR", "left ear alias mismatch");
assert(api.resolveLegacyCyberwareSlotId("rightKidney").bodySlotId === "RIGHT_KIDNEY", "right kidney alias mismatch");
assert(api.resolveLegacyCyberwareSlotId("respiratory").reason === "CYBERWARE_BODY_FOOTPRINT_UNRESOLVED", "respiratory must require definition-aware migration");
assert(api.resolveLegacyCyberwareSlotId("dermal").reason === "CYBERWARE_SYSTEMIC_COVERAGE_UNDEFINED", "dermal must require coverage");
assert(api.resolveLegacyCyberwareSlotId("leftArmCore").reviewRequired === true, "arm core must not be guessed");
console.log("PASS cyberware taxonomy legacy aliases");
