window.WS_APP = window.WS_APP || {};

(function initDataIOModule() {
  const CAMPAIGN_SCHEMA = "ws-local-campaign-data-v6";
  const CAMPAIGN_SCHEMA_VERSION = 6;
  const LAST_IMPORT_BACKUP_KEY = "ws_app_last_import_backup_v6";
  let initialized = false;
  let dataIOScrollLock = null;
  let pendingKnowledgePackImport = null;

  function appendDataIoAudit(event = {}) {
    const user = window.WS_APP.currentUser || {};
    return window.WS_APP.appendAdminAuditEvent?.({
      category: "DATA_IO",
      workspace: "DATA_SETTINGS",
      ...event
    }, { user });
  }

  window.WS_APP.initDataIO = function initDataIO() {
    if (initialized) return;
    initialized = true;

    ensureDataIOShell();
    ensureDataIOButton();
    bindDataIOEvents();
    window.WS_APP.syncTerminalTools?.();
  };

  window.WS_APP.openDataIO = function openDataIO(options = {}) {
    if (window.WS_APP.currentUser?.role !== "admin") {
      window.WS_APP.appendTerminalLogLine?.("DATA I/O DENIED / ADMIN CLEARANCE REQUIRED", {
        extraClass: "module-denied-line",
        typed: true,
        speed: 8
      });
      return;
    }

    const viewportState = captureDataIOViewportState();

    ensureDataIOShell();
    ensureDataIOButton();
    updateDataIOMeta();

    const overlay = document.querySelector("#data-io-overlay");

    if (!overlay) return;

    lockDataIOViewport(viewportState);
    overlay.classList.add("is-active");
    overlay.setAttribute("aria-hidden", "false");

    if (options?.preserveViewport) {
      restoreDataIOViewportState(viewportState);
      window.setTimeout(() => restoreDataIOViewportState(viewportState), 0);
    }

    if (options?.focusKnowledgeWorkspace) {
      window.setTimeout(() => {
        document.querySelector("#knowledge-pack-workspace")?.scrollIntoView?.({ block: "start" });
        document.querySelector("#knowledge-pack-connect-button")?.focus?.();
      }, 0);
    }
  };

  window.WS_APP.closeDataIO = function closeDataIO() {
    const overlay = document.querySelector("#data-io-overlay");

    if (!overlay) return;

    overlay.classList.remove("is-active");
    overlay.setAttribute("aria-hidden", "true");
    setDataIOMessage("");
    unlockDataIOViewport();
  };

  window.WS_APP.exportCampaignData = function exportCampaignData() {
    if (typeof window.WS_APP.exportCampaignSnapshotV6 !== "function") {
      throw new Error("CAMPAIGN_DATA_IO_V6_API_REQUIRED");
    }
    return window.WS_APP.exportCampaignSnapshotV6();
  };

  window.WS_APP.downloadCampaignExport = function downloadCampaignExport() {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
    downloadJson(window.WS_APP.exportCampaignData(), `ws-campaign-v6-${stamp}.json`);
  };

  function captureDataIOViewportState() {
    return {
      x: window.scrollX || document.documentElement?.scrollLeft || 0,
      y: window.scrollY || document.documentElement?.scrollTop || 0
    };
  }

  function lockDataIOViewport(viewportState = captureDataIOViewportState()) {
    if (document.body?.classList.contains("is-data-io-open")) return;
    dataIOScrollLock = viewportState;
    document.body?.classList.add("is-data-io-open");
    restoreDataIOViewportState(viewportState);
  }

  function unlockDataIOViewport() {
    const viewportState = dataIOScrollLock;
    dataIOScrollLock = null;
    document.body?.classList.remove("is-data-io-open");
    restoreDataIOViewportState(viewportState);
  }

  function restoreDataIOViewportState(viewportState) {
    if (!viewportState) return;
    window.requestAnimationFrame?.(() => window.scrollTo(viewportState.x || 0, viewportState.y || 0));
  }

  function ensureDataIOButton() {
    const sidefeed = document.querySelector(".terminal-sidefeed");
    const logPanel = document.querySelector(".terminal-log");

    if (!sidefeed || document.querySelector("#data-io-button")) return;

    const panel = document.createElement("section");
    panel.className = "terminal-tool-panel";
    panel.id = "data-io-panel";
    panel.hidden = window.WS_APP.currentUser?.role !== "admin";

    const button = document.createElement("button");
    button.className = "terminal-tool-button";
    button.id = "data-io-button";
    button.type = "button";
    button.textContent = "Data I/O";
    button.addEventListener("click", () => window.WS_APP.openDataIO());

    panel.appendChild(button);
    sidefeed.insertBefore(panel, logPanel || null);
  }

  function ensureDataIOShell() {
    if (document.querySelector("#data-io-overlay")) return;

    const node = document.createElement("div");
    node.className = "data-io-overlay";
    node.id = "data-io-overlay";
    node.setAttribute("aria-hidden", "true");
    node.innerHTML = `
      <section class="data-io-dialog" role="dialog" aria-modal="true" aria-labelledby="data-io-title">
        <header class="data-io-head">
          <div>
            <p class="kicker">WATCH & SECURE / LOCAL DATA CONTROL</p>
            <h4 id="data-io-title">Import / Export</h4>
          </div>

          <button class="data-io-close" id="data-io-close" type="button" aria-label="Zamknij panel importu i eksportu">X</button>
        </header>

        <div class="data-io-meta" id="data-io-meta"></div>

        <section class="knowledge-pack-workspace" id="knowledge-pack-workspace">
          <header class="knowledge-pack-workspace__head">
            <div>
              <p class="kicker">KNOWLEDGE PACK WORKSPACE</p>
              <h5>External Content Pack</h5>
            </div>
            <strong class="knowledge-pack-workspace__state" id="knowledge-pack-workspace-state">LOCAL / SYNCED</strong>
          </header>

          <div class="knowledge-pack-workspace__summary" id="knowledge-pack-workspace-summary"></div>

          <div class="knowledge-pack-workspace__actions">
            <button type="button" id="knowledge-pack-connect-button">Connect Pack</button>
            <button type="button" id="knowledge-pack-save-button">Save Pack</button>
            <button type="button" id="knowledge-pack-save-copy-button">Save Copy</button>
            <button type="button" id="download-knowledge-backup-button">Download Backup</button>
            <button type="button" id="knowledge-pack-disconnect-button">Disconnect</button>
          </div>

          <section class="knowledge-pack-preview" id="knowledge-pack-preview" hidden></section>
        </section>

        <section class="data-io-grid">
          <button class="data-io-action" id="export-campaign-button" type="button">
            <b>Export Campaign Snapshot v6</b>
            <span>Complete campaign-persistent domains, checksums, schema manifest, active operations and recovery receipts.</span>
          </button>

          <button class="data-io-action" id="export-citizens-button" type="button">
            <b>Export Citizens Only</b>
            <span>Current citizen store from localStorage-aware state.</span>
          </button>

          <button class="data-io-action" id="export-entries-button" type="button">
            <b>Export Entries Only</b>
            <span>Current encyclopedia entries, including archived records.</span>
          </button>

          <button class="data-io-action" id="export-addresses-button" type="button">
            <b>Export Addresses Only</b>
            <span>Current Address Core records, including archived records.</span>
          </button>

          <button class="data-io-action" id="export-tags-button" type="button">
            <b>Export Tags Only</b>
            <span>Current Tag Registry records, including archived records.</span>
          </button>

          <button class="data-io-action" id="export-system-records-button" type="button">
            <b>Export System Records Only</b>
            <span>Current System and System Index records, including archived records.</span>
          </button>

          <button class="data-io-action" id="export-case-files-button" type="button">
            <b>Export Case Files Only</b>
            <span>Current Case Files records, including archived records.</span>
          </button>

          <button class="data-io-action" id="import-json-button" type="button">
            <b>Import JSON</b>
            <span>Snapshot v6 uses validate-all, stage-all, atomic commit, verification and automatic rollback.</span>
          </button>

          <button class="data-io-action" id="download-import-backup-button" type="button">
            <b>Download Last Import Backup</b>
            <span>Retrieves the complete Snapshot v6 backup created before import or campaign reset.</span>
          </button>

          <button class="data-io-action danger" id="reset-campaign-button" type="button">
            <b>Reset Campaign State v6</b>
            <span>Backs up and clears all campaign-persistent domains, then reloads canonical seeds.</span>
          </button>

          <button class="data-io-action danger" id="reset-citizens-button" type="button">
            <b>Reset Citizen Runtime</b>
            <span>Pre-alpha destructive reset of Citizens and all linked runtime domains, then reload.</span>
          </button>

          <button class="data-io-action danger" id="reset-entries-button" type="button">
            <b>Reset Local Entries</b>
            <span>Clears local encyclopedia records and returns to data/entries.js seed.</span>
          </button>

          <button class="data-io-action danger" id="reset-addresses-button" type="button">
            <b>Reset Local Addresses</b>
            <span>Clears Address Core records and returns to data/addresses.js seed.</span>
          </button>

          <button class="data-io-action danger" id="reset-tags-button" type="button">
            <b>Reset Local Tags</b>
            <span>Clears Tag Registry records and returns to data/tags.js seed.</span>
          </button>

          <button class="data-io-action danger" id="reset-system-records-button" type="button">
            <b>Reset Local System Records</b>
            <span>Clears System and System Index records and returns to data/system-records.js seed.</span>
          </button>

          <button class="data-io-action danger" id="reset-case-files-button" type="button">
            <b>Reset Local Case Files</b>
            <span>Clears Case Files records and returns to data/case-files.js seed.</span>
          </button>
        </section>

        <input id="data-import-file" type="file" accept="application/json,.json" hidden />
        <input id="knowledge-pack-import-file" type="file" accept="application/json,.json,.pack.json" hidden />

        <div class="data-io-message" id="data-io-message"></div>
      </section>
    `;

    document.body.appendChild(node);
  }

  function bindDataIOEvents() {
    document.addEventListener("click", (event) => {
      if (event.target?.id === "data-io-close" || event.target?.id === "data-io-overlay") {
        window.WS_APP.closeDataIO();
        return;
      }

      if (event.target?.closest?.("#export-campaign-button")) {
        try {
          const snapshot = window.WS_APP.exportCampaignData?.();
          const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
          downloadJson(snapshot, `ws-campaign-v6-${stamp}.json`);
          appendDataIoAudit({
            action: "CAMPAIGN_EXPORT_COMPLETED",
            target: "CAMPAIGN_SNAPSHOT_V6",
            summary: "Campaign Snapshot v6 exported.",
            resultCode: "CAMPAIGN_EXPORT_COMPLETED",
            status: "SUCCEEDED",
            meta: { domainCount: snapshot?.manifest?.domains?.length || 0, schemaVersion: snapshot?.schemaVersion || CAMPAIGN_SCHEMA_VERSION }
          });
          setDataIOMessage("EXPORT COMPLETE / CAMPAIGN SNAPSHOT WRITTEN", "ok");
          log("CAMPAIGN DATA EXPORTED");
        } catch (error) {
          appendDataIoAudit({
            action: "CAMPAIGN_EXPORT_FAILED",
            target: "CAMPAIGN_SNAPSHOT_V6",
            summary: `Campaign export failed: ${error?.message || "UNKNOWN"}.`,
            resultCode: error?.message || "CAMPAIGN_EXPORT_FAILED",
            status: "FAILED"
          });
          setDataIOMessage(`EXPORT FAILED / ${error?.message || "UNKNOWN"}`, "error");
        }
        return;
      }

      if (event.target?.closest?.("[data-open-knowledge-workspace]")) {
        window.WS_APP.openDataIO({ preserveViewport: true, focusKnowledgeWorkspace: true });
        return;
      }

      if (event.target?.closest?.("#knowledge-pack-connect-button")) {
        connectKnowledgePackWorkspace();
        return;
      }

      if (event.target?.closest?.("#knowledge-pack-save-button")) {
        saveKnowledgePackWorkspace();
        return;
      }

      if (event.target?.closest?.("#knowledge-pack-save-copy-button")) {
        saveKnowledgePackCopy();
        return;
      }

      if (event.target?.closest?.("#knowledge-pack-disconnect-button")) {
        disconnectKnowledgePackWorkspace();
        return;
      }

      if (event.target?.closest?.("#knowledge-pack-preview-apply")) {
        commitPendingKnowledgePackImport();
        return;
      }

      if (event.target?.closest?.("#knowledge-pack-preview-cancel")) {
        clearKnowledgePackPreview("IMPORT CANCELLED / NO KNOWLEDGE DATA CHANGED");
        return;
      }

      if (event.target?.closest?.("#download-knowledge-backup-button")) {
        const backup = window.WS_APP.getKnowledgePackBackup?.();
        if (!backup) {
          setDataIOMessage("BACKUP UNAVAILABLE / NO KNOWLEDGE PACK BACKUP FOUND", "error");
          return;
        }
        const stamp = String(backup.createdAt || new Date().toISOString()).slice(0, 19).replace(/[T:]/g, "-");
        downloadJson(backup, `knowledge-pack-backup-${stamp}.json`);
        setDataIOMessage("BACKUP WRITTEN / KNOWLEDGE PACK SNAPSHOT DOWNLOADED", "ok");
        log("KNOWLEDGE PACK BACKUP DOWNLOADED");
        return;
      }

      if (event.target?.closest?.("#export-citizens-button")) {
        const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
        downloadJson(window.WS_APP.getCitizens?.({ includeArchived: true }) || [], `ws-citizens-${stamp}.json`);
        setDataIOMessage("EXPORT COMPLETE / CITIZENS WRITTEN", "ok");
        log("CITIZENS EXPORTED");
        return;
      }

      if (event.target?.closest?.("#export-entries-button")) {
        const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
        downloadJson({ recordType: "entries", records: window.WS_APP.getEntries?.({ includeArchived: true }) || [] }, `ws-entries-${stamp}.json`);
        setDataIOMessage("EXPORT COMPLETE / ENTRIES WRITTEN", "ok");
        log("ENTRIES EXPORTED");
        return;
      }

      if (event.target?.closest?.("#export-addresses-button")) {
        const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
        downloadJson({ recordType: "addresses", records: window.WS_APP.getAddresses?.({ includeArchived: true }) || [] }, `ws-addresses-${stamp}.json`);
        setDataIOMessage("EXPORT COMPLETE / ADDRESSES WRITTEN", "ok");
        log("ADDRESSES EXPORTED");
        return;
      }

      if (event.target?.closest?.("#export-tags-button")) {
        const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
        downloadJson({ recordType: "tags", records: window.WS_APP.getTags?.({ includeArchived: true }) || [] }, `ws-tags-${stamp}.json`);
        setDataIOMessage("EXPORT COMPLETE / TAGS WRITTEN", "ok");
        log("TAGS EXPORTED");
        return;
      }

      if (event.target?.closest?.("#export-system-records-button")) {
        const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
        downloadJson({ recordType: "systemRecords", records: window.WS_APP.getSystemRecords?.({ includeArchived: true }) || [] }, `ws-system-records-${stamp}.json`);
        setDataIOMessage("EXPORT COMPLETE / SYSTEM RECORDS WRITTEN", "ok");
        log("SYSTEM RECORDS EXPORTED");
        return;
      }

      if (event.target?.closest?.("#export-case-files-button")) {
        const stamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-");
        downloadJson({ recordType: "caseFiles", records: window.WS_APP.getCaseFiles?.({ includeArchived: true }) || [] }, `ws-case-files-${stamp}.json`);
        setDataIOMessage("EXPORT COMPLETE / CASE FILES WRITTEN", "ok");
        log("CASE FILES EXPORTED");
        return;
      }

      if (event.target?.closest?.("#import-json-button")) {
        document.querySelector("#data-import-file")?.click();
        return;
      }


      if (event.target?.closest?.("#download-import-backup-button")) {
        const backup = readLastImportBackup();
        if (!backup) {
          setDataIOMessage("BACKUP UNAVAILABLE / NO IMPORT BACKUP FOUND", "error");
          log("IMPORT BACKUP DOWNLOAD FAILED / NO BACKUP");
          return;
        }
        const stamp = String(backup.createdAt || new Date().toISOString()).slice(0, 19).replace(/[T:]/g, "-");
        downloadJson(backup, `ws-import-backup-${stamp}.json`);
        setDataIOMessage("BACKUP WRITTEN / LAST IMPORT SNAPSHOT DOWNLOADED", "ok");
        log("IMPORT BACKUP DOWNLOADED");
        return;
      }

      if (event.target?.closest?.("#reset-campaign-button")) {
        resetCampaignState();
        return;
      }

      if (event.target?.closest?.("#reset-citizens-button")) {
        resetCitizens();
        return;
      }

      if (event.target?.closest?.("#reset-entries-button")) {
        resetEntries();
        return;
      }

      if (event.target?.closest?.("#reset-addresses-button")) {
        resetAddresses();
        return;
      }

      if (event.target?.closest?.("#reset-tags-button")) {
        resetTags();
        return;
      }

      if (event.target?.closest?.("#reset-system-records-button")) {
        resetSystemRecords();
        return;
      }

      if (event.target?.closest?.("#reset-case-files-button")) {
        resetCaseFiles();
      }
    });

    document.addEventListener("change", (event) => {
      if (event.target?.id === "data-import-file") {
        importJsonFile(event.target.files?.[0]);
        event.target.value = "";
        return;
      }

      if (event.target?.id === "knowledge-pack-import-file") {
        importKnowledgePackFile(event.target.files?.[0]);
        event.target.value = "";
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        window.WS_APP.closeDataIO();
      }
    });

    window.addEventListener("ws:citizens-updated", updateDataIOMeta);
    window.addEventListener("ws:entries-updated", updateDataIOMeta);
    window.addEventListener("ws:addresses-updated", updateDataIOMeta);
    window.addEventListener("ws:tags-updated", updateDataIOMeta);
    window.addEventListener("ws:system-records-updated", updateDataIOMeta);
    window.addEventListener("ws:knowledge-pack-updated", updateDataIOMeta);
    window.addEventListener("ws:knowledge-pack-workspace-updated", updateDataIOMeta);
    window.addEventListener("ws:knowledge-pack-saved", updateDataIOMeta);
    window.addEventListener("ws:case-files-updated", updateDataIOMeta);
    window.addEventListener("ws:access-control-updated", updateDataIOMeta);
    window.addEventListener("ws:terminal-rendered", () => {
      ensureDataIOButton();
      window.WS_APP.syncTerminalTools?.();
    });
  }

  function formatKnowledgePreview(preview) {
    if (!preview?.registries) return "";
    const labels = [
      ["ENCYCLOPEDIA", preview.registries.encyclopedia],
      ["SYSTEM", preview.registries.system],
      ["SYSTEM INDEX", preview.registries.systemIndex]
    ];
    return labels.map(([label, stats]) => (
      `${label}: ${stats.incoming} incoming / ${stats.added} new / ${stats.updated} conflicts / ${stats.tombstones} deleted`
    )).join("\n");
  }

  function renderKnowledgeChangeItems(items = [], type = "added") {
    if (!Array.isArray(items) || !items.length) return "";
    const limited = items.slice(0, 40);
    const rows = limited.map((item) => {
      const fields = Array.isArray(item.changedFields) && item.changedFields.length
        ? `<small>${escapeHtml(item.changedFields.join(", "))}</small>`
        : "";
      return `
        <li>
          <b>${escapeHtml(item.label || item.id)}</b>
          <code>${escapeHtml(item.id)}</code>
          ${fields}
        </li>
      `;
    }).join("");
    const remainder = items.length > limited.length
      ? `<li class="is-overflow">+${escapeHtml(items.length - limited.length)} more ${escapeHtml(type)}</li>`
      : "";
    return `<ul class="knowledge-pack-change-list knowledge-pack-change-list--${escapeHtml(type)}">${rows}${remainder}</ul>`;
  }

  function renderKnowledgeRegistryPreview(label, stats = {}) {
    const changes = stats.changes || {};
    return `
      <article class="knowledge-pack-preview__registry">
        <header>
          <b>${escapeHtml(label)}</b>
          <span>${escapeHtml(stats.incoming || 0)} INCOMING</span>
        </header>
        <div class="knowledge-pack-preview__counts">
          <span><b>${escapeHtml(stats.added || 0)}</b> NEW</span>
          <span><b>${escapeHtml(stats.updated || 0)}</b> CONFLICTS</span>
          <span><b>${escapeHtml(stats.tombstones || 0)}</b> REMOVED</span>
          <span><b>${escapeHtml(stats.unchanged || 0)}</b> UNCHANGED</span>
        </div>
        ${changes.added?.length ? `<details><summary>New records</summary>${renderKnowledgeChangeItems(changes.added, "added")}</details>` : ""}
        ${changes.updated?.length ? `<details open><summary>Records replaced by incoming data</summary>${renderKnowledgeChangeItems(changes.updated, "updated")}</details>` : ""}
        ${changes.removed?.length ? `<details><summary>Explicit tombstones</summary>${renderKnowledgeChangeItems(changes.removed, "removed")}</details>` : ""}
        ${changes.ignoredTombstones?.length ? `<details><summary>Ignored tombstones</summary>${renderKnowledgeChangeItems(changes.ignoredTombstones, "ignored")}</details>` : ""}
      </article>
    `;
  }

  function renderPendingKnowledgePackPreview() {
    const host = document.querySelector("#knowledge-pack-preview");
    if (!host) return;

    if (!pendingKnowledgePackImport?.preview?.ok) {
      host.hidden = true;
      host.innerHTML = "";
      return;
    }

    const { preview, fileName, source } = pendingKnowledgePackImport;
    const warnings = Array.isArray(preview.warnings) && preview.warnings.length
      ? `<div class="knowledge-pack-preview__warnings">WARNINGS / ${escapeHtml(preview.warnings.join(" / "))}</div>`
      : "";

    host.hidden = false;
    host.innerHTML = `
      <header class="knowledge-pack-preview__head">
        <div>
          <p class="kicker">IMPORT PREVIEW / MERGE BY STABLE ID</p>
          <h5>${escapeHtml(preview.pack.packId)} / ${escapeHtml(preview.pack.packVersion)}</h5>
          <small>${escapeHtml(fileName || "selected pack")} / ${escapeHtml(source || "FILE IMPORT")} / SCHEMA V${escapeHtml(preview.pack.schemaVersion)}</small>
        </div>
      </header>

      ${warnings}

      <div class="knowledge-pack-preview__registries">
        ${renderKnowledgeRegistryPreview("ENCYCLOPEDIA", preview.registries.encyclopedia)}
        ${renderKnowledgeRegistryPreview("SYSTEM", preview.registries.system)}
        ${renderKnowledgeRegistryPreview("SYSTEM INDEX", preview.registries.systemIndex)}
      </div>

      <p class="knowledge-pack-preview__rule">
        Missing IDs remain unchanged. Incoming conflicts replace records with the same stable ID. Explicit tombstones remove matching IDs.
      </p>

      <footer class="knowledge-pack-preview__actions">
        <button type="button" id="knowledge-pack-preview-cancel">Cancel</button>
        <button type="button" id="knowledge-pack-preview-apply">Apply Merge</button>
      </footer>
    `;
  }

  function stageKnowledgePackImport(parsed, options = {}) {
    const preview = options.preview || window.WS_APP.previewKnowledgePackImport?.(parsed, { mode: "merge" });
    if (!preview?.ok) {
      const report = (preview?.errors || options.errors || ["UNKNOWN_VALIDATION_ERROR"]).join(" / ");
      setDataIOMessage(`IMPORT BLOCKED / KNOWLEDGE PACK VALIDATION FAILED / ${report}`, "error");
      log("KNOWLEDGE PACK IMPORT BLOCKED / VALIDATION FAILED");
      return false;
    }

    pendingKnowledgePackImport = {
      preview,
      payload: preview.pack,
      handle: options.handle || null,
      fileName: options.fileName || "",
      source: options.source || "FILE IMPORT"
    };

    renderPendingKnowledgePackPreview();
    document.querySelector("#knowledge-pack-preview")?.scrollIntoView?.({ block: "nearest" });
    setDataIOMessage([
      "IMPORT PREVIEW READY",
      formatKnowledgePreview(preview),
      "Review conflicts and apply the merge."
    ].join("\n"));
    return true;
  }

  function clearKnowledgePackPreview(message = "") {
    pendingKnowledgePackImport = null;
    renderPendingKnowledgePackPreview();
    if (message) setDataIOMessage(message);
  }

  async function commitPendingKnowledgePackImport() {
    const pending = pendingKnowledgePackImport;
    if (!pending?.preview?.ok) {
      setDataIOMessage("IMPORT FAILED / NO VALID KNOWLEDGE PACK PREVIEW", "error");
      return false;
    }

    const campaignBackup = createImportBackup();
    if (!campaignBackup) {
      setDataIOMessage("IMPORT BLOCKED / CAMPAIGN BACKUP COULD NOT BE CREATED", "error");
      return false;
    }

    const result = window.WS_APP.importKnowledgePack?.(pending.preview.pack, { mode: "merge" });
    if (!result?.ok) {
      setDataIOMessage(`IMPORT FAILED / ${(result?.errors || ["UNKNOWN_IMPORT_ERROR"]).join(" / ")}`, "error");
      log("KNOWLEDGE PACK IMPORT FAILED");
      return false;
    }

    if (pending.handle) {
      await window.WS_APP.activateKnowledgePackWorkspace?.(pending.handle, {
        fileName: pending.fileName
      });
    }

    pendingKnowledgePackImport = null;
    renderPendingKnowledgePackPreview();
    updateDataIOMeta();
    setDataIOMessage([
      "IMPORT COMPLETE / KNOWLEDGE PACK MERGED",
      `${result.activeCounts.encyclopedia} ENCYCLOPEDIA / ${result.activeCounts.system} SYSTEM / ${result.activeCounts.systemIndex} SYSTEM INDEX`,
      pending.handle ? `WORKSPACE CONNECTED / ${pending.fileName}` : "LOCAL PACK ACTIVE",
      result.warnings?.length ? `WARNINGS / ${result.warnings.join(" / ")}` : "BACKUPS CREATED"
    ].join("\n"), "ok");
    log(`KNOWLEDGE PACK IMPORTED / ${result.meta.packId} / ${result.meta.packVersion}`);
    return true;
  }

  async function connectKnowledgePackWorkspace() {
    if (typeof window.WS_APP.pickKnowledgePackWorkspaceFile !== "function") {
      document.querySelector("#knowledge-pack-import-file")?.click();
      return;
    }

    const result = await window.WS_APP.pickKnowledgePackWorkspaceFile();
    if (!result?.ok) {
      if (result?.error === "WORKSPACE_PICK_CANCELLED") return;
      if (result?.error === "FILE_SYSTEM_ACCESS_UNAVAILABLE") {
        document.querySelector("#knowledge-pack-import-file")?.click();
        return;
      }
      const validationErrors = result?.validation?.errors || [];
      setDataIOMessage(`CONNECT FAILED / ${[result?.error, ...validationErrors].filter(Boolean).join(" / ") || "UNKNOWN_ERROR"}`, "error");
      return;
    }

    stageKnowledgePackImport(result.payload, {
      preview: result.preview,
      handle: result.handle,
      fileName: result.fileName,
      source: "WORKSPACE CONNECT"
    });
  }

  async function saveKnowledgePackWorkspace() {
    const result = await window.WS_APP.saveKnowledgePackWorkspace?.();
    if (!result?.ok) {
      setDataIOMessage(`SAVE FAILED / ${result?.error || "WORKSPACE_STORE_UNAVAILABLE"}`, "error");
      return false;
    }

    updateDataIOMeta();
    setDataIOMessage(`SAVE COMPLETE / ${result.workspace.fileName} / PACK SYNCED`, "ok");
    log(`KNOWLEDGE PACK SAVED / ${result.workspace.fileName}`);
    return true;
  }

  async function saveKnowledgePackCopy() {
    const result = await window.WS_APP.saveKnowledgePackCopy?.();
    if (!result?.ok) {
      if (result?.error === "WORKSPACE_SAVE_CANCELLED") return false;
      if (result?.error === "FILE_SYSTEM_ACCESS_UNAVAILABLE" && result.pack) {
        downloadJson(result.pack, result.suggestedName || "future-noir-main.pack.json");
        window.WS_APP.setKnowledgePackMeta?.({
          updatedAt: result.pack.updatedAt,
          lastExportedAt: new Date().toISOString(),
          dirty: false
        });
        updateDataIOMeta();
        setDataIOMessage("SAVE COPY COMPLETE / DOWNLOAD FALLBACK USED", "ok");
        log("KNOWLEDGE PACK COPY EXPORTED");
        return true;
      }
      setDataIOMessage(`SAVE COPY FAILED / ${result?.error || "WORKSPACE_STORE_UNAVAILABLE"}`, "error");
      return false;
    }

    updateDataIOMeta();
    setDataIOMessage(`SAVE COPY COMPLETE / ACTIVE WORKSPACE ${result.workspace.fileName}`, "ok");
    log(`KNOWLEDGE PACK COPY SAVED / ${result.workspace.fileName}`);
    return true;
  }

  async function disconnectKnowledgePackWorkspace() {
    const result = await window.WS_APP.disconnectKnowledgePackWorkspace?.();
    if (!result?.ok) {
      setDataIOMessage(`DISCONNECT FAILED / ${result?.error || "WORKSPACE_STORE_UNAVAILABLE"}`, "error");
      return false;
    }

    clearKnowledgePackPreview();
    updateDataIOMeta();
    setDataIOMessage("WORKSPACE DISCONNECTED / LOCAL KNOWLEDGE DATA PRESERVED", "ok");
    log("KNOWLEDGE PACK WORKSPACE DISCONNECTED");
    return true;
  }

  function importKnowledgePackPayload(parsed, options = {}) {
    return stageKnowledgePackImport(parsed, options);
  }

  function importKnowledgePackFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        importKnowledgePackPayload(parsed, {
          fileName: file.name,
          source: "FILE IMPORT"
        });
      } catch (error) {
        console.warn("W&S knowledge pack import failed.", error);
        setDataIOMessage("IMPORT FAILED / KNOWLEDGE PACK JSON PARSE ERROR", "error");
      }
    });
    reader.readAsText(file);
  }

  function importJsonFile(file) {
    if (!file) return;

    const reader = new FileReader();

    reader.addEventListener("load", async () => {
      let parsed;
      try {
        parsed = JSON.parse(String(reader.result || ""));
      } catch (error) {
        console.warn("W&S import parse failed.", error);
        setDataIOMessage("IMPORT FAILED / SNAPSHOT_PARSE_FAILED", "error");
        log("IMPORT FAILED / SNAPSHOT_PARSE_FAILED");
        return;
      }

      if (window.WS_APP.isKnowledgePackPayload?.(parsed)) {
        await importKnowledgePackPayload(parsed, { source: "DATA I/O IMPORT" });
        return;
      }

      if (window.WS_APP.isCampaignSnapshotV6?.(parsed)) {
        await importCampaignSnapshotV6FromUi(parsed);
        return;
      }

      await importLegacyJsonFromUi(parsed);
    });

    reader.readAsText(file);
  }

  async function importCampaignSnapshotV6FromUi(parsed) {
    const preview = window.WS_APP.previewCampaignSnapshotV6?.(parsed);
    if (!preview?.ok) {
      const code = preview?.error?.code || "SNAPSHOT_MANIFEST_INVALID";
      const reason = preview?.error?.reason || "";
      setDataIOMessage(`IMPORT BLOCKED / ${code}${reason ? ` / ${reason}` : ""}`, "error");
      log(`IMPORT BLOCKED / ${code}`);
      appendDataIoAudit({
        action: "CAMPAIGN_IMPORT_BLOCKED",
        target: "CAMPAIGN_SNAPSHOT_V6",
        summary: `Campaign import blocked: ${code}.`,
        resultCode: code,
        status: "FAILED",
        meta: { reason }
      });
      return;
    }

    const confirmed = await (window.WS_APP.confirmAction?.({
      title: "IMPORT CAMPAIGN SNAPSHOT V6",
      message: [
        `Domains: ${preview.summary.domainCount}`,
        `Records: ${preview.summary.recordCount}`,
        `Active operations: ${preview.summary.activeOperationCount}`,
        "All domains will be validated and staged before commit.",
        "A complete pre-import backup will be created. Any failure triggers rollback. Continue?"
      ].join("\n"),
      confirmLabel: "Import",
      cancelLabel: "Cancel",
      tone: "danger"
    }) ?? Promise.resolve(true));

    if (!confirmed) {
      setDataIOMessage("IMPORT CANCELLED / NO DATA CHANGED", "");
      return;
    }

    const operatorNote = String(window.prompt?.("Operator note required for Campaign Snapshot import:", "") || "").trim();
    if (!operatorNote) {
      setDataIOMessage("IMPORT BLOCKED / OPERATOR NOTE REQUIRED", "error");
      appendDataIoAudit({
        action: "CAMPAIGN_IMPORT_BLOCKED",
        target: "CAMPAIGN_SNAPSHOT_V6",
        summary: "Campaign import blocked because operator note was missing.",
        resultCode: "REASON_REQUIRED",
        status: "FAILED"
      });
      return;
    }

    const importCorrelationId = window.crypto?.randomUUID?.() || `campaign-import-${Date.now()}`;
    const result = window.WS_APP.importCampaignSnapshotV6?.(parsed);
    if (!result?.ok) {
      const code = result?.error?.code || "SNAPSHOT_COMMIT_FAILED";
      const rollback = result?.error?.rolledBack === true ? " / ROLLBACK COMPLETE" : "";
      setDataIOMessage(`IMPORT FAILED / ${code}${rollback}`, "error");
      log(`IMPORT FAILED / ${code}${rollback}`);
      appendDataIoAudit({
        action: result?.error?.rolledBack === true ? "CAMPAIGN_IMPORT_FAILED_ROLLED_BACK" : "CAMPAIGN_IMPORT_RECOVERY_REQUIRED",
        target: "CAMPAIGN_SNAPSHOT_V6",
        summary: `Campaign import failed: ${code}${rollback}.`,
        resultCode: code,
        status: result?.error?.rolledBack === true ? "FAILED" : "RECOVERY_REQUIRED",
        correlationId: importCorrelationId,
        meta: { operatorNote, rolledBack: result?.error?.rolledBack === true, reloadRequired: result?.error?.reloadRequired === true }
      });
      if (result?.error?.reloadRequired) reloadAfterCampaignDataMutation();
      return;
    }

    appendDataIoAudit({
      action: "CAMPAIGN_IMPORT_COMPLETED",
      target: "CAMPAIGN_SNAPSHOT_V6",
      summary: `Campaign Snapshot v6 imported: ${result.domainCount} domains, ${result.recordCount} records.`,
      resultCode: "CAMPAIGN_IMPORT_COMPLETED",
      status: "SUCCEEDED",
      correlationId: importCorrelationId,
      meta: { operatorNote, domainCount: result.domainCount, recordCount: result.recordCount }
    });
    setDataIOMessage(
      `IMPORT COMPLETE / ${result.domainCount} DOMAINS / ${result.recordCount} RECORDS / RELOAD REQUIRED`,
      "ok"
    );
    log(`CAMPAIGN SNAPSHOT V6 IMPORTED / ${result.domainCount} DOMAINS`);
    reloadAfterCampaignDataMutation();
  }

  async function importLegacyJsonFromUi(parsed) {
    const plan = buildImportPlan(parsed);

    if (!plan.supported.length) {
      setDataIOMessage("IMPORT FAILED / NO SUPPORTED RECORD ARRAY FOUND", "error");
      log("IMPORT FAILED / INVALID JSON STRUCTURE");
      return;
    }

    if (plan.supported.length > 1) {
      setDataIOMessage("IMPORT BLOCKED / LEGACY MULTI-DOMAIN SNAPSHOT IS NOT ATOMIC / USE SNAPSHOT V6", "error");
      log("IMPORT BLOCKED / LEGACY MULTI-DOMAIN SNAPSHOT");
      return;
    }

    const invalid = plan.supported.filter((item) => item.errors.length);
    if (invalid.length) {
      const report = invalid.map((item) => `${item.label}: ${item.errors.join(", ")}`).join(" / ");
      setDataIOMessage(`IMPORT BLOCKED / VALIDATION FAILED / ${report}`, "error");
      log("IMPORT BLOCKED / VALIDATION FAILED");
      return;
    }

    const confirmed = await (window.WS_APP.confirmAction?.({
      title: "IMPORT LEGACY RECORD ARRAY",
      message: [
        `Schema: ${plan.schemaLabel}`,
        `Records: ${plan.supported.map((item) => `${item.records.length} ${item.label}`).join(" / ")}`,
        "A complete Snapshot v6 backup will be created before this single-domain import. Continue?"
      ].join("\n"),
      confirmLabel: "Import",
      cancelLabel: "Cancel",
      tone: "danger"
    }) ?? Promise.resolve(true));

    if (!confirmed) {
      setDataIOMessage("IMPORT CANCELLED / NO DATA CHANGED", "");
      return;
    }

    const backup = createImportBackup();
    if (!backup) {
      setDataIOMessage("IMPORT BLOCKED / BACKUP COULD NOT BE CREATED", "error");
      log("IMPORT BLOCKED / BACKUP FAILED");
      return;
    }

    try {
      const item = plan.supported[0];
      const result = item.importer?.(item.records);
      if (!result) throw new Error(`LEGACY_DOMAIN_IMPORT_FAILED:${item.label}`);
      if (plan.campaignDateIso) window.WS_APP.setCampaignDateIso?.(plan.campaignDateIso);
      updateDataIOMeta();
      setDataIOMessage(`IMPORT COMPLETE / ${item.records.length} ${item.label} / BACKUP CREATED`, "ok");
      log(`DATA IMPORTED / ${item.records.length} ${item.label}`);
    } catch (error) {
      console.warn("W&S legacy import failed.", error);
      setDataIOMessage("IMPORT FAILED / SNAPSHOT_COMMIT_FAILED", "error");
      log("IMPORT FAILED / SNAPSHOT_COMMIT_FAILED");
    }
  }

  function buildImportPlan(parsed) {
    const campaignDateIso = extractCampaignDate(parsed);
    const plan = {
      schemaLabel: String(parsed?.schema || parsed?.recordType || "legacy-json").trim(),
      campaignDateIso,
      supported: []
    };

    const items = [
      { label: "CITIZENS", records: extractCitizens(parsed), importer: window.WS_APP.importCitizens, required: ["id"] },
      { label: "ITEM INSTANCES", records: extractItemInstances(parsed), importer: window.WS_APP.importItemInstances, required: ["instanceId", "definitionId"] },
      { label: "ENTRIES", records: extractEntries(parsed), importer: window.WS_APP.importEntries, required: ["id"] },
      { label: "ADDRESSES", records: extractAddresses(parsed), importer: window.WS_APP.importAddresses, required: [] },
      { label: "TAGS", records: extractTags(parsed), importer: window.WS_APP.importTags, required: ["id"] },
      { label: "SYSTEM RECORDS", records: extractSystemRecords(parsed), importer: window.WS_APP.importSystemRecords, required: ["id"] },
      { label: "CASE FILES", records: extractCaseFiles(parsed), importer: window.WS_APP.importCaseFiles, required: ["id"] },
      { label: "ACCESS TAGS", records: extractAccessTags(parsed), importer: window.WS_APP.importAccessTags, required: ["id"] },
      { label: "USERS", records: extractUsers(parsed), importer: window.WS_APP.importUsers, required: ["id"] },
      { label: "TERMINAL ENTRIES", records: extractTerminalEntries(parsed), importer: window.WS_APP.importTerminalEntries, required: ["id", "citizenId"] },
      { label: "SYSTEM REQUESTS", records: extractServiceRequests(parsed), importer: window.WS_APP.importServiceRequests, required: ["id", "citizenId"] },
      { label: "BILLING INTENTS", records: extractBillingIntents(parsed), importer: window.WS_APP.importBillingIntents, required: ["billingIntentId", "citizenId", "idempotencyKey"] },
      { label: "BILLING TRANSACTIONS", records: extractBillingTransactions(parsed), importer: window.WS_APP.importBillingTransactions, required: ["billingTransactionId", "citizenId", "idempotencyKey"] },
      { label: "WORLD BRIDGE OPERATIONS", records: extractWorldBridgeOperations(parsed), importer: (records) => window.WS_APP.importWorldBridgeOperations?.(records)?.ok === true, required: ["operationId", "citizenId", "idempotencyKey"] },
      { label: "BILLING HISTORY", records: extractBillingHistory(parsed), importer: window.WS_APP.importBillingHistory, required: ["id", "citizenId"] },
      { label: "CALENDAR REMINDERS", records: extractCalendarReminders(parsed), importer: window.WS_APP.importCalendarReminders, required: ["id", "citizenId"] }
    ];

    items.forEach((item) => {
      if (!Array.isArray(item.records)) return;
      plan.supported.push({
        ...item,
        errors: validateRecordArray(item.label, item.records, item.required)
      });
    });

    return plan;
  }

  function validateRecordArray(label, records, required = []) {
    const errors = [];
    if (!Array.isArray(records)) return [`${label} is not an array`];
    const invalidType = records.findIndex((record) => !record || typeof record !== "object" || Array.isArray(record));
    if (invalidType >= 0) errors.push(`record ${invalidType + 1} is not an object`);

    required.forEach((field) => {
      const missing = records.findIndex((record) => record && typeof record === "object" && !String(record[field] || "").trim());
      if (missing >= 0) errors.push(`record ${missing + 1} missing ${field}`);
    });

    return errors;
  }

  function buildImportReport(imported, skipped, plan) {
    const lines = [];
    if (imported.length) lines.push(`IMPORT COMPLETE / ${imported.join(" / ")}`);
    if (skipped.length) lines.push(`SKIPPED / ${skipped.join(" / ")}`);
    lines.push(`BACKUP CREATED / ${plan.schemaLabel}`);
    return lines.join("\n");
  }

  function createImportBackup() {
    const result = window.WS_APP.createCampaignImportBackupV6?.("PRE_LEGACY_IMPORT_BACKUP");
    if (result?.ok) {
      log("PRE-IMPORT BACKUP CREATED");
      return result.backup;
    }
    log("PRE-IMPORT BACKUP FAILED / STORAGE LIMIT");
    return null;
  }

  function readLastImportBackup() {
    const current = window.WS_APP.getLastCampaignImportBackupV6?.();
    if (current) return current;
    try {
      const raw = window.localStorage.getItem(LAST_IMPORT_BACKUP_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn("W&S backup read failed.", error);
      return null;
    }
  }

  function extractCampaignDate(parsed) {
    const value = parsed?.campaign?.campaignDateIso || parsed?.data?.campaign?.campaignDateIso || parsed?.campaignDateIso || parsed?.data?.campaignDateIso;
    const text = String(value || "").trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
  }

  function extractCitizens(parsed) {
    if (Array.isArray(parsed)) return looksLikeAddressArray(parsed) ? null : parsed;
    if (Array.isArray(parsed?.citizens)) return parsed.citizens;
    if (Array.isArray(parsed?.data?.citizens)) return parsed.data.citizens;
    return null;
  }

  function extractItemInstances(parsed) {
    if (Array.isArray(parsed?.itemInstances)) return parsed.itemInstances;
    if (Array.isArray(parsed?.data?.itemInstances)) return parsed.data.itemInstances;
    if (parsed?.recordType === "itemInstances" && Array.isArray(parsed.records)) return parsed.records;
    return null;
  }

  function extractEntries(parsed) {
    if (Array.isArray(parsed?.entries)) return parsed.entries;
    if (Array.isArray(parsed?.data?.entries)) return parsed.data.entries;
    if (parsed?.recordType === "entries" && Array.isArray(parsed.records)) return parsed.records;
    return null;
  }

  function extractAddresses(parsed) {
    if (Array.isArray(parsed) && looksLikeAddressArray(parsed)) return parsed;
    if (Array.isArray(parsed?.addresses)) return parsed.addresses;
    if (Array.isArray(parsed?.data?.addresses)) return parsed.data.addresses;
    if (parsed?.recordType === "addresses" && Array.isArray(parsed.records)) return parsed.records;
    return null;
  }

  function extractTags(parsed) {
    if (Array.isArray(parsed?.tags)) return parsed.tags;
    if (Array.isArray(parsed?.data?.tags)) return parsed.data.tags;
    if (parsed?.recordType === "tags" && Array.isArray(parsed.records)) return parsed.records;
    return null;
  }

  function extractSystemRecords(parsed) {
    if (Array.isArray(parsed?.systemRecords)) return parsed.systemRecords;
    if (Array.isArray(parsed?.data?.systemRecords)) return parsed.data.systemRecords;
    if (parsed?.recordType === "systemRecords" && Array.isArray(parsed.records)) return parsed.records;
    return null;
  }

  function extractCaseFiles(parsed) {
    if (Array.isArray(parsed?.caseFiles)) return parsed.caseFiles;
    if (Array.isArray(parsed?.data?.caseFiles)) return parsed.data.caseFiles;
    if (parsed?.recordType === "caseFiles" && Array.isArray(parsed.records)) return parsed.records;
    return null;
  }

  function extractAccessTags(parsed) {
    if (Array.isArray(parsed?.accessTags)) return parsed.accessTags;
    if (Array.isArray(parsed?.data?.accessTags)) return parsed.data.accessTags;
    if (parsed?.recordType === "accessTags" && Array.isArray(parsed.records)) return parsed.records;
    return null;
  }

  function extractUsers(parsed) {
    if (Array.isArray(parsed?.users)) return parsed.users;
    if (Array.isArray(parsed?.data?.users)) return parsed.data.users;
    if (parsed?.recordType === "users" && Array.isArray(parsed.records)) return parsed.records;
    return null;
  }

  function extractTerminalEntries(parsed) {
    if (Array.isArray(parsed?.terminalEntries)) return parsed.terminalEntries;
    if (Array.isArray(parsed?.data?.terminalEntries)) return parsed.data.terminalEntries;
    if (parsed?.recordType === "terminalEntries" && Array.isArray(parsed.records)) return parsed.records;
    return null;
  }

  function extractServiceRequests(parsed) {
    if (Array.isArray(parsed?.serviceRequests)) return parsed.serviceRequests;
    if (Array.isArray(parsed?.data?.serviceRequests)) return parsed.data.serviceRequests;
    if (parsed?.recordType === "serviceRequests" && Array.isArray(parsed.records)) return parsed.records;
    return null;
  }

  function extractBillingIntents(parsed) {
    if (Array.isArray(parsed?.billingIntents)) return parsed.billingIntents;
    if (Array.isArray(parsed?.data?.billingIntents)) return parsed.data.billingIntents;
    if (parsed?.recordType === "billingIntents" && Array.isArray(parsed.records)) return parsed.records;
    return null;
  }

  function extractBillingTransactions(parsed) {
    if (Array.isArray(parsed?.billingTransactions)) return parsed.billingTransactions;
    if (Array.isArray(parsed?.data?.billingTransactions)) return parsed.data.billingTransactions;
    if (parsed?.recordType === "billingTransactions" && Array.isArray(parsed.records)) return parsed.records;
    return null;
  }

  function extractWorldBridgeOperations(parsed) {
    if (Array.isArray(parsed?.worldBridgeOperations)) return parsed.worldBridgeOperations;
    if (Array.isArray(parsed?.data?.worldBridgeOperations)) return parsed.data.worldBridgeOperations;
    if (parsed?.recordType === "worldBridgeOperations" && Array.isArray(parsed.records)) return parsed.records;
    return null;
  }

  function extractBillingHistory(parsed) {
    if (Array.isArray(parsed?.billingHistory)) return parsed.billingHistory;
    if (Array.isArray(parsed?.data?.billingHistory)) return parsed.data.billingHistory;
    if (parsed?.recordType === "billingHistory" && Array.isArray(parsed.records)) return parsed.records;
    return null;
  }

  function extractCalendarReminders(parsed) {
    if (Array.isArray(parsed?.calendarReminders)) return parsed.calendarReminders;
    if (Array.isArray(parsed?.data?.calendarReminders)) return parsed.data.calendarReminders;
    if (parsed?.recordType === "calendarReminders" && Array.isArray(parsed.records)) return parsed.records;
    return null;
  }

  function looksLikeAddressArray(value) {
    return Array.isArray(value) && value.some((record) => {
      if (!record || typeof record !== "object") return false;
      return Object.prototype.hasOwnProperty.call(record, "visibleAddress")
        || Object.prototype.hasOwnProperty.call(record, "citizenId")
        || Object.prototype.hasOwnProperty.call(record, "geoAddress");
    });
  }

  async function resetCampaignState() {
    const confirmed = await confirmDataIO(
      "RESET CAMPAIGN STATE V6",
      "Create a complete Snapshot v6 backup, clear every CAMPAIGN_PERSISTENT domain and reload canonical seeds?"
    );

    if (!confirmed) return;

    const operatorNote = String(window.prompt?.("Operator note required for Campaign reset:", "") || "").trim();
    if (!operatorNote) {
      setDataIOMessage("RESET BLOCKED / OPERATOR NOTE REQUIRED", "error");
      appendDataIoAudit({
        action: "CAMPAIGN_RESET_BLOCKED",
        target: "CAMPAIGN_STATE_V6",
        summary: "Campaign reset blocked because operator note was missing.",
        resultCode: "REASON_REQUIRED",
        status: "FAILED"
      });
      return;
    }

    const typed = String(window.prompt?.("Type RESET CAMPAIGN to confirm destructive campaign reset:", "") || "").trim().toUpperCase();
    if (typed !== "RESET CAMPAIGN") {
      setDataIOMessage("RESET BLOCKED / TYPED CONFIRMATION MISMATCH", "error");
      appendDataIoAudit({
        action: "CAMPAIGN_RESET_BLOCKED",
        target: "CAMPAIGN_STATE_V6",
        summary: "Campaign reset blocked because typed confirmation did not match.",
        resultCode: "TYPED_CONFIRMATION_REQUIRED",
        status: "FAILED",
        meta: { operatorNote }
      });
      return;
    }

    const resetCorrelationId = window.crypto?.randomUUID?.() || `campaign-reset-${Date.now()}`;
    const result = window.WS_APP.resetCampaignStateV6?.();
    if (!result?.ok) {
      const code = result?.error?.code || "SNAPSHOT_COMMIT_FAILED";
      setDataIOMessage(`RESET FAILED / ${code}`, "error");
      log(`CAMPAIGN RESET FAILED / ${code}`);
      appendDataIoAudit({
        action: result?.error?.rolledBack === true ? "CAMPAIGN_RESET_FAILED_ROLLED_BACK" : "CAMPAIGN_RESET_RECOVERY_REQUIRED",
        target: "CAMPAIGN_STATE_V6",
        summary: `Campaign reset failed: ${code}.`,
        resultCode: code,
        status: result?.error?.rolledBack === true ? "FAILED" : "RECOVERY_REQUIRED",
        correlationId: resetCorrelationId,
        meta: { operatorNote, rolledBack: result?.error?.rolledBack === true }
      });
      if (result?.error?.reloadRequired) reloadAfterCampaignDataMutation();
      return;
    }

    appendDataIoAudit({
      action: "CAMPAIGN_RESET_COMPLETED",
      target: "CAMPAIGN_STATE_V6",
      summary: `Campaign state reset across ${result.resetDomains.length} domains.`,
      resultCode: "CAMPAIGN_RESET_COMPLETED",
      status: "SUCCEEDED",
      correlationId: resetCorrelationId,
      meta: { operatorNote, resetDomains: result.resetDomains }
    });
    setDataIOMessage(`RESET COMPLETE / ${result.resetDomains.length} DOMAINS / RELOADING`, "ok");
    log(`CAMPAIGN STATE V6 RESET / ${result.resetDomains.length} DOMAINS`);
    reloadAfterCampaignDataMutation();
  }

  async function resetCitizens() {
    const confirmed = await confirmDataIO(
      "RESET CITIZEN RUNTIME",
      "Destructively reset Citizens and linked Billing, Subscriptions, Service, Housing, Market, ItemInstance, World Bridge and Terminal runtime data? The application will reload."
    );

    if (!confirmed) return;

    const result = window.WS_APP.resetCitizenRuntimeData?.({ reload: false });
    if (!result?.ok) {
      const code = result?.error?.code || "UNKNOWN";
      appendDataIoAudit({ action: "CITIZEN_RUNTIME_RESET_FAILED", target: "CITIZEN_RUNTIME", summary: `Citizen runtime reset failed: ${code}.`, resultCode: code, status: "FAILED" });
      setDataIOMessage(`RESET FAILED / ${code}`, "error");
      return;
    }
    appendDataIoAudit({ action: "CITIZEN_RUNTIME_RESET_COMPLETED", target: "CITIZEN_RUNTIME", summary: "Citizen-linked runtime reset completed.", resultCode: "CITIZEN_RUNTIME_RESET_COMPLETED", status: "SUCCEEDED" });
    setDataIOMessage("RESET COMPLETE / RELOADING PRE-ALPHA SEED", "ok");
    log("CITIZEN-LINKED RUNTIME RESET");
    window.setTimeout(() => window.location?.reload?.(), 120);
  }

  async function resetEntries() {
    const confirmed = await confirmDataIO("RESET ENTRIES", "Reset local encyclopedia entries and restore data/entries.js seed?");

    if (!confirmed) return;

    const entries = window.WS_APP.resetEntryStore?.() || [];
    appendDataIoAudit({ action: "ENTRY_STORE_RESET", target: "KNOWLEDGE_ENTRIES", summary: `Entry store reset to ${entries.length} active records.`, resultCode: "ENTRY_STORE_RESET", status: "SUCCEEDED", meta: { recordCount: entries.length } });
    updateDataIOMeta();
    setDataIOMessage(`RESET COMPLETE / ${entries.length} ENTRY RECORDS ACTIVE`, "ok");
    log("LOCAL ENTRY STORE RESET");
  }

  async function resetAddresses() {
    const confirmed = await confirmDataIO("RESET ADDRESSES", "Reset local Address Core records and restore data/addresses.js seed?");

    if (!confirmed) return;

    const addresses = window.WS_APP.resetAddressStore?.() || [];
    appendDataIoAudit({ action: "ADDRESS_STORE_RESET", target: "ADDRESSES", summary: `Address store reset to ${addresses.length} active records.`, resultCode: "ADDRESS_STORE_RESET", status: "SUCCEEDED", meta: { recordCount: addresses.length } });
    updateDataIOMeta();
    setDataIOMessage(`RESET COMPLETE / ${addresses.length} ADDRESS RECORDS ACTIVE`, "ok");
    log("LOCAL ADDRESS STORE RESET");
  }

  async function resetTags() {
    const confirmed = await confirmDataIO("RESET TAGS", "Reset local Tag Registry records and restore data/tags.js seed?");

    if (!confirmed) return;

    const tags = window.WS_APP.resetTagStore?.() || [];
    appendDataIoAudit({ action: "TAG_STORE_RESET", target: "CONTENT_TAGS", summary: `Tag store reset to ${tags.length} active records.`, resultCode: "TAG_STORE_RESET", status: "SUCCEEDED", meta: { recordCount: tags.length } });
    updateDataIOMeta();
    setDataIOMessage(`RESET COMPLETE / ${tags.length} TAG RECORDS ACTIVE`, "ok");
    log("LOCAL TAG STORE RESET");
  }

  async function resetSystemRecords() {
    const confirmed = await confirmDataIO("RESET SYSTEM RECORDS", "Reset local System records and restore data/system-records.js seed?");

    if (!confirmed) return;

    const records = window.WS_APP.resetSystemStore?.() || [];
    appendDataIoAudit({ action: "SYSTEM_RECORD_STORE_RESET", target: "SYSTEM_RECORDS", summary: `System record store reset to ${records.length} active records.`, resultCode: "SYSTEM_RECORD_STORE_RESET", status: "SUCCEEDED", meta: { recordCount: records.length } });
    updateDataIOMeta();
    setDataIOMessage(`RESET COMPLETE / ${records.length} SYSTEM RECORDS ACTIVE`, "ok");
    log("LOCAL SYSTEM STORE RESET");
  }

  async function resetCaseFiles() {
    const confirmed = await confirmDataIO("RESET CASE FILES", "Reset local Case Files records and restore data/case-files.js seed?");

    if (!confirmed) return;

    const records = window.WS_APP.resetCaseFileStore?.() || [];
    appendDataIoAudit({ action: "CASE_FILE_STORE_RESET", target: "CASE_FILES", summary: `Case File store reset to ${records.length} active records.`, resultCode: "CASE_FILE_STORE_RESET", status: "SUCCEEDED", meta: { recordCount: records.length } });
    updateDataIOMeta();
    setDataIOMessage(`RESET COMPLETE / ${records.length} CASE FILES ACTIVE`, "ok");
    log("LOCAL CASE FILE STORE RESET");
  }

  function reloadAfterCampaignDataMutation() {
    if (typeof window.location?.reload === "function") window.location.reload();
  }

  function confirmDataIO(title, message) {
    return window.WS_APP.confirmAction?.({
      title,
      message,
      confirmLabel: "Reset",
      cancelLabel: "Cancel",
      tone: "danger"
    }) ?? Promise.resolve(false);
  }

  function formatWorkspaceTimestamp(value) {
    if (!value) return "NEVER";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString();
  }

  function updateKnowledgePackWorkspace() {
    const summary = document.querySelector("#knowledge-pack-workspace-summary");
    const stateNode = document.querySelector("#knowledge-pack-workspace-state");
    if (!summary || !stateNode) return;

    const workspace = window.WS_APP.getKnowledgePackWorkspace?.() || {};
    const meta = window.WS_APP.getKnowledgePackMeta?.() || {};
    const connected = workspace.connected === true;
    const dirty = meta.dirty === true;
    const state = dirty ? "MODIFIED" : "SYNCED";
    const location = connected ? "CONNECTED" : "LOCAL";
    const permission = connected ? String(workspace.permission || "unknown").toUpperCase() : "N/A";

    stateNode.textContent = `${location} / ${state}`;
    stateNode.classList.toggle("is-dirty", dirty);
    stateNode.classList.toggle("is-connected", connected);

    summary.innerHTML = `
      <div><span>ACTIVE PACK</span><strong>${escapeHtml(meta.packId || "future-noir-main")}</strong></div>
      <div><span>PACK VERSION</span><strong>${escapeHtml(meta.packVersion || "1.0.0-local")}</strong></div>
      <div><span>FILE</span><strong>${escapeHtml(connected ? workspace.fileName : "NOT CONNECTED")}</strong></div>
      <div><span>WRITE ACCESS</span><strong>${escapeHtml(permission)}</strong></div>
      <div><span>LAST SAVE</span><strong>${escapeHtml(formatWorkspaceTimestamp(meta.lastSavedAt || meta.lastExportedAt))}</strong></div>
      <div><span>LOCAL STATE</span><strong>${dirty ? "UNSAVED CHANGES" : "SYNCED SNAPSHOT"}</strong></div>
    `;

    const saveButton = document.querySelector("#knowledge-pack-save-button");
    const disconnectButton = document.querySelector("#knowledge-pack-disconnect-button");
    const backupButton = document.querySelector("#download-knowledge-backup-button");
    if (saveButton) saveButton.disabled = !connected;
    if (disconnectButton) disconnectButton.disabled = !connected;
    if (backupButton) backupButton.disabled = !window.WS_APP.getKnowledgePackBackup?.();

    renderPendingKnowledgePackPreview();
  }

  function updateDataIOMeta() {
    const meta = document.querySelector("#data-io-meta");

    if (!meta) return;

    const citizens = window.WS_APP.getCitizens?.({ includeArchived: true }) || [];
    const publicCitizens = citizens.filter((citizen) => citizen.id !== "admin" && citizen.recordType !== "admin");
    const itemInstances = window.WS_APP.exportItemInstances?.() || [];
    const entries = window.WS_APP.getEntries?.({ includeArchived: true }) || [];
    const systemRecords = window.WS_APP.getSystemRecords?.({ includeArchived: true }) || [];
    const runtime = window.WS_APP.exportTerminalRuntimeData?.() || {};
    const worldBridgeOperations = window.WS_APP.exportWorldBridgeOperations?.() || [];
    const snapshot = window.WS_APP.exportCampaignSnapshotV6?.({ flush: false }) || null;
    const readiness = window.WS_APP.getCampaignDataIoReadiness?.() || { ready: false, campaignPersistentDomainCount: 0 };
    const knowledgeMeta = window.WS_APP.getKnowledgePackMeta?.() || {};
    const hasBackup = Boolean(readLastImportBackup());
    const hasKnowledgeBackup = Boolean(window.WS_APP.getKnowledgePackBackup?.());
    const size = snapshot ? new Blob([JSON.stringify(snapshot)]).size : 0;

    meta.innerHTML = `
      <div><span>SCHEMA</span><strong>V${escapeHtml(CAMPAIGN_SCHEMA_VERSION)}</strong></div>
      <div><span>CONTENT SCHEMA</span><strong>V${escapeHtml(window.WS_APP.KNOWLEDGE_PACK_SCHEMA_VERSION || "-")}</strong></div>
      <div><span>READINESS</span><strong>${readiness.ready ? "READY" : "BLOCKED"}</strong></div>
      <div><span>DOMAINS</span><strong>${escapeHtml(readiness.campaignPersistentDomainCount || 0)}</strong></div>
      <div><span>KNOWLEDGE PACK</span><strong>${escapeHtml(knowledgeMeta.packId || "LOCAL")}</strong></div>
      <div><span>PACK VERSION</span><strong>${escapeHtml(knowledgeMeta.packVersion || "LOCAL")}</strong></div>
      <div><span>PACK STATE</span><strong>${knowledgeMeta.dirty ? "MODIFIED" : "SYNCED"}</strong></div>
      <div><span>CITIZENS</span><strong>${escapeHtml(publicCitizens.length)}</strong></div>
      <div><span>ITEMS</span><strong>${escapeHtml(itemInstances.length)}</strong></div>
      <div><span>ENTRIES</span><strong>${escapeHtml(entries.length)}</strong></div>
      <div><span>SYSTEM</span><strong>${escapeHtml(systemRecords.length)}</strong></div>
      <div><span>TERMINAL</span><strong>${escapeHtml((runtime.terminalEntries || []).length)}</strong></div>
      <div><span>PAYMENT INTENTS</span><strong>${escapeHtml((runtime.billingIntents || []).length)}</strong></div>
      <div><span>TRANSACTIONS</span><strong>${escapeHtml((runtime.billingTransactions || []).length)}</strong></div>
      <div><span>WORLD OPS</span><strong>${escapeHtml(worldBridgeOperations.length)}</strong></div>
      <div><span>ACTIVE OPS</span><strong>${escapeHtml(snapshot?.activeOperations?.count || 0)}</strong></div>
      <div><span>BACKUP</span><strong>${hasBackup ? "READY" : "EMPTY"}</strong></div>
      <div><span>KNOWLEDGE BACKUP</span><strong>${hasKnowledgeBackup ? "READY" : "EMPTY"}</strong></div>
      <div><span>SNAPSHOT SIZE</span><strong>${escapeHtml(formatBytes(size))}</strong></div>
      <div><span>MODE</span><strong>ATOMIC V6</strong></div>
    `;

    updateKnowledgePackWorkspace();
  }

  function downloadJson(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function setDataIOMessage(message, tone = "") {
    const node = document.querySelector("#data-io-message");

    if (!node) return;

    node.textContent = message;
    node.className = `data-io-message ${tone ? `is-${tone}` : ""}`.trim();
  }

  function log(message) {
    window.WS_APP.appendTerminalLogLine?.(message, {
      typed: true,
      speed: 8
    });
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }

  function escapeHtml(value) {
    if (typeof window.WS_APP?.escapeHtml === "function") return window.WS_APP.escapeHtml(value);
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", window.WS_APP.initDataIO);
  } else {
    window.WS_APP.initDataIO();
  }
})();
