window.WS_APP = window.WS_APP || {};

(function initAdminWorkspaceLoader() {
  if (window.WS_APP.AdminWorkspaceLoader) return;

  const states = Object.create(null);

  function getRegistry() {
    return window.WS_APP.AdminWorkspaceRegistry;
  }

  function getBundleId(workspaceId = "") {
    return getRegistry()?.getBundleId?.(workspaceId) || "";
  }

  function assertRendererRegistered(workspaceId = "") {
    const id = String(workspaceId || "").trim();
    if (getRegistry()?.hasRenderer?.(id)) return true;
    const error = new Error(`ADMIN_WORKSPACE_RENDERER_NOT_REGISTERED:${id || "EMPTY"}`);
    error.code = "ADMIN_WORKSPACE_RENDERER_NOT_REGISTERED";
    error.workspaceId = id;
    throw error;
  }

  function getState(workspaceId = "") {
    const id = String(workspaceId || "").trim();
    const bundleId = getBundleId(id);
    if (!bundleId) {
      return {
        workspaceId: id,
        bundleId: "",
        status: getRegistry()?.hasRenderer?.(id) ? "READY" : "IDLE",
        error: null,
        promise: null
      };
    }
    states[id] = states[id] || { workspaceId: id, bundleId, status: "IDLE", error: null, promise: null };
    return states[id];
  }

  function isReady(workspaceId = "") {
    return getState(workspaceId).status === "READY";
  }

  function ensure(workspaceId = "") {
    const state = getState(workspaceId);
    if (!state.bundleId) {
      try {
        assertRendererRegistered(state.workspaceId);
        return Promise.resolve({ ...state, status: "READY" });
      } catch (error) {
        return Promise.reject(error);
      }
    }
    if (state.status === "READY") return Promise.resolve(state);
    if (state.promise) return state.promise;
    state.status = "LOADING";
    state.error = null;
    state.promise = Promise.resolve()
      .then(() => window.WS_APP.loadModuleBundle?.(state.bundleId, { role: "admin" }))
      .then(() => {
        assertRendererRegistered(state.workspaceId);
        state.status = "READY";
        state.promise = null;
        return state;
      })
      .catch((error) => {
        state.status = "FAILED";
        state.error = error;
        state.promise = null;
        throw error;
      });
    return state.promise;
  }

  function retry(workspaceId = "") {
    const state = getState(workspaceId);
    if (!state.bundleId) return ensure(workspaceId);
    state.status = "IDLE";
    state.error = null;
    state.promise = null;
    return ensure(workspaceId);
  }

  function describe(workspaceId = "") {
    const state = getState(workspaceId);
    return {
      workspaceId: state.workspaceId,
      bundleId: state.bundleId,
      status: state.status,
      rendererReady: Boolean(getRegistry()?.hasRenderer?.(state.workspaceId)),
      errorMessage: state.error?.message || ""
    };
  }

  window.WS_APP.AdminWorkspaceLoader = Object.freeze({
    ensure,
    retry,
    isReady,
    describe,
    getBundleId
  });
})();
