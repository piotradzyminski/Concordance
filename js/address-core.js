window.WS_APP = window.WS_APP || {};

(function initAddressCoreModule() {
  const ADDRESS_TYPES = ["LOCATION", "TRACE", "CITIZEN_ID", "NETWORK", "SESSION"];
  const CLEARANCE_LEVELS = ["PUBLIC", "CIVIL", "RESTRICTED", "BLACK", "GM"];
  const NETWORKS = [
    { id: "001", label: "System / State" },
    { id: "002", label: "Watch & Secure" },
    { id: "003", label: "Ministerial" },
    { id: "004", label: "Memory / Archive" },
    { id: "020", label: "TRAUMA" },
    { id: "101", label: "Civil System" },
    { id: "120", label: "Civil TRAUMA" },
    { id: "201", label: "Subordinate System" },
    { id: "220", label: "Subordinate TRAUMA" }
  ];

  window.WS_APP.renderAddressCoreModule = function renderAddressCoreModule(user) {
    if (user?.role !== "admin") {
      window.WS_APP.openModule?.("system", user);
      return;
    }

    renderAddressList(user);
  };

  window.WS_APP.openAddressRecord = function openAddressRecord(user, addressId) {
    const currentUser = user || window.WS_APP.currentUser;
    if (currentUser?.role !== "admin") return;
    renderAddressRecord(currentUser, addressId);
  };

  function renderAddressList(user) {
    const container = document.querySelector("#module-grid");
    const status = document.querySelector("#module-status");
    const terminalGrid = document.querySelector(".terminal-grid");
    const addresses = getVisibleAddresses(user);

    if (!container) return;

    terminalGrid?.classList.add("is-card-open");
    window.WS_APP.currentModuleId = "address-core";

    if (status) {
      status.textContent = `ADDRESS CORE / ${addresses.length} RECORDS`;
    }

    container.innerHTML = `
      <article class="module-detail address-core-view editable-registry" data-registry="addresses">
        <div class="module-detail-head">
          <div>
            <p class="kicker">ADDRESS CORE / LOCAL GENERATOR</p>
            <h4>Address Core</h4>
          </div>

          <button class="module-back-button" type="button">Back</button>
        </div>

        <section class="registry-toolbar address-toolbar">
          <input
            class="registry-search"
            id="address-registry-filter"
            type="search"
            placeholder="Filter address / trace / short ID / tag"
            autocomplete="off"
          />

          <button class="registry-action" type="button" id="address-generate-default-button">
            Generate Default Record
          </button>

          <button class="registry-action" type="button" id="address-create-button">
            Create Blank
          </button>
        </section>

        <section class="address-generator-strip">
          ${renderAddressGeneratorPreview()}
        </section>

        <section class="address-record-list" id="address-record-list">
          ${renderAddressRows(addresses)}
        </section>
      </article>
    `;

    bindBackButton(user);
    bindAddressRegistry(user);
  }

  function renderAddressGeneratorPreview() {
    const sample = generateDefaultAddressPayload();

    return `
      <div class="address-preview-card">
        <span>VISIBLE</span>
        <b>${escapeHtml(sample.visibleAddress)}</b>
      </div>
      <div class="address-preview-card">
        <span>TRACE</span>
        <b>${escapeHtml(sample.trace)}</b>
      </div>
      <div class="address-preview-card">
        <span>CITIZEN ID</span>
        <b>${escapeHtml(sample.citizenId)}</b>
      </div>
      <div class="address-preview-card">
        <span>SHORT ID</span>
        <b>${escapeHtml(sample.shortId)}</b>
      </div>
    `;
  }

  function getVisibleAddresses(user) {
    const addresses = window.WS_APP.getAddresses?.({ includeArchived: user?.role === "admin" }) || [];
    return addresses
      .filter((record) => user?.role === "admin" || !record.archived)
      .sort((a, b) => String(a.label || "").localeCompare(String(b.label || ""), "pl"));
  }

  function renderAddressRows(addresses) {
    if (!addresses.length) {
      return `
        <div class="address-empty-state">
          <b>NO ADDRESS RECORDS FOUND</b>
          <span>GENERATE FIRST RECORD</span>
        </div>
      `;
    }

    return addresses.map((record) => renderAddressRow(record)).join("");
  }

  function renderAddressRow(record) {
    const tags = Array.isArray(record.tags) ? record.tags : [];
    const archived = record.archived === true;
    const label = record.label || record.visibleAddress || record.citizenId || record.id;

    return `
      <button class="address-record-row ${archived ? "is-archived" : ""}" type="button" data-address-id="${escapeHtml(record.id)}">
        <span>
          <b>${escapeHtml(label)}</b>
          <small>${escapeHtml(record.type || "LOCATION")} / ${escapeHtml(record.visibleAddress || "NO VISIBLE ADDRESS")}</small>
          <small>${escapeHtml(record.trace || "NO TRACE")}</small>
          ${tags.length ? `
            <span class="address-tag-row">
              ${tags.map((tag) => `<i class="ui-badge ui-badge--content">${escapeHtml(tag)}</i>`).join("")}
            </span>
          ` : ""}
        </span>

        <strong class="module-status ${escapeHtml(String(record.clearance || "RESTRICTED").toLowerCase())}">
          ${archived ? "ARCHIVED" : escapeHtml(record.clearance || "RESTRICTED")}
        </strong>
      </button>
    `;
  }

  function bindAddressRegistry(user) {
    const list = document.querySelector("#address-record-list");
    const input = document.querySelector("#address-registry-filter");
    const create = document.querySelector("#address-create-button");
    const generateDefault = document.querySelector("#address-generate-default-button");

    create?.addEventListener("click", () => {
      window.WS_APP.pushModuleView?.(() => renderAddressList(user));
      renderAddressForm(user);
    });

    generateDefault?.addEventListener("click", () => {
      const saved = window.WS_APP.createAddress?.(generateDefaultAddressPayload());
      if (saved) {
        window.WS_APP.appendTerminalLogLine?.(`ADDRESS RECORD GENERATED / ${saved.label}`, { typed: true, speed: 8 });
        window.WS_APP.pushModuleView?.(() => renderAddressList(user));
        renderAddressRecord(user, saved.id);
      }
    });

    input?.addEventListener("input", () => {
      const query = normalizeQuery(input.value);
      const records = getVisibleAddresses(user).filter((record) => {
        if (!query) return true;
        return normalizeQuery([
          record.label,
          record.type,
          record.clearance,
          record.visibleAddress,
          record.trace,
          record.citizenId,
          record.shortId,
          record.sessionToken,
          record.packetSignature,
          record.note,
          record.gmNote,
          ...(record.tags || [])
        ].join(" ")).includes(query);
      });

      if (list) list.innerHTML = renderAddressRows(records);
      bindAddressRowOpen(user);
    });

    bindAddressRowOpen(user);
  }

  function bindAddressRowOpen(user) {
    document.querySelectorAll(".address-record-row[data-address-id]").forEach((row) => {
      row.addEventListener("click", () => {
        window.WS_APP.pushModuleView?.(() => renderAddressList(user));
        renderAddressRecord(user, row.dataset.addressId);
      });
    });
  }

  function renderAddressRecord(user, addressId) {
    const container = document.querySelector("#module-grid");
    const status = document.querySelector("#module-status");
    const terminalGrid = document.querySelector(".terminal-grid");
    const record = window.WS_APP.getAddressById?.(addressId);

    if (!container || !record) return;

    terminalGrid?.classList.add("is-card-open");
    window.WS_APP.currentModuleId = "address-core";

    if (status) {
      status.textContent = `ADDRESS CORE / ${String(record.label || record.id).toUpperCase()}`;
    }

    container.innerHTML = `
      <article class="module-detail address-core-view address-record-view" data-address-record="${escapeHtml(record.id)}">
        <div class="module-detail-head">
          <div>
            <p class="kicker">ADDRESS CORE / RECORD</p>
            <h4>${escapeHtml(record.label || record.id)}</h4>
          </div>

          <button class="module-back-button" type="button">Back</button>
        </div>

        <section class="address-record-headline">
          <div class="address-record-title">
            <span>${escapeHtml(record.type || "LOCATION")}</span>
            <div class="address-tag-row">
              <i class="ui-badge ui-badge--access">${escapeHtml(record.clearance || "RESTRICTED")}</i>
              ${(record.tags || []).map((tag) => `<i class="ui-badge ui-badge--content">${escapeHtml(tag)}</i>`).join("")}
            </div>
          </div>

          <div class="address-record-actions">
            <button class="address-record-action" type="button" id="address-edit-button">Edit Record</button>
            <button class="address-record-action" type="button" id="address-duplicate-button">Duplicate</button>
            <button class="address-record-action" type="button" id="address-dependency-preview-button">Preview Dependencies</button>
            ${record.archived ? `
              <button class="address-record-action" type="button" id="address-restore-button">Restore</button>
              <button class="address-record-action danger" type="button" id="address-delete-button">Hard Delete</button>
            ` : `
              <button class="address-record-action danger" type="button" id="address-archive-button">Archive</button>
            `}
          </div>
        </section>

        <section class="address-code-blocks">
          ${renderAddressCodeBlock("VISIBLE ADDRESS", record.visibleAddress)}
          ${renderAddressCodeBlock("TRACE", record.trace)}
          ${renderAddressCodeBlock("CITIZEN ID", record.citizenId)}
          ${renderAddressCodeBlock("SHORT ID", record.shortId)}
        </section>

        <section class="address-record-grid">
          <div class="profile-data">
            ${renderDataRow("CITY CODE", record.cityCode)}
            ${renderDataRow("GEOADDRESS", record.geoAddress)}
            ${renderDataRow("NETWORK ID", record.networkId)}
            ${renderDataRow("CONTROL CODE", record.controlCode)}
            ${renderDataRow("CHUNK", record.chunk)}
            ${renderDataRow("BUILDING", record.building)}
            ${renderDataRow("CELL", record.cell)}
          </div>

          <div class="profile-data">
            ${renderDataRow("LAT TRACE", record.latTrace)}
            ${renderDataRow("LON TRACE", record.lonTrace)}
            ${renderDataRow("DATE", record.dateCode)}
            ${renderDataRow("TIME", record.timeCode)}
            ${renderDataRow("SESSION", record.sessionToken)}
            ${renderDataRow("SIGN", record.packetSignature)}
            ${renderDataRow("BIRTH CHUNK", record.birthChunk)}
          </div>
        </section>

        ${record.note ? renderAddressNote("NOTE", record.note) : ""}
        ${record.gmNote ? renderAddressNote("GM NOTE", record.gmNote) : ""}
      </article>
    `;

    window.WS_APP.bindModuleBackButton?.(user, () => renderAddressList(user));
    document.querySelector("#address-edit-button")?.addEventListener("click", () => {
      window.WS_APP.pushModuleView?.(() => renderAddressRecord(user, record.id));
      renderAddressForm(user, record.id);
    });
    document.querySelector("#address-duplicate-button")?.addEventListener("click", () => duplicateAddressRecord(user, record));
    document.querySelector("#address-dependency-preview-button")?.addEventListener("click", () => {
      const preview = window.WS_APP.previewAdminRecordLifecycle?.({ recordType: "ADDRESS", recordId: record.id, action: record.archived ? "HARD_DELETE" : "ARCHIVE", actor: user });
      window.alert?.(window.WS_APP.summarizeAdminRecordLifecyclePreview?.(preview) || preview?.message || "Preview unavailable.");
    });
    document.querySelector("#address-archive-button")?.addEventListener("click", async () => {
      const confirmed = await confirmAddressAction("ARCHIVE ADDRESS", "Archive this address record?", "Archive");
      if (!confirmed) return;
      const result = window.WS_APP.requestAdminRecordLifecycleAction?.({ recordType: "ADDRESS", recordId: record.id, action: "ARCHIVE", actor: user, expectedRevision: window.WS_APP.getAdminRecordLifecycleRevision?.(record) || 0, label: record.label || record.id });
      if (!result?.ok) return window.alert?.(`Archive failed: ${result?.resultCode || "UNKNOWN"}`);
      renderAddressList(user);
    });
    document.querySelector("#address-restore-button")?.addEventListener("click", () => {
      const result = window.WS_APP.requestAdminRecordLifecycleAction?.({ recordType: "ADDRESS", recordId: record.id, action: "RESTORE", actor: user, expectedRevision: window.WS_APP.getAdminRecordLifecycleRevision?.(record) || 0, label: record.label || record.id });
      if (!result?.ok) return window.alert?.(`Restore failed: ${result?.resultCode || "UNKNOWN"}`);
      renderAddressRecord(user, record.id);
    });
    document.querySelector("#address-delete-button")?.addEventListener("click", async () => {
      const confirmed = await confirmAddressAction("HARD DELETE ADDRESS", "Hard delete this archived address record? This cannot be undone.", "Hard Delete");
      if (!confirmed) return;
      const result = window.WS_APP.requestAdminRecordLifecycleAction?.({ recordType: "ADDRESS", recordId: record.id, action: "HARD_DELETE", actor: user, expectedRevision: window.WS_APP.getAdminRecordLifecycleRevision?.(record) || 0, label: record.label || record.id });
      if (!result?.ok) return window.alert?.(`Hard delete failed: ${result?.resultCode || "UNKNOWN"}`);
      renderAddressList(user);
    });
  }

  function renderAddressCodeBlock(label, value) {
    return `
      <div class="address-code-block">
        <span>${escapeHtml(label)}</span>
        <b>${escapeHtml(value || "N/A")}</b>
      </div>
    `;
  }

  function renderAddressNote(label, value) {
    return `
      <section class="address-note-block">
        <h5>${escapeHtml(label)}</h5>
        <p>${escapeHtml(value)}</p>
      </section>
    `;
  }

  function duplicateAddressRecord(user, record) {
    const duplicate = {
      ...record,
      id: undefined,
      label: `${record.label || "Address Record"} / COPY`,
      archived: false,
      createdAt: undefined,
      updatedAt: undefined
    };

    const saved = window.WS_APP.createAddress?.(duplicate);

    if (saved) {
      window.WS_APP.appendTerminalLogLine?.(`ADDRESS DUPLICATED / ${saved.label}`, { typed: true, speed: 8 });
      renderAddressRecord(user, saved.id);
    }
  }

  function renderAddressForm(user, addressId = null) {
    const container = document.querySelector("#module-grid");
    const status = document.querySelector("#module-status");
    const terminalGrid = document.querySelector(".terminal-grid");
    const record = addressId ? window.WS_APP.getAddressById?.(addressId) : null;
    const isEdit = Boolean(record);
    const draft = record || generateBlankAddressPayload();

    if (!container) return;

    terminalGrid?.classList.add("is-card-open");
    window.WS_APP.currentModuleId = "address-core";

    if (status) {
      status.textContent = isEdit ? "ADDRESS CORE / EDIT RECORD" : "ADDRESS CORE / CREATE RECORD";
    }

    container.innerHTML = `
      <article class="module-detail address-core-view address-form-view">
        <div class="module-detail-head">
          <div>
            <p class="kicker">ADDRESS CORE / ${isEdit ? "MUTATE" : "CREATE"}</p>
            <h4>${isEdit ? "Edit Address Record" : "Create Address Record"}</h4>
          </div>

          <button class="module-back-button" type="button">Back</button>
        </div>

        <form class="address-form" id="address-form" autocomplete="off">
          <div class="address-form-message" id="address-form-message"></div>

          <section class="address-form-generator">
            <button class="address-generator-button" type="button" id="generate-visible-button">Generate Visible</button>
            <button class="address-generator-button" type="button" id="generate-trace-button">Generate Trace</button>
            <button class="address-generator-button" type="button" id="generate-citizen-id-button">Generate Citizen ID</button>
            <button class="address-generator-button" type="button" id="set-trace-now-button">Set Trace Date/Time</button>
            <button class="address-generator-button" type="button" id="extract-short-id-button">Extract Short ID</button>
          </section>

          <div class="address-form-grid">
            ${renderInput("label", "Label", draft.label || "")}
            ${renderSelect("type", "Type", draft.type || "LOCATION", ADDRESS_TYPES)}
            ${renderSelect("clearance", "Clearance", draft.clearance || "RESTRICTED", CLEARANCE_LEVELS)}
            ${renderInput("tags", "Tags, comma separated", (draft.tags || []).join(", "))}

            ${renderInput("cityCode", "City Code", draft.cityCode || "03")}
            ${renderInput("geoAddress", "Geoaddress", draft.geoAddress || "51N00E")}
            ${renderNetworkSelect("networkId", "Network ID", draft.networkId || "002")}
            ${renderInput("controlCode", "Control Code", draft.controlCode || "109")}
            ${renderInput("chunk", "Chunk", draft.chunk || "A4")}
            ${renderInput("building", "Building", draft.building || "001")}
            ${renderInput("cell", "Cell", draft.cell || "001")}
            ${renderInput("birthChunk", "Birth Chunk", draft.birthChunk || "0A04")}
            ${renderInput("birthDate", "Birth Date", draft.birthDate || "20720121")}
            ${renderInput("randomBlock", "Random Block", draft.randomBlock || "")}
            ${renderInput("sessionToken", "Session Token", draft.sessionToken || "")}
            ${renderInput("packetSignature", "Packet Signature", draft.packetSignature || "")}

            ${renderInput("visibleAddress", "Visible Address", draft.visibleAddress || "", "is-wide")}
            ${renderInput("trace", "Trace", draft.trace || "", "is-wide")}
            ${renderInput("citizenId", "Citizen ID", draft.citizenId || "", "is-wide")}
            ${renderInput("shortId", "Short ID", draft.shortId || "", "is-wide")}

            ${renderInput("latTrace", "Lat Trace", draft.latTrace || "51N3410")}
            ${renderInput("lonTrace", "Lon Trace", draft.lonTrace || "00E2131")}
            ${renderDateInput("dateCode", "Trace Date", draft.dateCode || "21090101")}
            ${renderTimeInput("timeCode", "Trace Time", draft.timeCode || "2137")}

            ${renderTextarea("note", "Note", draft.note || "", "is-wide", 3)}
            ${renderTextarea("gmNote", "GM Note", draft.gmNote || "", "is-wide", 3)}
          </div>

          <footer class="address-form-actions">
            <button class="address-form-cancel" type="button" id="address-form-cancel">Cancel</button>
            <button class="address-form-save" type="submit">Save Address</button>
          </footer>
        </form>
      </article>
    `;

    window.WS_APP.bindModuleBackButton?.(user, () => {
      if (isEdit) renderAddressRecord(user, record.id);
      else renderAddressList(user);
    });
    document.querySelector("#address-form-cancel")?.addEventListener("click", () => {
      if (isEdit) renderAddressRecord(user, record.id);
      else renderAddressList(user);
    });

    bindAddressGeneratorButtons();

    document.querySelector("#address-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const payload = collectAddressForm(form);

      if (!payload.label) {
        setFormMessage("SAVE FAILED / LABEL REQUIRED");
        return;
      }

      if (!payload.visibleAddress) {
        payload.visibleAddress = composeVisibleAddress(payload);
      }

      if (!payload.trace) {
        payload.trace = composeTrace(payload);
      }

      if (!payload.citizenId) {
        payload.citizenId = composeCitizenId(payload);
      }

      payload.shortId = payload.shortId || extractShortId(payload.citizenId);

      const saved = isEdit
        ? window.WS_APP.updateAddress?.(record.id, payload)
        : window.WS_APP.createAddress?.(payload);

      if (saved) {
        window.WS_APP.appendTerminalLogLine?.(`ADDRESS SAVED / ${saved.label}`, { typed: true, speed: 8 });
        renderAddressRecord(user, saved.id);
      }
    });
  }

  function bindAddressGeneratorButtons() {
    document.querySelector("#generate-visible-button")?.addEventListener("click", () => {
      const form = document.querySelector("#address-form");
      if (!form) return;
      const data = collectAddressForm(form);
      setFormValue(form, "visibleAddress", composeVisibleAddress(data));
      setFormMessage("VISIBLE ADDRESS GENERATED", "ok");
    });

    document.querySelector("#generate-trace-button")?.addEventListener("click", () => {
      const form = document.querySelector("#address-form");
      if (!form) return;
      const data = collectAddressForm(form);
      const token = randomAlphaNum(6);
      const sign = randomAlphaNum(4);
      const lat = randomLatTrace();
      const lon = randomLonTrace();
      const dateCode = data.dateCode || randomTraceDate();
      const timeCode = data.timeCode && data.timeCode !== "2137" ? data.timeCode : randomTimeCode();
      setFormValue(form, "sessionToken", token);
      setFormValue(form, "packetSignature", sign);
      setFormValue(form, "latTrace", lat);
      setFormValue(form, "lonTrace", lon);
      setFormValue(form, "dateCode", codeDateToInput(dateCode));
      setFormValue(form, "timeCode", codeTimeToInput(timeCode));
      setFormValue(form, "trace", composeTrace({ ...data, sessionToken: token, packetSignature: sign, latTrace: lat, lonTrace: lon, dateCode, timeCode }));
      setFormMessage("TRACE GENERATED", "ok");
    });

    document.querySelector("#generate-citizen-id-button")?.addEventListener("click", () => {
      const form = document.querySelector("#address-form");
      if (!form) return;
      const data = collectAddressForm(form);
      const randomBlock = randomAlphaNum(7);
      const citizenId = composeCitizenId({ ...data, randomBlock });
      setFormValue(form, "randomBlock", randomBlock);
      setFormValue(form, "citizenId", citizenId);
      setFormValue(form, "shortId", extractShortId(citizenId));
      setFormMessage("CITIZEN ID / SHORT ID GENERATED", "ok");
    });

    document.querySelector("#set-trace-now-button")?.addEventListener("click", () => {
      const form = document.querySelector("#address-form");
      if (!form) return;
      const now = getCurrentTraceCodes();
      const data = { ...collectAddressForm(form), ...now };
      setFormValue(form, "dateCode", codeDateToInput(now.dateCode));
      setFormValue(form, "timeCode", codeTimeToInput(now.timeCode));
      setFormValue(form, "trace", composeTrace(data));
      setFormMessage("TRACE DATE / TIME SET", "ok");
    });

    document.querySelector("#extract-short-id-button")?.addEventListener("click", () => {
      const form = document.querySelector("#address-form");
      if (!form) return;
      const citizenId = String(new FormData(form).get("citizenId") || "");
      setFormValue(form, "shortId", extractShortId(citizenId));
      setFormMessage("SHORT ID EXTRACTED", "ok");
    });
  }

  function generateDefaultAddressPayload() {
    const payload = generateBlankAddressPayload();
    payload.label = `Generated Record ${new Date().toISOString().slice(0, 19).replace("T", " ")}`;
    payload.type = "LOCATION";
    payload.clearance = "RESTRICTED";
    payload.tags = ["GENERATED", "ADDRESS CORE"];
    payload.chunk = randomChunk();
    payload.building = randomDigits(3);
    payload.cell = randomDigits(3);
    payload.birthChunk = randomBirthChunk();
    payload.birthDate = randomBirthDate();
    payload.randomBlock = randomAlphaNum(7);
    payload.dateCode = randomTraceDate();
    payload.timeCode = randomTimeCode();
    payload.sessionToken = randomAlphaNum(6);
    payload.packetSignature = randomAlphaNum(4);
    payload.latTrace = randomLatTrace();
    payload.lonTrace = randomLonTrace();
    payload.visibleAddress = composeVisibleAddress(payload);
    payload.trace = composeTrace(payload);
    payload.citizenId = composeCitizenId(payload);
    payload.shortId = extractShortId(payload.citizenId);
    payload.note = "Generated by Address Core.";
    return payload;
  }

  function generateBlankAddressPayload() {
    const payload = {
      label: "",
      type: "LOCATION",
      clearance: "RESTRICTED",
      tags: [],
      cityCode: "03",
      geoAddress: "51N00E",
      networkId: "002",
      controlCode: "109",
      chunk: "A4",
      building: "001",
      cell: "001",
      birthChunk: "0A04",
      birthDate: "20720121",
      randomBlock: "",
      citizenId: "",
      shortId: "",
      latTrace: "51N3410",
      lonTrace: "00E2131",
      dateCode: randomTraceDate(),
      timeCode: randomTimeCode(),
      sessionToken: randomAlphaNum(6),
      packetSignature: randomAlphaNum(4),
      visibleAddress: "",
      trace: "",
      note: "",
      gmNote: ""
    };

    payload.visibleAddress = composeVisibleAddress(payload);
    payload.trace = composeTrace(payload);
    return payload;
  }

  function collectAddressForm(form) {
    const data = new FormData(form);
    return {
      label: String(data.get("label") || "").trim(),
      type: String(data.get("type") || "LOCATION").trim().toUpperCase(),
      clearance: String(data.get("clearance") || "RESTRICTED").trim().toUpperCase(),
      tags: parseList(data.get("tags")),
      cityCode: String(data.get("cityCode") || "03").trim().toUpperCase(),
      geoAddress: String(data.get("geoAddress") || "51N00E").trim().toUpperCase(),
      networkId: String(data.get("networkId") || "002").trim().toUpperCase(),
      controlCode: String(data.get("controlCode") || "109").trim().toUpperCase(),
      chunk: String(data.get("chunk") || "A4").trim().toUpperCase(),
      building: String(data.get("building") || "001").trim().toUpperCase(),
      cell: String(data.get("cell") || "001").trim().toUpperCase(),
      birthChunk: String(data.get("birthChunk") || "0A04").trim().toUpperCase(),
      birthDate: String(data.get("birthDate") || "20720121").trim(),
      randomBlock: String(data.get("randomBlock") || "").trim().toUpperCase(),
      citizenId: String(data.get("citizenId") || "").trim().toUpperCase(),
      shortId: String(data.get("shortId") || "").trim().toUpperCase(),
      latTrace: String(data.get("latTrace") || "51N3410").trim().toUpperCase(),
      lonTrace: String(data.get("lonTrace") || "00E2131").trim().toUpperCase(),
      dateCode: inputDateToCode(String(data.get("dateCode") || "21090101").trim()),
      timeCode: inputTimeToCode(String(data.get("timeCode") || "2137").trim()),
      sessionToken: String(data.get("sessionToken") || "K7X9Q2").trim().toUpperCase(),
      packetSignature: String(data.get("packetSignature") || "F91A").trim().toUpperCase(),
      visibleAddress: String(data.get("visibleAddress") || "").trim().toUpperCase(),
      trace: String(data.get("trace") || "").trim().toUpperCase(),
      note: String(data.get("note") || "").trim(),
      gmNote: String(data.get("gmNote") || "").trim()
    };
  }

  function composeVisibleAddress(data) {
    return `${cleanSegment(data.cityCode, "03")}.${cleanSegment(data.geoAddress, "51N00E")}.${cleanSegment(data.networkId, "002")}.${cleanSegment(data.controlCode, "109")}::${cleanSegment(data.chunk, "A4")}.${cleanSegment(data.building, "001")}.${cleanSegment(data.cell, "001")}`.toUpperCase();
  }

  function composeTrace(data) {
    return `${cleanSegment(data.cityCode, "03")}.${cleanSegment(data.latTrace, "51N3410")}.${cleanSegment(data.lonTrace, "00E2131")}.${cleanSegment(data.dateCode, "21090101")}.${cleanSegment(data.timeCode, "2137")}.${cleanSegment(data.sessionToken, "K7X9Q2")}.${cleanSegment(data.packetSignature, "F91A")}`.toUpperCase();
  }

  function composeCitizenId(data) {
    const randomBlock = cleanSegment(data.randomBlock, randomAlphaNum(7));
    return `${cleanSegment(data.cityCode, "03")}.${cleanSegment(data.geoAddress, "51N00E")}.${cleanSegment(data.birthChunk, "0A04")}.${cleanSegment(data.birthDate, "20720121")}.${randomBlock}`.toUpperCase();
  }

  function extractShortId(value) {
    if (window.WS_APP.extractShortIdFromCitizenId) {
      return window.WS_APP.extractShortIdFromCitizenId(value);
    }

    const source = String(value || "").trim();
    const match = source.match(/(\d{8}\.[A-Z0-9]+)$/i) || source.match(/(\d{8}\.[A-Z0-9]+)/i);
    return match ? match[1].toUpperCase() : "";
  }

  function cleanSegment(value, fallback) {
    const segment = String(value || "").trim();
    return segment || fallback;
  }

  function parseList(value) {
    return String(value || "")
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function renderInput(name, label, value = "", extraClass = "") {
    return `
      <label class="address-form-field ${escapeHtml(extraClass)}">
        ${escapeHtml(label)}
        <input name="${escapeHtml(name)}" value="${escapeHtml(value)}" />
      </label>
    `;
  }

  function renderDateInput(name, label, value = "", extraClass = "") {
    return `
      <label class="address-form-field ${escapeHtml(extraClass)}">
        ${escapeHtml(label)}
        <input name="${escapeHtml(name)}" type="date" value="${escapeHtml(codeDateToInput(value))}" />
      </label>
    `;
  }

  function renderTimeInput(name, label, value = "", extraClass = "") {
    return `
      <label class="address-form-field ${escapeHtml(extraClass)}">
        ${escapeHtml(label)}
        <input name="${escapeHtml(name)}" type="time" value="${escapeHtml(codeTimeToInput(value))}" />
      </label>
    `;
  }

  function renderTextarea(name, label, value = "", extraClass = "", rows = 4) {
    return `
      <label class="address-form-field ${escapeHtml(extraClass)}">
        ${escapeHtml(label)}
        <textarea name="${escapeHtml(name)}" rows="${escapeHtml(rows)}">${escapeHtml(value)}</textarea>
      </label>
    `;
  }

  function renderSelect(name, label, value, options) {
    return `
      <label class="address-form-field">
        ${escapeHtml(label)}
        <select name="${escapeHtml(name)}">
          ${options.map((option) => `<option value="${escapeHtml(option)}" ${option === value ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}
        </select>
      </label>
    `;
  }

  function renderNetworkSelect(name, label, value) {
    const known = NETWORKS.some((network) => network.id === value);

    return `
      <label class="address-form-field">
        ${escapeHtml(label)}
        <select name="${escapeHtml(name)}">
          ${NETWORKS.map((network) => `<option value="${escapeHtml(network.id)}" ${network.id === value ? "selected" : ""}>${escapeHtml(network.id)} / ${escapeHtml(network.label)}</option>`).join("")}
          ${known ? "" : `<option value="${escapeHtml(value)}" selected>${escapeHtml(value)} / Custom</option>`}
        </select>
      </label>
    `;
  }

  function renderDataRow(label, value) {
    return `
      <div class="data-row">
        <b>${escapeHtml(label)}</b>
        <span>${escapeHtml(value || "N/A")}</span>
      </div>
    `;
  }

  function bindBackButton(user) {
    const button = document.querySelector(".module-back-button");
    if (window.WS_APP.bindModuleBackButton) {
      window.WS_APP.bindModuleBackButton(user, () => window.WS_APP.renderModules?.(user));
      return;
    }
    button?.addEventListener("click", () => window.WS_APP.renderModules?.(user));
  }

  function setFormValue(form, name, value) {
    const field = form.querySelector(`[name="${CSS.escape(name)}"]`);
    if (field) field.value = value;
  }

  function setFormMessage(message, tone = "") {
    const node = document.querySelector("#address-form-message");
    if (!node) return;
    node.textContent = message;
    node.className = `address-form-message ${tone ? `is-${tone}` : ""}`.trim();
  }

  function normalizeQuery(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function confirmAddressAction(title, message, confirmLabel) {
    return window.WS_APP.confirmAction?.({
      title,
      message,
      confirmLabel,
      cancelLabel: "Cancel",
      tone: "danger"
    }) ?? Promise.resolve(false);
  }

  function inputDateToCode(value) {
    const raw = String(value || "").trim();
    const dashed = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dashed) return `${dashed[1]}${dashed[2]}${dashed[3]}`;
    const compact = raw.replace(/\D/g, "").slice(0, 8);
    return compact.length === 8 ? compact : "21090101";
  }

  function codeDateToInput(value) {
    const compact = inputDateToCode(value);
    return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
  }

  function inputTimeToCode(value) {
    const raw = String(value || "").trim();
    const colon = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (colon) return `${colon[1].padStart(2, "0")}${colon[2]}`;
    const compact = raw.replace(/\D/g, "").slice(0, 4);
    return compact.length === 4 ? compact : "0000";
  }

  function codeTimeToInput(value) {
    const compact = inputTimeToCode(value);
    return `${compact.slice(0, 2)}:${compact.slice(2, 4)}`;
  }

  function getCurrentTraceCodes() {
    const now = new Date();
    return {
      dateCode: `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`,
      timeCode: `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`
    };
  }

  function randomAlphaNum(length) {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }

  function randomDigits(length) {
    return String(Math.floor(Math.random() * Math.pow(10, length))).padStart(length, "0");
  }

  function randomChunk() {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return `${letters[Math.floor(Math.random() * letters.length)]}${Math.floor(Math.random() * 20) + 1}`;
  }

  function randomBirthChunk() {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return `${chars[Math.floor(Math.random() * chars.length)]}${chars[Math.floor(Math.random() * chars.length)]}${randomDigits(2)}`;
  }

  function randomBirthDate() {
    const year = 2068 + Math.floor(Math.random() * 23);
    const month = 1 + Math.floor(Math.random() * 12);
    const day = 1 + Math.floor(Math.random() * 28);
    return `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
  }

  function randomTraceDate() {
    const year = 2109;
    const month = 1 + Math.floor(Math.random() * 12);
    const day = 1 + Math.floor(Math.random() * 28);
    return `${year}${String(month).padStart(2, "0")}${String(day).padStart(2, "0")}`;
  }

  function randomTimeCode() {
    return `${String(Math.floor(Math.random() * 24)).padStart(2, "0")}${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`;
  }

  function randomLatTrace() {
    return `51N${randomDigits(4)}`;
  }

  function randomLonTrace() {
    return `00E${randomDigits(4)}`;
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
})();
