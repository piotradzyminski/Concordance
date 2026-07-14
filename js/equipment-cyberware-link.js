window.WS_APP = window.WS_APP || {};

(function initEquipmentCyberwareBridge() {
  const app = window.WS_APP;

  function openCyberwareFromEquipment(citizenId = "", options = {}) {
    const id = String(citizenId || "").trim();
    const user = options.user || app.currentUser;
    if (id) app.cyberwareTargetCitizenId = id;
    if (typeof options.returnView === "function") app.pushModuleView?.(options.returnView);
    if (typeof app.openModule === "function") {
      app.openModule("cyberware", user, {
        citizenId: id,
        routeId: options.routeId || "CYBERWARE_INSTANCE",
        section: options.section || "OVERVIEW",
        entityRef: options.instanceId ? { type: "ITEM_INSTANCE", id: String(options.instanceId) } : null,
        params: {
          ...(options.params && typeof options.params === "object" ? options.params : {}),
          instanceId: String(options.instanceId || "").trim(),
          cyberwareView: String(options.section || options.cyberwareView || "OVERVIEW").trim().toUpperCase()
        },
        skipLoader: options.skipLoader === true
      });
      return true;
    }
    return false;
  }

  function renderEquipmentCyberwareLinkPanel(state = {}) {
    const citizenId = String(state?.citizenId || "").trim();
    return `
      <section class="equipment-shell-panel" data-equipment-panel="cyberware-link">
        <div class="equipment-shell-panel__head">
          <p class="kicker">EQUIPMENT / CYBERWARE BRIDGE</p>
          <h5>Cyberware Module</h5>
        </div>
        <p class="equipment-shell-copy">Installed systems and procedures are managed in the standalone Cyberware module.</p>
        <button class="secondary-action" type="button" data-equipment-cyberware-link ${citizenId ? "" : "disabled"}>Open Cyberware</button>
      </section>
    `;
  }

  app.equipmentCyberwareBridge = {
    version: "1.0x",
    openCyberwareFromEquipment,
    renderEquipmentCyberwareLinkPanel
  };

  app.openCyberwareFromEquipment = openCyberwareFromEquipment;
  app.openEquipmentWorkspace = openCyberwareFromEquipment;
  app.renderEquipmentCyberwareLinkPanel = renderEquipmentCyberwareLinkPanel;
})();
