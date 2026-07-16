// Citizen Card shell and controller bindings.
// The shell composes renderer output and owns mounted-card lifecycle,
// card actions and local interaction refresh boundaries.

function renderCitizenCardLayoutContent(citizen, identity, cardMode, ledger, activeSubscriptions, detailOpenState = {}) {
  const fullMode = cardMode === "full";
  return `
    ${fullMode ? `
      <section class="citizen-card-left citizen-card-visual-column">
        ${renderCitizenPortraitBlock(citizen, identity)}
        ${renderCitizenBadgeSlots(citizen)}
        ${renderCitizenIdentityBlock(identity)}
        ${renderCitizenCoreProfile(citizen, identity, { full: true })}
      </section>
    ` : `
      <section class="citizen-card-left citizen-card-compact-column">
        <div class="citizen-card-compact-profile-wrap">
          ${renderCitizenCompactProfileCard(citizen, identity)}
        </div>
      </section>
    `}

    <section class="citizen-card-right citizen-card-record-column">
      ${fullMode ? renderDetailSection("Appearance Description", `<p>${escapeHtml(citizen.appearance || "No description recorded.")}</p>`, true, "appearance-text-block", "appearance", detailOpenState) : ""}
      ${renderDetailSection("Skills / Abilities", renderSkillsAbilitiesBlock(citizen, { open: fullMode }), fullMode, "competence-card-block", "skills-abilities", detailOpenState)}
      ${renderDetailSection("Cyberware", renderCitizenCyberwareCards(citizen, { full: fullMode }), fullMode, "", "cyberware", detailOpenState)}
      ${renderDetailSection("Financial / Subscription Summary", renderCitizenCardFinancialSummary(citizen, ledger, activeSubscriptions, { full: fullMode }), true, "financial-card-block citizen-card-summary-block", "financial-subscription-summary", detailOpenState)}
      ${fullMode ? renderDetailSection("Equipment", renderCitizenEquipmentSummaryBlock(citizen, { compact: false, inspectable: true }), false, "equipment-card-block citizen-card-summary-block equipment-summary", "equipment", detailOpenState) : ""}
      ${renderDetailSection("Service Log", renderCitizenServiceLogCard(citizen, { compact: !fullMode }), true, "service-log-card-block citizen-card-summary-block", "service-log", detailOpenState)}
      ${!fullMode ? renderDetailSection("Equipment", renderCitizenEquipmentSummaryBlock(citizen, { compact: true, inspectable: true }), true, "equipment-card-block citizen-card-summary-block equipment-summary", "equipment", detailOpenState) : ""}
    </section>
  `;
}

function renderCitizenCardLayout(citizen, identity, cardMode, ledger, activeSubscriptions, detailOpenState = {}) {
  return `<div class="citizen-card-layout">${renderCitizenCardLayoutContent(citizen, identity, cardMode, ledger, activeSubscriptions, detailOpenState)}</div>`;
}

function renderCitizenCardModule(user, moduleLabel = "CITIZEN CARD", citizenId = user?.citizenId, options = {}) {
  const container = document.querySelector("#module-grid");
  const status = document.querySelector("#module-status");
  const terminalGrid = document.querySelector(".terminal-grid");
  const citizen = window.WS_APP.getCitizenById(citizenId);
  const returnTarget = options.returnTarget || "access-panel";

  if (!container) return;

  terminalGrid?.classList.add("is-card-open");
  window.WS_APP.currentCitizenCardsSelectedId = returnTarget === "citizen-cards" ? citizenId : null;

  if (!citizen) {
    container.innerHTML = `
      <article class="module-detail">
        <button class="module-back-button" type="button">Back</button>
        <p class="profile-note">Brak karty postaci dla aktywnej sesji.</p>
      </article>
    `;
    bindBackButton(user);
    return;
  }

  const identity = getCitizenCardIdentityView(citizen, user);
  const cardMode = getCitizenCardViewMode();
  const { ledger, activeSubscriptions } = getCitizenCardSummaryStats(citizen);

  if (status) {
    status.textContent = `${moduleLabel} / ${String(identity.shortId || identity.name || citizen.id).toUpperCase()}`;
  }

  const detailOpenState = options.detailOpenState || getCitizenCardSectionOpenState(citizen.id);
  const modeRibbon = `
    <aside class="citizen-card-mode-ribbon" aria-label="Citizen card view mode">
      ${renderCitizenCardModeButton("full", "Full", cardMode)}
      ${renderCitizenCardModeButton("compact", "Compact", cardMode)}
    </aside>
  `;

  container.innerHTML = `
    <article class="module-detail citizen-card-view citizen-card-mode-${escapeHtml(cardMode)}" data-citizen-id="${escapeHtml(citizen.id)}">
      <div class="module-detail-head">
        <div>
          <p class="kicker">${escapeHtml(moduleLabel)} / LOCAL PROFILE</p>
          <h4>${escapeHtml(identity.shortId || identity.name || citizen.id)}</h4>
        </div>
        <button class="module-back-button" type="button">Back</button>
      </div>

      <div class="citizen-card-shell">
        ${modeRibbon}

        <section class="citizen-card-main-panel">
          <div class="citizen-card-top-strip">
            ${renderCitizenQuickLinks(user, citizen)}
            ${renderRiskFooter(citizen, "is-priority-risk")}
          </div>

          ${user.role === "admin" && returnTarget === "citizen-cards" ? `
            <section class="entry-record-actions citizen-card-record-actions">
              <span class="entry-record-state">${escapeHtml(citizen.recordState || "ACTIVE")}</span>
              ${String(citizen.recordState || "ACTIVE").toUpperCase() === "ACTIVE" ? `<button class="entry-record-action" type="button" data-citizen-editor-open="${escapeHtml(citizen.id)}">Manage Record</button>` : ""}
              ${["DRAFT", "CHANGES_REQUESTED", "READY_FOR_REVIEW", "REJECTED"].includes(String(citizen.recordState || "").toUpperCase()) ? `
                <button class="entry-record-action" type="button" id="citizen-open-creator-button">Open Creator</button>
              ` : ""}
              <button class="entry-record-action ${citizen.recordState === "ARCHIVED" ? "" : "danger"}" type="button" id="citizen-archive-button">
                ${citizen.recordState === "ARCHIVED" ? "Restore Record" : "Archive Record"}
              </button>
              <div class="citizen-full-edit-control">
                <label>
                  <input class="ui-select-control" type="checkbox" id="citizen-owner-full-edit-switch" ${citizen.ownerFullCardEdit === true ? "checked" : ""} ${citizen.ownerUserId ? "" : "disabled"}>
                  <span>ALLOW PLAYER FULL CARD EDIT</span>
                </label>
                <small>${citizen.ownerUserId ? `Owner: ${escapeHtml(citizen.ownerUserId)}` : "Assign an owner account first."}</small>
              </div>
            </section>
          ` : ""}

          ${renderCitizenCardLayout(citizen, identity, cardMode, ledger, activeSubscriptions, detailOpenState)}
        </section>
      </div>
    </article>
  `;

  document.querySelector("#citizen-open-creator-button")?.addEventListener("click", () => {
    window.WS_APP.pushModuleView?.(() => renderCitizenCardModule(user, moduleLabel, citizen.id, options));
    window.WS_APP.openCitizenCreator?.(citizen.id);
  });

  document.querySelector("#citizen-owner-full-edit-switch")?.addEventListener("change", (event) => {
    const enabled = event.target.checked === true;
    const result = window.WS_APP.CitizenCommandAPI?.adminSetOwnerFullCardEdit?.(citizen.id, {
      enabled,
      reason: enabled
        ? "Admin allowed the assigned player to edit the full Citizen-owned card record."
        : "Admin revoked player full card editing for this Citizen record.",
      source: "CITIZEN_CARDS",
      idempotencyKey: `citizen-owner-full-edit:${citizen.id}:${enabled ? "enable" : "disable"}:${Date.now()}`
    }, user);
    if (!result?.ok) {
      event.target.checked = !enabled;
      window.WS_APP.appendAdminAuditEvent?.({
        category: "ACCESS",
        action: "CITIZEN_OWNER_FULL_EDIT_FAILED",
        citizenId: citizen.id,
        target: citizen.id,
        summary: `Owner full-card edit update failed for ${citizen.id}.`,
        resultCode: result?.error?.code || "CITIZEN_OWNER_FULL_EDIT_FAILED",
        status: "FAILED",
        meta: { enabled, source: "CITIZEN_CARDS" }
      }, { user });
      window.WS_APP.appendTerminalLogLine?.(`FULL CARD EDIT UPDATE FAILED / ${result?.error?.code || "UNKNOWN"}`, { typed: true, speed: 8 });
      return;
    }
    window.WS_APP.appendAdminAuditEvent?.({
      category: "ACCESS",
      action: enabled ? "CITIZEN_OWNER_FULL_EDIT_ENABLED" : "CITIZEN_OWNER_FULL_EDIT_DISABLED",
      citizenId: citizen.id,
      target: citizen.id,
      summary: `Owner full-card edit ${enabled ? "enabled" : "disabled"} for ${citizen.id}.`,
      resultCode: result?.operation || "CITIZEN_OWNER_FULL_EDIT_UPDATED",
      status: "SUCCEEDED",
      previousRevision: citizen?.revision ?? citizen?.recordRevision ?? null,
      nextRevision: result?.citizen?.revision ?? result?.citizen?.recordRevision ?? null,
      meta: { enabled, source: "CITIZEN_CARDS" }
    }, { user });
    window.WS_APP.appendTerminalLogLine?.(`FULL CARD EDIT ${enabled ? "ENABLED" : "DISABLED"} / ${citizen.shortId || citizen.id}`, { typed: true, speed: 8 });
    renderCitizenCardModule(user, moduleLabel, result.citizen.id, options);
  });

  document.querySelector("#citizen-archive-button")?.addEventListener("click", async () => {
    const archived = citizen.recordState === "ARCHIVED";
    const confirmed = await window.WS_APP.registryUI.confirmAction(
      archived ? "RESTORE CITIZEN RECORD" : "ARCHIVE CITIZEN RECORD",
      archived
        ? "Restore this citizen record to the active registry?"
        : "Archive this citizen record? Linked domain history will be preserved.",
      archived ? "Restore" : "Archive"
    );
    if (!confirmed) return;

    const input = {
      reason: archived ? "Restored from Citizen Cards registry." : "Archived from Citizen Cards registry.",
      source: "CITIZEN_CARDS",
      idempotencyKey: `citizen-${archived ? "restore" : "archive"}:${citizen.id}:${Date.now()}`
    };
    const result = archived
      ? window.WS_APP.CitizenCommandAPI?.restoreCitizen?.(citizen.id, input, user)
      : window.WS_APP.CitizenCommandAPI?.archiveCitizen?.(citizen.id, input, user);
    if (!result?.ok) {
      window.WS_APP.appendAdminAuditEvent?.({
        category: "CITIZEN",
        action: archived ? "CITIZEN_RESTORE_FAILED" : "CITIZEN_ARCHIVE_FAILED",
        citizenId: citizen.id,
        target: citizen.id,
        summary: `${archived ? "Restore" : "Archive"} failed for Citizen ${citizen.id}.`,
        resultCode: result?.error?.code || "CITIZEN_RECORD_ACTION_FAILED",
        status: "FAILED",
        idempotencyKey: input.idempotencyKey,
        meta: { source: "CITIZEN_CARDS" }
      }, { user });
      window.WS_APP.appendTerminalLogLine?.(`CITIZEN RECORD ACTION FAILED / ${result?.error?.code || "UNKNOWN"}`, { typed: true, speed: 8 });
      return;
    }
    window.WS_APP.appendAdminAuditEvent?.({
      category: "CITIZEN",
      action: archived ? "CITIZEN_RESTORED" : "CITIZEN_ARCHIVED",
      citizenId: citizen.id,
      target: citizen.id,
      summary: `Citizen ${citizen.id} ${archived ? "restored" : "archived"}.`,
      resultCode: result?.operation || (archived ? "RESTORE_CITIZEN" : "ARCHIVE_CITIZEN"),
      status: "SUCCEEDED",
      idempotencyKey: input.idempotencyKey,
      previousRevision: citizen?.revision ?? citizen?.recordRevision ?? null,
      nextRevision: result?.citizen?.revision ?? result?.citizen?.recordRevision ?? null,
      meta: { source: "CITIZEN_CARDS" }
    }, { user });
    window.WS_APP.appendTerminalLogLine?.(`CITIZEN RECORD ${archived ? "RESTORED" : "ARCHIVED"} / ${citizen.shortId || citizen.id}`, { typed: true, speed: 8 });
    renderCitizenCardsModule(user);
  });

  document.querySelector("[data-open-citizen-subscriptions]")?.addEventListener("click", () => {
    window.WS_APP.pushModuleView?.(() => renderCitizenCardModule(user, moduleLabel, citizen.id, options));
    if (user.role === "admin") {
      renderAdminCitizenSubscriptionControl(user, citizen.id);
      return;
    }

    renderSubscriptionsModule(user);
  });

  bindCitizenCardPolishActions(user, citizen, moduleLabel, options);


  if (returnTarget === "citizen-cards") {
    window.WS_APP.bindModuleBackButton(user, () => renderCitizenCardsModule(user));
    return;
  }

  bindBackButton(user);
}

function bindBackButton(user) {
  window.WS_APP.bindModuleBackButton(user, () => window.WS_APP.renderModules(user));
}

function escapeCitizenCardSelectorValue(value = "") {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
}

function getCitizenCardFocusSelector(element, card) {
  if (!element || !card || typeof card.contains !== "function" || !card.contains(element)) return "";
  const id = String(element.id || element.getAttribute?.("id") || "").trim();
  if (id) return `[id="${escapeCitizenCardSelectorValue(id)}"]`;

  const stableAttributes = [
    "data-citizen-card-mode",
    "data-view-subscription-id",
    "data-citizen-card-equipment-item-id",
    "data-citizen-card-equipment-clear",
    "data-citizen-card-action",
    "data-skill-id",
    "data-ability-id"
  ];
  for (const attribute of stableAttributes) {
    const value = String(element.getAttribute?.(attribute) || "").trim();
    if (value) return `[${attribute}="${escapeCitizenCardSelectorValue(value)}"]`;
  }

  const section = element.closest?.("[data-citizen-card-section-key]");
  const sectionKey = String(section?.dataset?.citizenCardSectionKey || "").trim();
  if (sectionKey && String(element.tagName || "").toUpperCase() === "SUMMARY") {
    return `[data-citizen-card-section-key="${escapeCitizenCardSelectorValue(sectionKey)}"] > summary`;
  }
  return "";
}

function captureCitizenCardUiState(card) {
  const moduleGrid = document.querySelector("#module-grid");
  const activeElement = document.activeElement;
  const checkedFinancialTab = card?.querySelector?.('.citizen-financial-tab-shell input[type="radio"]:checked');
  const citizenId = String(card?.dataset?.citizenId || "").trim();
  const currentDetailOpenState = getCitizenCardSectionOpenState(citizenId);
  window.WS_APP.citizenCardSectionStateByCitizen = window.WS_APP.citizenCardSectionStateByCitizen || {};
  const detailOpenState = {
    ...(window.WS_APP.citizenCardSectionStateByCitizen[citizenId] || {}),
    ...currentDetailOpenState
  };
  if (citizenId) window.WS_APP.citizenCardSectionStateByCitizen[citizenId] = detailOpenState;

  return {
    windowScrollX: Number(window.scrollX || window.pageXOffset || 0),
    windowScrollY: Number(window.scrollY || window.pageYOffset || 0),
    moduleScrollTop: Number(moduleGrid?.scrollTop || 0),
    cardScrollTop: Number(card?.scrollTop || 0),
    focusSelector: getCitizenCardFocusSelector(activeElement, card),
    financialTabId: String(checkedFinancialTab?.id || "").trim(),
    detailOpenState
  };
}

function restoreCitizenCardUiState(card, state = {}) {
  if (!card || !state) return;
  const moduleGrid = document.querySelector("#module-grid");
  const restoreScroll = () => {
    if (moduleGrid) moduleGrid.scrollTop = Number(state.moduleScrollTop || 0);
    card.scrollTop = Number(state.cardScrollTop || 0);
    if (typeof window.scrollTo === "function") {
      window.scrollTo({
        left: Number(state.windowScrollX || 0),
        top: Number(state.windowScrollY || 0),
        behavior: "auto"
      });
    }
  };

  restoreScroll();

  if (state.financialTabId) {
    const financialTab = card.querySelector?.(`[id="${escapeCitizenCardSelectorValue(state.financialTabId)}"]`);
    if (financialTab) financialTab.checked = true;
  }

  if (state.focusSelector) {
    const focusTarget = card.querySelector?.(state.focusSelector);
    if (focusTarget && typeof focusTarget.focus === "function") {
      try {
        focusTarget.focus({ preventScroll: true });
      } catch (error) {
        focusTarget.focus();
      }
    }
  }

  window.requestAnimationFrame?.(restoreScroll);
}

function updateCitizenCardMountedMode(user, citizen, moduleLabel, options, nextMode, trigger = null) {
  const card = trigger?.closest?.(".citizen-card-view")
    || Array.from(document.querySelectorAll(".citizen-card-view")).find((node) => String(node.dataset?.citizenId || "") === String(citizen?.id || ""));
  const layout = card?.querySelector?.(".citizen-card-layout");
  if (!card || !layout || !citizen) return false;

  const normalizedMode = String(nextMode || "full").toLowerCase() === "compact" ? "compact" : "full";
  const currentMode = card.classList?.contains("citizen-card-mode-compact") ? "compact" : "full";
  if (normalizedMode === currentMode) return true;

  const uiState = captureCitizenCardUiState(card);
  const identity = getCitizenCardIdentityView(citizen, user);
  const { ledger, activeSubscriptions } = getCitizenCardSummaryStats(citizen);
  window.WS_APP.citizenCardViewMode = normalizedMode;

  layout.innerHTML = renderCitizenCardLayoutContent(
    citizen,
    identity,
    normalizedMode,
    ledger,
    activeSubscriptions,
    uiState.detailOpenState
  );

  card.classList?.toggle("citizen-card-mode-full", normalizedMode === "full");
  card.classList?.toggle("citizen-card-mode-compact", normalizedMode === "compact");
  card.querySelectorAll?.("[data-citizen-card-mode]").forEach((button) => {
    button.classList?.toggle("is-active", String(button.dataset?.citizenCardMode || "") === normalizedMode);
  });

  bindCitizenCardLayoutActions(layout, user, citizen, moduleLabel, options);
  restoreCitizenCardUiState(card, uiState);
  return true;
}

function updateCitizenCardEquipmentSection(root, user, citizen, moduleLabel, options, preferredFocusSelector = "") {
  const card = root?.closest?.(".citizen-card-view") || root?.querySelector?.(".citizen-card-view") || null;
  const section = card?.querySelector?.('[data-citizen-card-section-key="equipment"]');
  const body = section?.querySelector?.(".citizen-card-section-body");
  if (!card || !section || !body || !citizen) return false;

  const uiState = captureCitizenCardUiState(card);
  if (preferredFocusSelector) uiState.focusSelector = preferredFocusSelector;
  const compact = card.classList?.contains("citizen-card-mode-compact") === true;
  body.innerHTML = renderCitizenEquipmentSummaryBlock(citizen, { compact, inspectable: true });
  bindCitizenCardEquipmentActions(body, user, citizen, moduleLabel, options);
  restoreCitizenCardUiState(card, uiState);
  return true;
}

function bindCitizenCardModeActions(root, user, citizen, moduleLabel, options) {
  root.querySelectorAll?.("[data-citizen-card-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextMode = button.dataset.citizenCardMode || "full";
      updateCitizenCardMountedMode(user, citizen, moduleLabel, options, nextMode, button);
    });
  });
}

function bindCitizenCardQuickLinkActions(root, user, citizen, moduleLabel, options) {
  root.querySelectorAll?.("[data-citizen-card-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = String(button.dataset.citizenCardAction || "").trim().toLowerCase();
      const targetId = String(button.dataset.citizenCardTargetId || citizen?.id || user?.citizenId || "").trim();
      if (!action) return;

      const returnView = () => renderCitizenCardModule(user, moduleLabel, citizen.id, options);
      window.WS_APP.pushModuleView?.(returnView);

      if (action === "terminal") {
        window.WS_APP.openModule?.("terminal-hub", user, { skipLoader: true, citizenId: targetId, panel: "inbox" });
        return;
      }

      if (action === "billing") {
        window.WS_APP.openModule?.("terminal-hub", user, { skipLoader: true, citizenId: targetId, panel: "billing", section: "transactions" });
        return;
      }

      if (action === "subscriptions") {
        window.WS_APP.openModule?.("subscriptions", user, { skipLoader: true });
        return;
      }

      if (action === "service") {
        window.WS_APP.openModule?.("service", user, { skipLoader: true });
        return;
      }

      if (action === "citizen-files") {
        window.WS_APP.openModule?.("citizen-files", user, { skipLoader: true });
      }
    });
  });
}

function bindCitizenCardSubscriptionActions(root, user, citizen, moduleLabel, options) {
  root.querySelectorAll?.("[data-view-subscription-id]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const subscriptionId = String(button.dataset.viewSubscriptionId || "").trim();
      if (!subscriptionId) return;
      const returnView = () => renderCitizenCardModule(user, moduleLabel, citizen.id, options);

      if (typeof window.WS_APP.openCitizenSubscriptionFromSummary === "function") {
        window.WS_APP.openCitizenSubscriptionFromSummary(user, citizen, subscriptionId, {
          returnView,
          returnViewId: "citizen-card"
        });
        return;
      }

      const activeSubscriptions = getCitizenCardSummaryStats(citizen).activeSubscriptions || [];
      const subscription = activeSubscriptions.find((item) => String(item.id || "") === subscriptionId)
        || (Array.isArray(citizen.subscriptions) ? citizen.subscriptions : []).find((item) => String(item.id || "") === subscriptionId)
        || null;
      window.WS_APP.pushModuleView?.(returnView);

      if (user?.role === "admin" && typeof window.WS_APP.renderAdminCitizenSubscriptionControl === "function") {
        window.WS_APP.renderAdminCitizenSubscriptionControl(user, citizen.id, {
          category: subscription?.category || "INSURANCE",
          selectedSubscriptionId: subscriptionId
        });
        return;
      }

      if (typeof window.WS_APP.renderPlayerSubscriptionProfile === "function") {
        window.WS_APP.renderPlayerSubscriptionProfile(user, subscriptionId, "citizen-card");
        return;
      }

      window.WS_APP.openModule?.("subscriptions", user, { skipLoader: true });
    });
  });
}

function bindCitizenCardEquipmentActions(root, user, citizen, moduleLabel, options) {
  root.querySelectorAll?.("[data-citizen-card-equipment-item-id]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const itemId = String(button.dataset.citizenCardEquipmentItemId || "").trim();
      if (!citizen?.id || !itemId) return;
      window.WS_APP.citizenCardEquipmentInspectorByCitizen = window.WS_APP.citizenCardEquipmentInspectorByCitizen || {};
      window.WS_APP.citizenCardEquipmentInspectorByCitizen[citizen.id] = itemId;
      updateCitizenCardEquipmentSection(
        root,
        user,
        citizen,
        moduleLabel,
        options,
        `[data-citizen-card-equipment-item-id="${escapeCitizenCardSelectorValue(itemId)}"]`
      );
    });
  });

  root.querySelectorAll?.("[data-citizen-card-equipment-clear]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (citizen?.id && window.WS_APP.citizenCardEquipmentInspectorByCitizen) {
        delete window.WS_APP.citizenCardEquipmentInspectorByCitizen[citizen.id];
      }
      updateCitizenCardEquipmentSection(
        root,
        user,
        citizen,
        moduleLabel,
        options,
        '[data-citizen-card-section-key="equipment"] > summary'
      );
    });
  });
}

function bindCitizenCardLayoutActions(root, user, citizen, moduleLabel, options) {
  bindCitizenCardSubscriptionActions(root, user, citizen, moduleLabel, options);
  bindCitizenCardEquipmentActions(root, user, citizen, moduleLabel, options);
}

function bindCitizenCardPolishActions(user, citizen, moduleLabel = "CITIZEN CARD", options = {}) {
  const card = Array.from(document.querySelectorAll(".citizen-card-view"))
    .find((node) => String(node.dataset?.citizenId || "") === String(citizen?.id || ""));
  if (!card) return;
  bindCitizenCardModeActions(card, user, citizen, moduleLabel, options);
  bindCitizenCardQuickLinkActions(card, user, citizen, moduleLabel, options);
  bindCitizenCardLayoutActions(card, user, citizen, moduleLabel, options);
}
