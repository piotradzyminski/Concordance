"use strict";

const { test, expect, USERS, login } = require("./fixtures.cjs");

async function openEquipment(page) {
  await page.evaluate(() => window.WS_APP.openModule?.("equipment", window.WS_APP.currentUser, { skipLoader: true }));
  await expect(page.locator('[data-equipment-panel="bodymap"]')).toBeVisible({ timeout: 15_000 });
}

test("CyberGrid Front/Back preserves DOM identity and performs no Equipment rebuild", async ({ page, consoleErrors }) => {
  await login(page, USERS.admin);
  await openEquipment(page);

  const warmup = await page.evaluate(async () => {
    const panel = document.querySelector('[data-equipment-panel="bodymap"]');
    const result = await window.WS_APP.preloadEquipmentBodymapAssets?.(panel);
    const images = [...panel.querySelectorAll("[data-equipment-bodymap-image]")];
    return {
      result,
      imageCount: images.length,
      complete: images.every((image) => image.complete && image.naturalWidth > 0)
    };
  });
  expect(warmup.result.ok).toBe(true);
  expect(warmup.imageCount).toBe(2);
  expect(warmup.complete).toBe(true);

  await page.evaluate(() => {
    const app = window.WS_APP;
    window.__BODYMAP_FAST_PATH__ = {
      panel: document.querySelector('[data-equipment-panel="bodymap"]'),
      front: document.querySelector('[data-equipment-bodymap-view-panel="front"]'),
      back: document.querySelector('[data-equipment-bodymap-view-panel="back"]'),
      counters: {}
    };
    for (const apiName of ["getEquipmentState", "renderEquipmentBodymapPanel", "renderEquipmentCybergridPanel", "refreshEquipmentWorkspace", "syncEquipmentWorkspaceShell"]) {
      const original = app[apiName];
      if (typeof original !== "function") continue;
      app[apiName] = function countedBodymapApi(...args) {
        window.__BODYMAP_FAST_PATH__.counters[apiName] = (window.__BODYMAP_FAST_PATH__.counters[apiName] || 0) + 1;
        return original.apply(this, args);
      };
    }
  });

  const result = await page.evaluate(() => {
    const root = document.querySelector("[data-equipment-module-shell]");
    const panel = document.querySelector('[data-equipment-panel="bodymap"]');
    const scrollBefore = window.scrollY;
    const started = performance.now();
    root.querySelector('[data-equipment-bodymap-view="back"]').click();
    const duration = performance.now() - started;
    const state = window.WS_APP.getEquipmentRuntimeState?.(root.dataset.equipmentCitizenId);
    const cachedViewAfterBack = state?.selections?.selectedBodymapView || "";
    const firstCounters = { ...window.__BODYMAP_FAST_PATH__.counters };

    const noOpStarted = performance.now();
    root.querySelector('[data-equipment-bodymap-view="back"]').click();
    const noOpDuration = performance.now() - noOpStarted;

    root.querySelector('[data-equipment-bodymap-view="front"]').click();
    return {
      duration,
      noOpDuration,
      scrollBefore,
      scrollAfter: window.scrollY,
      firstCounters,
      counters: { ...window.__BODYMAP_FAST_PATH__.counters },
      panelSame: panel === window.__BODYMAP_FAST_PATH__.panel,
      frontSame: document.querySelector('[data-equipment-bodymap-view-panel="front"]') === window.__BODYMAP_FAST_PATH__.front,
      backSame: document.querySelector('[data-equipment-bodymap-view-panel="back"]') === window.__BODYMAP_FAST_PATH__.back,
      cachedViewAfterBack,
      finalView: panel.dataset.equipmentBodymapActiveView,
      frontVisible: !window.__BODYMAP_FAST_PATH__.front.hidden,
      backHidden: window.__BODYMAP_FAST_PATH__.back.hidden
    };
  });

  expect(result.duration).toBeLessThan(16);
  expect(result.noOpDuration).toBeLessThan(16);
  expect(result.scrollAfter - result.scrollBefore).toBe(0);
  expect(result.firstCounters).toEqual({});
  expect(result.counters).toEqual({});
  expect(result.panelSame).toBe(true);
  expect(result.frontSame).toBe(true);
  expect(result.backSame).toBe(true);
  expect(result.cachedViewAfterBack).toBe("back");
  expect(result.finalView).toBe("front");
  expect(result.frontVisible).toBe(true);
  expect(result.backHidden).toBe(true);
  expect(consoleErrors).toEqual([]);
});
