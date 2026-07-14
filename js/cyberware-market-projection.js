(function initCyberwareMarketProjection() {
  "use strict";

  window.WS_APP = window.WS_APP || {};
  const app = window.WS_APP;
  const runtime = app.cyberwareRuntime;

  if (!runtime) {
    throw new Error("Cyberware market projection requires the Cyberware domain runtime.");
  }

  const requiredFunctions = [
    "getCyberwareEquipmentCatalogItems",
    "getServicePortEquipmentCatalogItems"
  ];
  const missing = requiredFunctions.filter((name) => typeof runtime[name] !== "function");
  if (missing.length) {
    throw new Error(`Cyberware market projection is missing domain functions: ${missing.join(", ")}`);
  }

  // Housing and Market consume only these read-only catalog projections. The
  // complete Cyberware controller will replace the same public functions when
  // the full UI runtime is loaded.
  app.getCyberwareEquipmentCatalogItems = (...args) => runtime.getCyberwareEquipmentCatalogItems(...args);
  app.getServicePortEquipmentCatalogItems = (...args) => runtime.getServicePortEquipmentCatalogItems(...args);

  // The Equipment Catalog and Market Store may already exist from the eager
  // application entrypoint. Invalidate their lazy indexes after Cyberware
  // catalog providers become available so the next read includes these items.
  app.invalidateEquipmentCatalogIndex?.();
  app.invalidateMarketOffers?.();
})(window);
