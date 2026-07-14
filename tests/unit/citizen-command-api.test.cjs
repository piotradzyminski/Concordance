"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { createBrowserRuntime } = require("../helpers/browser-runtime.cjs");
const { makeCitizen } = require("../helpers/fixtures.cjs");
const { assertReplay } = require("../helpers/assertions.cjs");

test("CitizenCommandAPI replays a repeated draft update without a second mutation", () => {
  const citizen = makeCitizen();
  let mutationCount = 0;
  const runtime = createBrowserRuntime({
    wsApp: {
      getCitizenById: (citizenId) => citizenId === citizen.id ? structuredClone(citizen) : null,
      updateCitizen: (citizenId, patch) => {
        assert.equal(citizenId, citizen.id);
        mutationCount += 1;
        Object.assign(citizen, structuredClone(patch));
        return structuredClone(citizen);
      }
    }
  });
  runtime.load("js/citizen-command-api.js");

  const actor = { id: "user-test", login: "Test User", role: "citizen", citizenId: citizen.id };
  const input = { idempotencyKey: "citizen-draft-update-1", patch: { pseudonym: "Replay Safe" } };
  const first = runtime.window.WS_APP.CitizenCommandAPI.updateCitizenDraft(citizen.id, input, actor);
  const second = runtime.window.WS_APP.CitizenCommandAPI.updateCitizenDraft(citizen.id, input, actor);

  assert.equal(first.ok, true);
  assert.equal(first.operation, "UPDATE_DRAFT");
  assert.equal(first.citizen.revision, 2);
  assertReplay(second);
  assert.equal(second.citizen.revision, 2);
  assert.equal(mutationCount, 1);
  assert.equal(citizen.pseudonym, "Replay Safe");
});


test("CitizenCommandAPI creates an active NPC once and replays the quick-create command", () => {
  const citizens = [];
  const runtime = createBrowserRuntime({
    wsApp: {
      getCitizens: () => structuredClone(citizens),
      getCitizenById: (citizenId) => {
        const citizen = citizens.find((entry) => entry.id === citizenId);
        return citizen ? structuredClone(citizen) : null;
      },
      generateCitizenInternalId: () => "npc-quick-test",
      makeUniqueCitizenStoreId: (id) => id,
      validateCitizenIdentity: () => ({ ok: true, errors: [] }),
      finalizeCitizenIdentity: () => ({ ok: true, idNumber: "03.51N00E.0A04.20800101.NPC0001", shortId: "20800101.NPC0001" }),
      createCitizen: (record) => {
        citizens.push(structuredClone(record));
        return structuredClone(record);
      },
      updateCitizen: (citizenId, patch) => {
        const index = citizens.findIndex((entry) => entry.id === citizenId);
        if (index < 0) return null;
        citizens[index] = { ...citizens[index], ...structuredClone(patch) };
        return structuredClone(citizens[index]);
      }
    }
  });
  runtime.load("js/citizen-command-api.js");

  const actor = { id: "admin", login: "Admin", role: "admin" };
  const input = {
    identity: { pseudonym: "Quick Test" },
    biologicalProfile: "GAMMA",
    classProfile: "TECHNICAL",
    origin: "NE3:51.00",
    birthDate: "20800101",
    abilities: [],
    skills: [],
    reason: "Quick NPC test.",
    idempotencyKey: "quick-npc-test-1"
  };
  const first = runtime.window.WS_APP.CitizenCommandAPI.createQuickNpc(input, actor);
  const replay = runtime.window.WS_APP.CitizenCommandAPI.createQuickNpc(input, actor);

  assert.equal(first.ok, true);
  assert.equal(first.operation, "CREATE_QUICK_NPC");
  assert.equal(first.citizen.recordState, "ACTIVE");
  assert.equal(first.citizen.characterType, "NPC");
  assert.equal(citizens.length, 1);
  assertReplay(replay);
  assert.equal(citizens.length, 1);
});

test("Admin identity correction recalculates Citizen ID and Short ID from birth date", () => {
  const citizen = makeCitizen({
    recordState: "ACTIVE",
    ownerUserId: "user-test",
    origin: "NE3:51.00",
    birthDate: "2080-06-23",
    idNumber: "03.51N00E.0A04.20800623.A91B880",
    shortId: "20800623.A91B880"
  });
  const runtime = createBrowserRuntime({
    appData: { citizens: [structuredClone(citizen)] },
    wsApp: {
      getCitizens: () => [structuredClone(citizen)],
      getCitizenById: (citizenId) => citizenId === citizen.id ? structuredClone(citizen) : null,
      updateCitizen: (citizenId, patch) => {
        assert.equal(citizenId, citizen.id);
        Object.assign(citizen, structuredClone(patch));
        return structuredClone(citizen);
      }
    }
  });
  runtime.load("js/citizen-identity.js");
  runtime.load("js/citizen-command-api.js");

  const actor = { id: "admin", login: "Admin", role: "admin" };
  const result = runtime.window.WS_APP.CitizenCommandAPI.adminUpdateCitizenRecord(citizen.id, {
    patch: { birthDate: "2081-01-17" },
    reason: "Corrected date of birth.",
    idempotencyKey: "citizen-identity-recalc-1"
  }, actor);

  assert.equal(result.ok, true);
  assert.equal(result.citizen.birthDate, "2081-01-17");
  assert.equal(result.citizen.idNumber, "03.51N00E.0A04.20810117.A91B880");
  assert.equal(result.citizen.shortId, "20810117.A91B880");
});
