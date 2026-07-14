(function () {
  window.WS_APP = window.WS_APP || {};

  let activeScanId = 0;
  let activeTimers = [];
  let activeTypingTimers = [];
  let sessionLogTimer = null;
  let sessionLogId = 0;
  let moduleLoaderId = 0;
  let ambientPortraitTimer = null;
  let ambientPortraitScanId = 0;

  const SESSION_LOG_LINES = [
    { type: "data", build: () => `DATA REFRESH / LOCAL CACHE` },
    { type: "data", build: () => `CACHE REFRESH / ${generateGeoShort()}` },
    { type: "data", build: () => `CACHE INDEX ROTATED / ${String(randomInt(2, 9)).padStart(3, "0")} CLUSTERS` },
    { type: "data", build: () => `CACHE DELTA / ${String(randomInt(1, 14)).padStart(3, "0")} ENTRIES` },
    { type: "data", build: () => `LOCAL MIRROR VERIFIED / ${generateToken(4)}` },
    { type: "control", build: () => `CONTROL SCAN / ${pick(["ACTIVE", "NO BREACH", "PASSIVE", "RECHECK"])}` },
    { type: "control", build: () => `CITIZEN SIGNAL CHECKED / ${pick(["STABLE", "LOW DRIFT", "PASSIVE"])}` },
    { type: "control", build: () => `BEHAVIORAL DRIFT / ${pick(["LOW", "LOW", "MEDIUM", "TRACE"])}` },
    { type: "control", build: () => `PROFILE COHERENCE / ${pick(["STABLE", "ACCEPTED", "INDEXED"])}` },
    { type: "control", build: () => `QUERY PATTERN STORED / ${generateToken(4)}` },
    { type: "trace", build: () => `TRACE TOKEN ROTATED / ${generateToken(6)}` },
    { type: "trace", build: () => `TRACE LOCK / ${pick(["LOCAL", "W&S BUFFER", "CACHE GATE"])}` },
    { type: "trace", build: () => `ROUTE CHECK / ${pick(["LOCAL > W&S", "LOCAL > SYNC BUFFER", "LOCAL > NULL MIRROR", "LOCAL > CACHE GATE"])}` },
    { type: "trace", build: () => `PACKET SIGNATURE VERIFIED / ${generatePacketId()}` },
    { type: "trace", build: () => `SESSION TOKEN REFRESHED / ${generateToken(6)}` },
    { type: "session", build: () => "USER ACTIVITY RECORDED" },
    { type: "session", build: () => "SYNC STATUS / LOCAL" },
    { type: "session", build: () => "SYNC BUFFER / UNSENT" },
    { type: "session", build: () => "HAVEN GATEWAY / SEALED" },
    { type: "session", build: () => "BLACKWALL PING / BLOCKED" },
    { type: "session", build: () => "UNAUTHORIZED INTENT / NOT DETECTED" }
  ];

  const TELEMETRY_REFRESH_STATES = ["LOCAL", "DRIFT", "SYNC WAIT", "CACHE"];
  const TELEMETRY_SCAN_STATES = ["NO BREACH", "PASSIVE", "RECHECK", "SIGNAL OK", "PATTERN OK"];
  const TELEMETRY_DRIFT_STATES = ["LOW", "LOW", "LOW", "MEDIUM", "TRACE"];
  const TELEMETRY_ROUTE_STATES = ["LOCAL", "W&S BUFFER", "SYNC BUFFER", "NULL MIRROR", "CACHE GATE"];
  const TELEMETRY_TRACE_STATES = ["LOCKED", "ROTATED", "LOCAL", "SEALED"];
  const TELEMETRY_CONTROL_STATES = ["ACTIVE", "PASSIVE", "SCANNING", "STABLE"];

  const MODULE_PROGRESS_PATTERNS = [
    [0, 13, 28, 41, 41, 67, 88, 100],
    [0, 9, 24, 39, 57, 57, 76, 100],
    [0, 17, 33, 52, 68, 82, 82, 100],
    [0, 6, 21, 43, 43, 61, 79, 94, 100]
  ];

  const MODULE_MESSAGES = [
    "MODULE REQUEST ACCEPTED",
    "CHECKING CLEARANCE",
    "SYNCING LOCAL CACHE",
    "DECRYPTING RECORD INDEX",
    "CACHE MISS",
    "RETRYING",
    "LOCAL MIRROR FOUND",
    "VALIDATING TRACE",
    "INDEX FOUND"
  ];

  let confirmDialogSequence = 0;

  window.WS_APP.confirmAction = function confirmAction(options = {}) {
    const config = typeof options === "string" ? { message: options } : options;
    const id = ++confirmDialogSequence;
    const title = String(config.title || "CONFIRM ACTION");
    const message = String(config.message || "Confirm this operation.");
    const confirmLabel = String(config.confirmLabel || "Confirm");
    const cancelLabel = String(config.cancelLabel || "Cancel");
    const hideCancel = config.hideCancel === true || config.showCancel === false || config.cancelLabel === null;
    const tone = config.tone === "danger" ? "is-danger" : config.tone === "warning" ? "is-warning" : "";

    return new Promise((resolve) => {
      closeConfirmDialog(false);

      const overlay = document.createElement("div");
      overlay.className = `ws-confirm-overlay ${tone}`.trim();
      overlay.id = `ws-confirm-${id}`;
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.innerHTML = `
        <section class="ws-confirm-dialog" aria-labelledby="ws-confirm-title-${id}">
          <header class="ws-confirm-head">
            <div>
              <p class="kicker">WATCH & SECURE / LOCAL CONFIRMATION</p>
              <h4 id="ws-confirm-title-${id}">${escapeHtml(title)}</h4>
            </div>
          </header>

          <p class="ws-confirm-message">${escapeHtml(message)}</p>

          <footer class="ws-confirm-actions ${hideCancel ? "is-single-action" : ""}">
            ${hideCancel ? "" : `<button class="ws-confirm-cancel" type="button">${escapeHtml(cancelLabel)}</button>`}
            <button class="ws-confirm-accept" type="button">${escapeHtml(confirmLabel)}</button>
          </footer>
        </section>
      `;

      document.body.appendChild(overlay);

      const finish = (value) => {
        if (!document.body.contains(overlay)) return;
        overlay.remove();
        document.removeEventListener("keydown", onKeyDown);
        resolve(value);
      };

      const onKeyDown = (event) => {
        if (event.key === "Escape") finish(false);
      };

      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) finish(false);
      });

      overlay.querySelector(".ws-confirm-cancel")?.addEventListener("click", () => finish(false));
      overlay.querySelector(".ws-confirm-accept")?.addEventListener("click", () => finish(true));
      document.addEventListener("keydown", onKeyDown);

      window.setTimeout(() => overlay.querySelector(".ws-confirm-accept")?.focus(), 30);
    });
  };

  function closeConfirmDialog(resolveOpen = true) {
    const overlay = document.querySelector(".ws-confirm-overlay");
    if (!overlay) return;
    overlay.remove();
    if (resolveOpen) confirmDialogSequence += 1;
  }

  window.WS_APP.runProfileScan = function runProfileScan(citizen, user) {
    clearActiveTimers();

    const scanId = ++activeScanId;
    const panel = document.querySelector("#profile-panel");

    if (!panel || !user) return;

    if (user.role === "admin") {
      appendLogLine("ADMIN ACCESS INITIALIZED / LOCAL OVERRIDE ACTIVE", "scan-log-line", { typed: true });
      return;
    }

    if (!citizen) {
      appendLogLine("PROFILE SCAN FAILURE / NO CITIZEN RECORD", "scan-log-line", { typed: true });
      return;
    }

    const revealItems = collectRevealItems(panel);
    const riskFill = panel.querySelector(".risk-fill");
    const targetRisk = readRiskValue(riskFill);
    const reducedMotion = isReducedMotion();

    panel.classList.remove("is-profile-scanning");
    resetRevealState(revealItems);
    resetRisk(riskFill);

    // Force style recalculation so the scan class reliably starts from the hidden state.
    void panel.offsetWidth;

    panel.classList.add("is-profile-scanning");

    if (reducedMotion) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      setRisk(riskFill, targetRisk);
      appendProfileScanLogLines(scanId, user, true);
      queueTimer(() => {
        if (isScanCurrent(scanId, user)) {
          panel.classList.remove("is-profile-scanning");
        }
      }, 80);
      return;
    }

    appendProfileScanLogLines(scanId, user, false);

    revealItems.forEach((item, index) => {
      queueTimer(() => {
        if (!isScanCurrent(scanId, user)) return;
        item.classList.add("is-visible");
      }, 150 + index * 85);
    });

    const riskDelay = 280 + revealItems.length * 85;

    queueTimer(() => {
      if (!isScanCurrent(scanId, user)) return;
      setRisk(riskFill, targetRisk);
    }, riskDelay);

    queueTimer(() => {
      if (!isScanCurrent(scanId, user)) return;
      panel.classList.remove("is-profile-scanning");
      revealItems.forEach((item) => item.classList.add("is-visible"));
      setRisk(riskFill, targetRisk);
    }, riskDelay + 1050);
  };

  window.WS_APP.typeText = function typeText(node, text, options = {}) {
    if (!node) return Promise.resolve();

    const value = String(text ?? "");
    const speed = Number(options.speed ?? 14);
    const startDelay = Number(options.delay ?? 0);
    const cursorClass = options.cursorClass || "is-typing";

    if (isReducedMotion() || speed <= 0) {
      node.textContent = value;
      return Promise.resolve();
    }

    node.textContent = "";
    node.classList.add(cursorClass);

    return new Promise((resolve) => {
      const startTimer = window.setTimeout(() => {
        let index = 0;

        const writeNext = () => {
          node.textContent = value.slice(0, index);
          index += 1;

          if (index <= value.length) {
            activeTypingTimers.push(window.setTimeout(writeNext, speed));
            return;
          }

          node.classList.remove(cursorClass);
          resolve();
        };

        writeNext();
      }, startDelay);

      activeTypingTimers.push(startTimer);
    });
  };

  window.WS_APP.appendTerminalLogLine = function appendTerminalLogLine(text, options = {}) {
    return appendLogLine(text, options.extraClass, {
      typed: options.typed !== false,
      speed: options.speed,
      maxLines: options.maxLines
    });
  };

  window.WS_APP.startSessionLogStream = function startSessionLogStream(user) {
    window.WS_APP.stopSessionLogStream?.();

    if (!user) return;

    const streamId = ++sessionLogId;

    updateTelemetrySidefeed(user, { initial: true });
    markLastLogLineAsTail();
    startAmbientPortraitScans(user);

    const scheduleNext = () => {
      const delay = randomInt(3600, 6800);

      sessionLogTimer = window.setTimeout(() => {
        if (streamId !== sessionLogId || window.WS_APP.currentUser !== user) return;

        const entry = pick(SESSION_LOG_LINES);
        appendLogLine(entry.build(), `${entry.type}-log-line session-log-line`, {
          typed: true,
          speed: 8,
          maxLines: 30
        });
        updateTelemetrySidefeed(user);
        scheduleNext();
      }, delay);
    };

    scheduleNext();
  };

  window.WS_APP.stopSessionLogStream = function stopSessionLogStream() {
    sessionLogId += 1;

    if (sessionLogTimer) {
      window.clearTimeout(sessionLogTimer);
      sessionLogTimer = null;
    }

    stopAmbientPortraitScans();
  };

  window.WS_APP.resetTelemetrySidefeed = function resetTelemetrySidefeed() {
    setText("#telemetry-refresh-state", "LOCAL");
    setText("#telemetry-refresh-timer", "00:13");
    setText("#telemetry-cache-node", "N5-LC/04-A9");
    setText("#telemetry-cache-delta", "004");
    setText("#telemetry-control-state", "ACTIVE");
    setText("#telemetry-scan-state", "NO BREACH");
    setText("#telemetry-drift-state", "LOW");
    setText("#telemetry-risk-delta", "+000");
    setText("#telemetry-trace-state", "LOCKED");
    setText("#telemetry-trace-token", "K7X9Q2");
    setText("#telemetry-route-state", "LOCAL");
    setText("#telemetry-signature", "F91A");
    setText("#terminal-log-state", "STREAM");
  };

  window.WS_APP.runModuleAccessSequence = function runModuleAccessSequence(payload = {}) {
    const container = document.querySelector("#module-grid");
    const status = document.querySelector("#module-status");
    const module = payload.module || {};
    const user = payload.user;
    const granted = payload.granted !== false;
    const title = String(module.title || module.id || "MODULE").toUpperCase();
    const requestId = ++moduleLoaderId;

    if (!container || !user) {
      return Promise.resolve({ granted: true });
    }

    if (window.WS_APP.isTestModeEnabled?.()) {
      return Promise.resolve({ granted });
    }

    const pattern = granted ? pick(MODULE_PROGRESS_PATTERNS) : [0, 11, 29, 43, 43];
    const reducedMotion = isReducedMotion();

    const terminalGrid = document.querySelector(".terminal-grid");

    if (status) {
      status.textContent = `ACCESSING / ${title}`;
    }

    terminalGrid?.classList.remove("is-inline-module-open");
    terminalGrid?.classList.add("is-card-open", "is-module-loading");
    container.classList.add("is-module-transitioning");
    container.innerHTML = buildModuleLoader(title, granted);

    container.querySelector("#module-loader-cancel")?.addEventListener("click", () => {
      moduleLoaderId += 1;
      appendLogLine(`MODULE ACCESS CANCELLED / ${title}`, "module-log-line", { typed: true, speed: 8 });
      window.WS_APP.renderModules?.(user);
    });

    const loader = container.querySelector(".module-loader");
    const fill = container.querySelector(".module-loader-fill");
    const percent = container.querySelector(".module-loader-percent");
    const lines = container.querySelector(".module-loader-lines");

    appendLogLine(`OPENING ${title}`, "module-log-line", { typed: true, speed: 8 });

    if (reducedMotion) {
      updateLoaderProgress(fill, percent, granted ? 100 : 43);
      appendLoaderLine(lines, granted ? "ACCESS GRANTED" : "ACCESS DENIED", !granted);
      appendLogLine(granted ? "LOCAL ACCESS ACCEPTED" : "CLEARANCE FAILURE / ACCESS DENIED", granted ? "module-log-line" : "module-denied-line", { typed: false });
      return Promise.resolve({ granted });
    }

    return new Promise((resolve) => {
      let elapsed = 120;

      pattern.forEach((value, index) => {
        const stepDelay = index === 0 ? 80 : randomInt(260, 520);
        elapsed += stepDelay;

        window.setTimeout(() => {
          if (requestId !== moduleLoaderId) return;

          updateLoaderProgress(fill, percent, value);

          const message = getLoaderMessage(index, value, granted, title);
          appendLoaderLine(lines, message, !granted && value >= 43);
        }, elapsed);
      });

      const finalDelay = elapsed + 620;

      window.setTimeout(() => {
        if (requestId !== moduleLoaderId) return;

        if (granted) {
          updateLoaderProgress(fill, percent, 100);
          appendLoaderLine(lines, "LOCAL ACCESS ACCEPTED", false);
          appendLogLine(`INDEX FOUND / ${randomInt(2, 9).toString().padStart(3, "0")} RECORD CLUSTERS`, "module-log-line", { typed: true, speed: 8 });
        } else {
          loader?.classList.add("is-denied");
          appendLoaderLine(lines, "CLEARANCE FAILURE", true);
          appendLoaderLine(lines, "ACCESS DENIED", true);
          appendLogLine("CLEARANCE FAILURE / ACCESS DENIED", "module-denied-line", { typed: true, speed: 8 });
        }
      }, finalDelay);

      window.setTimeout(() => {
        if (requestId !== moduleLoaderId) {
          resolve({ granted: false, cancelled: true });
          return;
        }

        resolve({ granted });
      }, finalDelay + 860);
    });
  };

  window.WS_APP.cancelModuleAccessSequence = function cancelModuleAccessSequence() {
    moduleLoaderId += 1;
  };

  function buildModuleLoader(title, granted) {
    return `
      <article class="module-loader ${granted ? "" : "is-restricted"}" aria-live="polite">
        <div class="module-loader-head">
          <div>
            <p class="kicker">W&S / MODULE ACCESS</p>
            <h4>${escapeHtml(title)}</h4>
          </div>
          <button class="module-loader-cancel" id="module-loader-cancel" type="button">Back</button>
        </div>

        <div class="module-loader-bar" aria-hidden="true">
          <span class="module-loader-fill" style="width: 0%;"></span>
        </div>

        <div class="module-loader-readout">
          <span>LOADING</span>
          <strong class="module-loader-percent">0%</strong>
        </div>

        <div class="module-loader-lines"></div>
      </article>
    `;
  }

  function updateLoaderProgress(fill, percent, value) {
    const safeValue = Math.max(0, Math.min(100, Number(value) || 0));

    if (fill) fill.style.width = `${safeValue}%`;
    if (percent) percent.textContent = `${safeValue}%`;
  }

  function getLoaderMessage(index, value, granted, title) {
    if (!granted && value >= 43) {
      return index % 2 ? "CIVIL ACCESS INSUFFICIENT" : "CLEARANCE CHECK FAILED";
    }

    if (value === 0) return `MODULE REQUESTED / ${title}`;
    if (value === 41 || value === 43 || value === 57 || value === 82) return pick(["CACHE MISS", "RETRYING", "LOCAL MIRROR FOUND"]);

    return MODULE_MESSAGES[index % MODULE_MESSAGES.length];
  }

  function appendLoaderLine(container, text, denied) {
    if (!container) return;

    const node = document.createElement("div");
    node.className = denied ? "module-loader-line is-denied" : "module-loader-line";
    container.appendChild(node);

    window.WS_APP.typeText(node, text, { speed: 8 });

    const children = Array.from(container.children);
    children.slice(0, Math.max(0, children.length - 8)).forEach((child) => child.remove());
  }

  function collectRevealItems(panel) {
    const items = [];

    const titleRow = panel.querySelector(".profile-title-row.scan-reveal");
    const tagsContainer = panel.querySelector(".profile-tags.scan-reveal");
    const tags = Array.from(panel.querySelectorAll(".profile-tag"));
    const dataRows = Array.from(panel.querySelectorAll(".profile-data .data-row"));
    const note = panel.querySelector(".profile-note.scan-reveal");

    if (titleRow) items.push(titleRow);
    if (tagsContainer) items.push(tagsContainer);
    items.push(...tags);
    items.push(...dataRows);
    if (note) items.push(note);

    return items;
  }

  function resetRevealState(items) {
    items.forEach((item) => item.classList.remove("is-visible"));
  }

  function readRiskValue(riskFill) {
    if (!riskFill) return 0;

    const rawValue = Number(riskFill.dataset.riskValue || 0);

    if (!Number.isFinite(rawValue)) return 0;

    return Math.max(0, Math.min(100, rawValue));
  }

  function resetRisk(riskFill) {
    if (!riskFill) return;
    riskFill.style.width = "0%";
  }

  function setRisk(riskFill, value) {
    if (!riskFill) return;
    riskFill.style.width = `${value}%`;
  }

  function appendProfileScanLogLines(scanId, user, instant) {
    const lines = [
      "BIOMETRIC PROFILE FOUND",
      "CITIZEN ID VERIFIED",
      "SUBSCRIPTION STATUS CHECKED",
      "RISK INDEX CALCULATED"
    ];

    lines.forEach((line, index) => {
      const delay = instant ? 0 : 260 + index * 260;

      queueTimer(() => {
        if (!isScanCurrent(scanId, user)) return;
        appendLogLine(line, "scan-log-line", { typed: true, speed: 8 });
      }, delay);
    });
  }

  function appendLogLine(text, extraClass, options = {}) {
    const container = document.querySelector("#terminal-log-lines");

    if (!container) return null;

    const node = document.createElement("div");
    node.className = extraClass ? `log-line ${extraClass}` : "log-line";
    container.appendChild(node);

    const maxLines = Number(options.maxLines || 30);
    const children = Array.from(container.children);
    children.slice(0, Math.max(0, children.length - maxLines)).forEach((child) => child.remove());
    markLastLogLineAsTail(container);
    scrollLogToBottom(container);

    if (options.typed === false || isReducedMotion()) {
      node.textContent = text;
      markLastLogLineAsTail(container);
      scrollLogToBottom(container);
      return node;
    }

    window.WS_APP.typeText(node, text, { speed: options.speed ?? 10 }).then(() => {
      markLastLogLineAsTail(container);
      scrollLogToBottom(container);
    });
    return node;
  }

  function startAmbientPortraitScans(user) {
    stopAmbientPortraitScans();

    if (!user || isReducedMotion()) return;

    const scanStreamId = ++ambientPortraitScanId;

    const scheduleNext = () => {
      ambientPortraitTimer = window.setTimeout(() => {
        if (scanStreamId !== ambientPortraitScanId || window.WS_APP.currentUser !== user) return;

        runAmbientPortraitScan();
        scheduleNext();
      }, randomInt(7200, 18500));
    };

    scheduleNext();
  }

  function stopAmbientPortraitScans() {
    ambientPortraitScanId += 1;

    if (ambientPortraitTimer) {
      window.clearTimeout(ambientPortraitTimer);
      ambientPortraitTimer = null;
    }

    document.querySelectorAll(".portrait-frame.is-ambient-scanning, .citizen-card-portrait.is-ambient-scanning").forEach((portrait) => {
      portrait.classList.remove("is-ambient-scanning", "scan-down", "scan-up");
    });
  }

  function runAmbientPortraitScan() {
    const portraits = Array.from(document.querySelectorAll(".portrait-frame, .citizen-card-portrait"))
      .filter((portrait) => {
        if (!portrait.getClientRects().length) return false;
        if (portrait.closest(".profile-panel.is-profile-scanning")) return false;
        return Boolean(portrait.querySelector("img"));
      });

    if (!portraits.length) return;

    const scanBoth = portraits.length > 1 && Math.random() > 0.62;
    const targets = scanBoth ? portraits.slice(0, 2) : [pick(portraits)];

    targets.forEach((portrait, index) => {
      window.setTimeout(() => {
        const direction = Math.random() > 0.5 ? "scan-up" : "scan-down";
        triggerPortraitScan(portrait, direction);
      }, index * 180);
    });
  }

  function triggerPortraitScan(portrait, direction) {
    if (!portrait) return;

    portrait.classList.remove("is-ambient-scanning", "scan-down", "scan-up");
    void portrait.offsetWidth;
    portrait.classList.add("is-ambient-scanning", direction);

    window.setTimeout(() => {
      portrait.classList.remove("is-ambient-scanning", "scan-down", "scan-up");
    }, 1450);
  }

  function markLastLogLineAsTail(container = document.querySelector("#terminal-log-lines")) {
    if (!container) return;

    Array.from(container.children).forEach((child) => child.classList.remove("is-log-tail"));

    const last = container.lastElementChild;

    if (last) {
      last.classList.add("is-log-tail");
    }
  }

  function scrollLogToBottom(container = document.querySelector("#terminal-log-lines")) {
    if (!container) return;

    window.requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
  }

  function queueTimer(callback, delay) {
    const timerId = window.setTimeout(callback, delay);
    activeTimers.push(timerId);
    return timerId;
  }

  function clearActiveTimers() {
    activeTimers.forEach((timerId) => window.clearTimeout(timerId));
    activeTimers = [];
  }

  function isScanCurrent(scanId, user) {
    return activeScanId === scanId && window.WS_APP.currentUser === user;
  }

  function isReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function pick(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }


  function updateTelemetrySidefeed(user, options = {}) {
    if (!user) return;

    const citizen = window.WS_APP.getCitizenById?.(user.citizenId);
    const risk = Number(citizen?.risk || 0);
    const riskDelta = `${Math.random() > 0.28 ? "+" : "-"}${String(randomInt(0, 7)).padStart(3, "0")}`;
    const refreshSeconds = String(randomInt(5, 59)).padStart(2, "0");
    const signature = generateToken(4);

    const updates = [
      ["#telemetry-refresh-state", options.initial ? "LOCAL" : pick(TELEMETRY_REFRESH_STATES)],
      ["#telemetry-refresh-timer", `00:${refreshSeconds}`],
      ["#telemetry-cache-node", generateCacheNode()],
      ["#telemetry-cache-delta", String(randomInt(0, 18)).padStart(3, "0")],
      ["#telemetry-control-state", pick(TELEMETRY_CONTROL_STATES)],
      ["#telemetry-scan-state", pick(TELEMETRY_SCAN_STATES)],
      ["#telemetry-drift-state", risk > 70 ? pick(["MEDIUM", "TRACE", "HIGH"]) : pick(TELEMETRY_DRIFT_STATES)],
      ["#telemetry-risk-delta", riskDelta],
      ["#telemetry-trace-state", pick(TELEMETRY_TRACE_STATES)],
      ["#telemetry-trace-token", generateToken(6)],
      ["#telemetry-route-state", pick(TELEMETRY_ROUTE_STATES)],
      ["#telemetry-signature", signature],
      ["#terminal-log-state", options.initial ? "STREAM" : pick(["STREAM", "ACTIVE", "LOCAL"])]
    ];

    updates.forEach(([selector, value]) => setText(selector, value, { flash: !options.initial }));

  }

  function setText(selector, value, options = {}) {
    const node = document.querySelector(selector);

    if (!node) return;

    const nextValue = String(value ?? "");

    if (node.textContent === nextValue && !options.flash) return;

    node.textContent = nextValue;

    if (options.flash) {
      node.classList.remove("telemetry-value-flash");
      void node.offsetWidth;
      node.classList.add("telemetry-value-flash");
    }
  }

  function pulseTelemetryPanel(anchorSelector) {
    const anchor = document.querySelector(anchorSelector);
    const panel = anchor?.closest(".telemetry-panel, .terminal-log");

    if (!panel) return;

    panel.classList.remove("is-updating");
    void panel.offsetWidth;
    panel.classList.add("is-updating");

    window.setTimeout(() => {
      panel.classList.remove("is-updating");
    }, 560);
  }

  function generateToken(length) {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length }, () => alphabet[randomInt(0, alphabet.length - 1)]).join("");
  }

  function generatePacketId() {
    return Array.from({ length: 5 }, () => generateToken(2)).join("-");
  }

  function generateGeoShort() {
    const city = String(randomInt(1, 10)).padStart(2, "0");
    const lat = randomInt(41, 59);
    const lon = randomInt(0, 30);
    return `${city}.${lat}N${String(lon).padStart(2, "0")}E`;
  }

  function generateCacheNode() {
    return `N${randomInt(1, 10)}-LC/${String(randomInt(1, 18)).padStart(2, "0")}-${generateToken(2)}`;
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
