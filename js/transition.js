window.WS_APP = window.WS_APP || {};

const WS_TEST_MODE_STORAGE_KEY = "ws_app_test_mode_v1";

window.WS_APP.isTestModeEnabled = function isTestModeEnabled() {
  try {
    return window.localStorage?.getItem(WS_TEST_MODE_STORAGE_KEY) === "1";
  } catch (error) {
    return false;
  }
};

window.WS_APP.setTestModeEnabled = function setTestModeEnabled(enabled) {
  const isEnabled = Boolean(enabled);

  try {
    if (isEnabled) {
      window.localStorage?.setItem(WS_TEST_MODE_STORAGE_KEY, "1");
    } else {
      window.localStorage?.removeItem(WS_TEST_MODE_STORAGE_KEY);
    }
  } catch (error) {
    void error;
  }

  document.body?.classList.toggle("is-test-mode", isEnabled);
  window.WS_APP.syncTestModeToggle?.();
  return isEnabled;
};

window.WS_APP.toggleTestMode = function toggleTestMode() {
  return window.WS_APP.setTestModeEnabled(!window.WS_APP.isTestModeEnabled());
};


window.WS_APP.bindTestModeToggles = function bindTestModeToggles() {
  document.querySelectorAll("[data-test-mode-toggle]").forEach((button) => {
    if (button.dataset.testModeBound === "1") return;
    button.dataset.testModeBound = "1";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      window.WS_APP.toggleTestMode();
    });
  });
};

window.WS_APP.syncTestModeToggle = function syncTestModeToggle() {
  window.WS_APP.bindTestModeToggles?.();
  const isEnabled = window.WS_APP.isTestModeEnabled();
  document.body?.classList.toggle("is-test-mode", isEnabled);

  document.querySelectorAll("[data-test-mode-toggle]").forEach((button) => {
    button.classList.toggle("is-active", isEnabled);
    button.setAttribute("aria-checked", isEnabled ? "true" : "false");
    button.dataset.state = isEnabled ? "ON" : "OFF";

    const stateNode = button.querySelector("[data-test-mode-state]");
    if (stateNode) stateNode.textContent = isEnabled ? "ON" : "OFF";
  });
};

window.WS_APP.ensureTestModeToggle = function ensureTestModeToggle() {
  const actions = document.querySelector(".terminal-actions");

  if (!actions) return null;

  let button = actions.querySelector("[data-test-mode-toggle]");

  if (!button) {
    button = document.createElement("button");
    button.className = "terminal-test-mode-toggle";
    button.type = "button";
    button.setAttribute("role", "switch");
    button.setAttribute("data-test-mode-toggle", "");
    button.innerHTML = '<span>TEST MODE</span><strong data-test-mode-state>OFF</strong>';
    actions.insertBefore(button, actions.querySelector("#logout-button") || actions.firstChild);
  }

  window.WS_APP.syncTestModeToggle();
  return button;
};

window.WS_APP.syncTestModeToggle();


window.WS_APP.showScreen = function showScreen(nextScreenId) {
  const currentScreen = document.querySelector(".screen.is-active");
  const nextScreen = document.querySelector(`#${nextScreenId}`);

  if (!nextScreen) return;

  if (!currentScreen) {
    nextScreen.classList.add("is-active");
    return;
  }

  if (window.WS_APP.isTestModeEnabled?.()) {
    currentScreen.classList.remove("is-active", "is-leaving");
    nextScreen.classList.add("is-active");
    return;
  }

  currentScreen.classList.add("is-leaving");

  window.setTimeout(() => {
    currentScreen.classList.remove("is-active", "is-leaving");
    nextScreen.classList.add("is-active");
  }, 420);
};

window.WS_APP.runBootSequence = function runBootSequence(user, onComplete) {
  const bootLines = document.querySelector("#boot-lines");

  const lines = [
    `AUTHORIZATION ACCEPTED / ${user.displayName}`,
    `LOADING LOCAL PROFILE / ${user.citizenId}`,
    `CHECKING CLEARANCE / ${user.role.toUpperCase()}`,
    "SYNCING LOCAL CACHE / UNCONFIRMED",
    "OPENING TERMINAL"
  ];

  if (window.WS_APP.isTestModeEnabled?.()) {
    if (bootLines) bootLines.innerHTML = "";
    if (typeof onComplete === "function") onComplete();
    return;
  }

  if (bootLines) bootLines.innerHTML = "";

  window.WS_APP.showScreen("boot-screen");

  lines.forEach((line, index) => {
    window.setTimeout(() => {
      const node = document.createElement("div");
      node.className = "boot-line";
      bootLines.appendChild(node);

      if (window.WS_APP.typeText) {
        window.WS_APP.typeText(node, line, { speed: 12 });
        return;
      }

      node.textContent = line;
    }, 420 + index * 460);
  });

  const totalTime = 420 + lines.length * 460 + 520;

  window.setTimeout(() => {
    if (typeof onComplete === "function") {
      onComplete();
    }
  }, totalTime);
};