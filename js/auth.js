window.WS_APP = window.WS_APP || {};

window.WS_APP.normalizeLogin = function normalizeLogin(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
};

window.WS_APP.findUser = function findUser(login, password) {
  const users = window.WS_APP.getUsers?.({ includeDisabled: false }) || window.APP_DATA?.users || [];

  const normalizedLogin = window.WS_APP.normalizeLogin(login);
  const normalizedPassword = String(password || "").trim();

  return users.find((user) => {
    return (
      window.WS_APP.normalizeLogin(user.login) === normalizedLogin &&
      user.password === normalizedPassword
    );
  });
};

window.WS_APP.initAuth = function initAuth() {
  const form = document.querySelector("#auth-form");
  const loginInput = document.querySelector("#login-input");
  const passwordInput = document.querySelector("#password-input");
  const message = document.querySelector("#auth-message");
  const frame = document.querySelector(".auth-frame");

  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const user = window.WS_APP.findUser(
      loginInput.value,
      passwordInput.value
    );

    if (!user) {
      message.classList.add("is-visible");

      frame.classList.remove("is-denied");
      void frame.offsetWidth;
      frame.classList.add("is-denied");

      passwordInput.value = "";
      passwordInput.focus();

      return;
    }

    message.classList.remove("is-visible");
    window.WS_APP.currentUser = user;

    window.WS_APP.runBootSequence(user, async () => {
      if (user.role === "admin") {
        try {
          await window.WS_APP.loadAdminBundle?.();
        } catch (error) {
          console.warn("W&S admin bundle could not be loaded.", error);
        }
      }
      window.WS_APP.renderTerminal(user);
      window.WS_APP.showScreen("terminal-screen");
    });
  });
};

window.WS_APP.initAuthCache = function initAuthCache() {
  const cache = document.querySelector("#auth-cache");
  const loginInput = document.querySelector("#login-input");
  const passwordInput = document.querySelector("#password-input");
  const message = document.querySelector("#auth-message");

  if (!cache || !loginInput || !passwordInput) return;

  cache.addEventListener("click", (event) => {
    const button = event.target.closest(".auth-cache-button");

    if (!button) return;

    const users = window.WS_APP.getUsers?.({ includeDisabled: false }) || window.APP_DATA?.users || [];
    const user = users.find((entry) => {
      return entry.login === button.dataset.login;
    });

    if (!user) return;

    loginInput.value = user.login;
    passwordInput.value = user.password;
    message?.classList.remove("is-visible");

    cache.querySelectorAll(".auth-cache-button").forEach((item) => {
      item.classList.toggle("is-selected", item === button);
    });

    passwordInput.focus();
  });
};
