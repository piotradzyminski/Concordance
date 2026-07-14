window.WS_APP = window.WS_APP || {};

window.WS_APP.renderTerminal = function renderTerminal(user) {
  window.WS_APP.currentUser = user;

  const citizen = window.WS_APP.getCitizenById(user.citizenId);

  const sessionUser = document.querySelector("#session-user");
  const sessionRole = document.querySelector("#session-role");

  if (sessionUser) {
    sessionUser.textContent = user.displayName;
  }

  if (sessionRole) {
    sessionRole.textContent = user.role;
  }

  window.WS_APP.renderCitizenProfile(citizen, user);
  window.WS_APP.renderModules(user);
  window.WS_APP.renderTerminalLog(user, citizen);
  window.WS_APP.runProfileScan?.(citizen, user);
  window.WS_APP.startSessionLogStream?.(user);
  window.WS_APP.syncTerminalTools?.(user);
  window.WS_APP.ensureTestModeToggle?.();
  window.WS_APP.syncTerminalUnreadLabels?.();
  window.dispatchEvent(new CustomEvent("ws:terminal-rendered", { detail: { user, citizen } }));
};


window.WS_APP.initCitizenStoreRefresh = function initCitizenStoreRefresh() {
  if (window.WS_APP.hasCitizenStoreRefreshListener) return;

  window.WS_APP.hasCitizenStoreRefreshListener = true;

  window.addEventListener("ws:citizens-updated", (event) => {
    const user = window.WS_APP.currentUser;

    if (!user) return;

    const updatedId = event.detail?.id;
    const skipProfileRefresh = event.detail?.skipProfileRefresh === true;
    const skipModuleRefresh = event.detail?.skipModuleRefresh === true;
    const refreshProfile = !skipProfileRefresh && (!updatedId || updatedId === user.citizenId || event.detail?.reset || event.detail?.import);

    if (refreshProfile) {
      const citizen = window.WS_APP.getCitizenById(user.citizenId);
      window.WS_APP.renderCitizenProfile(citizen, user);
      window.WS_APP.runProfileScan?.(citizen, user);
    }

    if (window.WS_APP.currentModuleId === "citizen-cards" && window.WS_APP.currentCitizenCardsSelectedId && window.WS_APP.openCitizenCard) {
      window.WS_APP.openCitizenCard(window.WS_APP.currentCitizenCardsSelectedId, "citizen-cards");
      return;
    }

    if (skipModuleRefresh) return;

    if (window.WS_APP.currentModuleId && window.WS_APP.openModule) {
      window.WS_APP.openModule(window.WS_APP.currentModuleId, user, { skipLoader: true });
    }
  });
};

window.WS_APP.initLogout = function initLogout() {
  const logoutButton = ensureLogoutButton();

  if (!logoutButton) return;

  logoutButton.addEventListener("click", () => {
    window.WS_APP.logout();
  });
};

function ensureLogoutButton() {
  const existingButton = document.querySelector("#logout-button");

  if (existingButton) {
    return existingButton;
  }

  const topbar = document.querySelector(".terminal-topbar");

  if (!topbar) {
    return null;
  }

  const actions = document.createElement("div");
  actions.className = "terminal-actions";

  const button = document.createElement("button");
  button.className = "logout-button";
  button.id = "logout-button";
  button.type = "button";
  button.textContent = "Log Out";

  actions.appendChild(button);
  topbar.appendChild(actions);

  return button;
}

window.WS_APP.logout = function logout() {
  const loginInput = document.querySelector("#login-input");
  const passwordInput = document.querySelector("#password-input");
  const message = document.querySelector("#auth-message");
  const authCacheButtons = document.querySelectorAll(".auth-cache-button");
  const profilePanel = document.querySelector("#profile-panel");
  const moduleGrid = document.querySelector("#module-grid");
  const logLines = document.querySelector("#terminal-log-lines");
  const bootLines = document.querySelector("#boot-lines");

  window.WS_APP.stopSessionLogStream?.();
  window.WS_APP.cancelModuleAccessSequence?.();
  window.WS_APP.closeGlobalSearch?.();
  window.WS_APP.closeDataIO?.();
  window.WS_APP.currentUser = null;

  if (loginInput) {
    loginInput.value = "";
  }

  if (passwordInput) {
    passwordInput.value = "";
  }

  if (message) {
    message.classList.remove("is-visible");
  }

  authCacheButtons.forEach((button) => {
    button.classList.remove("is-selected");
  });

  if (profilePanel) {
    profilePanel.innerHTML = "";
  }

  if (moduleGrid) {
    moduleGrid.innerHTML = "";
  }

  if (logLines) {
    logLines.innerHTML = "";
  }

  if (bootLines) {
    bootLines.innerHTML = "";
  }

  window.WS_APP.showScreen("auth-screen");

  window.setTimeout(() => {
    loginInput?.focus();
  }, 460);
};

window.WS_APP.renderTerminalLog = function renderTerminalLog(user, citizen) {
  const container = document.querySelector("#terminal-log-lines");

  if (!container) return;

  const lines = [
    `SESSION OPENED / ${user.displayName}`,
    user.role === "admin"
      ? "DATABASE ACCESS GRANTED / ADMIN"
      : `PROFILE LOADED / ${citizen?.id || "NO_PROFILE"}`,
    `CLEARANCE CONFIRMED / ${citizen?.clearance || user.role}`,
    "LOCAL CACHE STATUS / UNSYNCED"
  ];

  container.innerHTML = lines
    .map((line) => `<div class="log-line">${escapeHtml(line)}</div>`)
    .join("");
};

function escapeHtml(value) {
  if (typeof window.WS_APP?.escapeHtml === "function") return window.WS_APP.escapeHtml(value);
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
