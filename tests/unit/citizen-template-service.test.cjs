"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");

test("Citizen template service builds a bounded NPC template patch", () => {
  const runtime = createBrowserRuntime({
    wsApp: {
      getAbilityDefinitions: () => [
        { id: "ability-strength", label: "Strength", maxNatural: 7 },
        { id: "ability-intellect", label: "Intellect", maxNatural: 7 }
      ],
      getSkillDefinitions: () => [
        { id: "skill-field-repair", label: "Repair", maxValue: 10 },
        { id: "skill-schematics", label: "Schematics", maxValue: 10 }
      ]
    }
  });
  runtime.loadMany([
    "data/citizen-templates.js",
    "js/citizen-template-service.js"
  ]);

  const result = runtime.window.WS_APP.buildCitizenTemplatePatch("template-gamma-worker", {
    characterType: "NPC",
    competencePresetId: "ELITE"
  });

  assert.equal(result.ok, true);
  assert.equal(result.patch.characterType, "NPC");
  assert.equal(result.patch.biologicalProfile, "GAMMA");
  assert.equal(result.patch.abilities.length, 2);
  assert.equal(result.patch.abilities.find((entry) => entry.abilityId === "ability-strength").natural, 5);
  assert.equal(result.patch.skills.find((entry) => entry.skillId === "skill-field-repair").value, 5);
});
