"use strict";

const { test, expect, USERS, login } = require("./fixtures.cjs");

async function openEquipment(page) {
  await page.evaluate(() => window.WS_APP.openModule?.("equipment", window.WS_APP.currentUser, { skipLoader: true }));
  await expect(page.locator('[data-equipment-panel="cybergrid"]')).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('[data-equipment-panel="command-rail"]')).toBeVisible({ timeout: 15_000 });
}

test("item selection updates only classes, Bodymap relation and Inspector", async ({ page, consoleErrors }) => {
  await login(page, USERS.admin);
  await openEquipment(page);

  const preparation = await page.evaluate(() => {
    const root = document.querySelector("[data-equipment-module-shell]");
    const state = window.WS_APP.getEquipmentRuntimeState?.(root?.dataset?.equipmentCitizenId || "");
    const candidates = [...root.querySelectorAll("[data-equipment-select-container-item][data-equipment-container-id]")];
    const target = candidates.find((node) => !node.classList.contains("is-selected")) || candidates[0] || null;
    const equipped = (state?.items || []).find((item) => item?.isEquipped && item?.id && item.id !== target?.dataset?.equipmentSelectContainerItem) || null;
    return {
      gridItemId: target?.dataset?.equipmentSelectContainerItem || "",
      containerId: target?.dataset?.equipmentContainerId || "",
      equippedItemId: equipped?.id || ""
    };
  });

  expect(preparation.gridItemId).not.toBe("");

  await page.evaluate(() => {
    const app = window.WS_APP;
    window.__EQUIPMENT_SELECTION_FAST_PATH__ = {
      bodymap: document.querySelector('[data-equipment-panel="bodymap"]'),
      cybergrid: document.querySelector('[data-equipment-panel="cybergrid"]'),
      inspector: document.querySelector('[data-equipment-panel="command-rail"]'),
      counters: {}
    };
    for (const apiName of [
      "getEquipmentState",
      "refreshEquipmentWorkspace",
      "renderEquipmentBodymapPanel",
      "renderEquipmentCybergridPanel",
      "syncEquipmentWorkspaceShell",
      "renderEquipmentItemDetail"
    ]) {
      const original = app[apiName];
      if (typeof original !== "function") continue;
      app[apiName] = function countedSelectionApi(...args) {
        window.__EQUIPMENT_SELECTION_FAST_PATH__.counters[apiName] = (window.__EQUIPMENT_SELECTION_FAST_PATH__.counters[apiName] || 0) + 1;
        return original.apply(this, args);
      };
    }
  });

  const result = await page.evaluate(({ gridItemId, containerId, equippedItemId }) => {
    const root = document.querySelector("[data-equipment-module-shell]");
    const button = [...root.querySelectorAll("[data-equipment-select-container-item][data-equipment-container-id]")]
      .find((node) => node.dataset.equipmentSelectContainerItem === gridItemId && node.dataset.equipmentContainerId === containerId);
    const scrollBefore = window.scrollY;
    const started = performance.now();
    button.click();
    const duration = performance.now() - started;
    const afterFirst = { ...window.__EQUIPMENT_SELECTION_FAST_PATH__.counters };
    const selectedAfterFirst = button.classList.contains("is-selected");
    const stateAfterFirst = window.WS_APP.getEquipmentRuntimeState?.(root.dataset.equipmentCitizenId);

    const noOpStarted = performance.now();
    button.click();
    const noOpDuration = performance.now() - noOpStarted;
    const afterNoOp = { ...window.__EQUIPMENT_SELECTION_FAST_PATH__.counters };

    let bodymapResult = null;
    if (equippedItemId) {
      bodymapResult = window.WS_APP.selectEquipmentItemFastPath?.(equippedItemId, { root });
    }
    const finalState = window.WS_APP.getEquipmentRuntimeState?.(root.dataset.equipmentCitizenId);
    return {
      duration,
      noOpDuration,
      scrollDrift: window.scrollY - scrollBefore,
      afterFirst,
      afterNoOp,
      finalCounters: { ...window.__EQUIPMENT_SELECTION_FAST_PATH__.counters },
      selectedAfterFirst,
      selectedItemAfterFirst: stateAfterFirst?.selections?.selectedItemId || "",
      finalSelectedItemId: finalState?.selections?.selectedItemId || "",
      bodymapResult,
      relatedRegionCount: document.querySelectorAll('[data-equipment-panel="bodymap"] .is-related-item').length,
      bodymapSame: document.querySelector('[data-equipment-panel="bodymap"]') === window.__EQUIPMENT_SELECTION_FAST_PATH__.bodymap,
      cybergridSame: document.querySelector('[data-equipment-panel="cybergrid"]') === window.__EQUIPMENT_SELECTION_FAST_PATH__.cybergrid,
      inspectorSame: document.querySelector('[data-equipment-panel="command-rail"]') === window.__EQUIPMENT_SELECTION_FAST_PATH__.inspector,
      inspectorMode: document.querySelector('[data-equipment-panel="command-rail"]')?.dataset?.equipmentCommandMode || ""
    };
  }, preparation);

  expect(result.duration).toBeLessThan(50);
  expect(result.noOpDuration).toBeLessThan(16);
  expect(result.scrollDrift).toBe(0);
  expect(result.selectedAfterFirst).toBe(true);
  expect(result.selectedItemAfterFirst).toBe(preparation.gridItemId);
  expect(result.afterFirst.getEquipmentState || 0).toBe(0);
  expect(result.afterFirst.refreshEquipmentWorkspace || 0).toBe(0);
  expect(result.afterFirst.renderEquipmentBodymapPanel || 0).toBe(0);
  expect(result.afterFirst.renderEquipmentCybergridPanel || 0).toBe(0);
  expect(result.afterFirst.syncEquipmentWorkspaceShell || 0).toBe(0);
  expect(result.afterFirst.renderEquipmentItemDetail || 0).toBe(1);
  expect(result.afterNoOp).toEqual(result.afterFirst);
  expect(result.finalCounters.getEquipmentState || 0).toBe(0);
  expect(result.finalCounters.refreshEquipmentWorkspace || 0).toBe(0);
  expect(result.finalCounters.renderEquipmentBodymapPanel || 0).toBe(0);
  expect(result.finalCounters.renderEquipmentCybergridPanel || 0).toBe(0);
  expect(result.finalCounters.syncEquipmentWorkspaceShell || 0).toBe(0);
  expect(result.bodymapSame).toBe(true);
  expect(result.cybergridSame).toBe(true);
  expect(result.inspectorSame).toBe(true);
  expect(result.inspectorMode).toBe("item");
  if (preparation.equippedItemId) {
    expect(result.bodymapResult.ok).toBe(true);
    expect(result.finalSelectedItemId).toBe(preparation.equippedItemId);
    expect(result.relatedRegionCount).toBeGreaterThan(0);
  }
  expect(consoleErrors).toEqual([]);
});
