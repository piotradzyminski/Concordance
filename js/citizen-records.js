// Citizen Records compatibility facade.
// Canonical implementation is split across:
// - citizen-card-renderers.js
// - citizen-card-shell.js
// - citizen-cards-registry.js (GM registry bundle only)

(function registerCitizenRecordEntrypoints(app) {
  if (!app) return;

  if (typeof renderCitizenCardModule === "function") {
    app.renderCitizenCardModule = renderCitizenCardModule;
  }

  if (typeof renderCitizenCardsModule === "function") {
    app.renderCitizenCardsModule = renderCitizenCardsModule;
  }

  app.citizenRecords = Object.freeze({
    version: 2,
    rendererSplit: true,
    cardRenderers: "citizen-card-renderers.js",
    cardShell: "citizen-card-shell.js",
    registryRenderer: "citizen-cards-registry.js"
  });
})(window.WS_APP = window.WS_APP || {});
