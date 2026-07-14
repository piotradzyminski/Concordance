"use strict";

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { MemoryStorage } = require("./local-storage.cjs");
const { createDeterministicMath, createDeterministicDate } = require("./deterministic.cjs");

const PROJECT_ROOT = path.resolve(__dirname, "../..");

class MiniEventTarget {
  constructor() {
    this._listeners = new Map();
  }

  addEventListener(type, listener, options = {}) {
    if (typeof listener !== "function") return;
    const entries = this._listeners.get(type) || [];
    entries.push({ listener, once: options?.once === true });
    this._listeners.set(type, entries);
  }

  removeEventListener(type, listener) {
    const entries = this._listeners.get(type) || [];
    this._listeners.set(type, entries.filter((entry) => entry.listener !== listener));
  }

  dispatchEvent(event) {
    if (!event || !event.type) throw new TypeError("Event with type is required.");
    event.target ||= this;
    event.currentTarget = this;
    const entries = [...(this._listeners.get(event.type) || [])];
    for (const entry of entries) {
      entry.listener.call(this, event);
      if (entry.once) this.removeEventListener(event.type, entry.listener);
    }
    return event.defaultPrevented !== true;
  }
}

class MiniEvent {
  constructor(type) {
    this.type = String(type);
    this.defaultPrevented = false;
  }
  preventDefault() { this.defaultPrevented = true; }
}

class MiniCustomEvent extends MiniEvent {
  constructor(type, init = {}) {
    super(type);
    this.detail = init.detail;
  }
}

function createBrowserRuntime(options = {}) {
  const storage = options.storage || new MemoryStorage(options.storageSeed);
  const clock = createDeterministicDate(options.nowIso || "2109-02-13T12:00:00.000Z");
  const windowTarget = new MiniEventTarget();
  const documentTarget = new MiniEventTarget();
  let timerSequence = 0;
  const pendingTimers = new Map();

  const document = Object.assign(documentTarget, {
    readyState: options.documentReadyState || "complete",
    visibilityState: "visible",
    body: { dataset: {} },
    documentElement: { dataset: {}, style: {} },
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement: () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {}, toggle() {} } })
  });

  const window = Object.assign(windowTarget, {
    WS_APP: { ...(options.wsApp || {}) },
    APP_DATA: { ...(options.appData || {}) },
    TerminalNotifications: { ...(options.terminalNotifications || {}) },
    localStorage: storage,
    sessionStorage: new MemoryStorage(),
    document,
    location: { href: "http://127.0.0.1/", reload() {}, assign() {} },
    navigator: { userAgent: "future-noir-node-test", language: "en" },
    setTimeout(callback) {
      const id = ++timerSequence;
      pendingTimers.set(id, callback);
      return id;
    },
    clearTimeout(id) { pendingTimers.delete(id); },
    setInterval(callback) {
      const id = ++timerSequence;
      pendingTimers.set(id, callback);
      return id;
    },
    clearInterval(id) { pendingTimers.delete(id); },
    requestAnimationFrame(callback) { return window.setTimeout(() => callback(clock.now()), 16); },
    cancelAnimationFrame(id) { window.clearTimeout(id); },
    queueMicrotask,
    structuredClone,
    CustomEvent: MiniCustomEvent,
    Event: MiniEvent,
    EventTarget: MiniEventTarget,
    Date: clock.Date,
    Math: createDeterministicMath(options.randomSeed),
    console: options.console || console,
    crypto: globalThis.crypto || { randomUUID: () => `uuid-${clock.now()}` },
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    Blob,
    File: globalThis.File,
    performance: { now: () => 0 }
  });

  const contextObject = {
    window,
    document,
    localStorage: storage,
    sessionStorage: window.sessionStorage,
    APP_DATA: window.APP_DATA,
    WS_APP: window.WS_APP,
    TerminalNotifications: window.TerminalNotifications,
    CustomEvent: MiniCustomEvent,
    Event: MiniEvent,
    EventTarget: MiniEventTarget,
    structuredClone,
    console: window.console,
    Date: clock.Date,
    Math: window.Math,
    crypto: window.crypto,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    Blob,
    File: globalThis.File,
    performance: window.performance,
    setTimeout: window.setTimeout,
    clearTimeout: window.clearTimeout,
    setInterval: window.setInterval,
    clearInterval: window.clearInterval,
    queueMicrotask
  };
  contextObject.globalThis = contextObject;
  contextObject.self = window;
  const context = vm.createContext(contextObject);

  function load(relativePath) {
    const absolutePath = path.resolve(PROJECT_ROOT, relativePath);
    if (!absolutePath.startsWith(PROJECT_ROOT + path.sep)) throw new Error(`Path escapes project root: ${relativePath}`);
    const source = fs.readFileSync(absolutePath, "utf8");
    vm.runInContext(source, context, { filename: relativePath });
    return window;
  }

  function loadMany(relativePaths = []) {
    relativePaths.forEach(load);
    return window;
  }

  function runPendingTimers(limit = 100) {
    let executions = 0;
    while (pendingTimers.size && executions < limit) {
      const [id, callback] = pendingTimers.entries().next().value;
      pendingTimers.delete(id);
      callback();
      executions += 1;
    }
    if (pendingTimers.size) throw new Error(`Pending timer limit exceeded: ${pendingTimers.size}`);
    return executions;
  }

  return { window, document, storage, context, clock, load, loadMany, runPendingTimers, projectRoot: PROJECT_ROOT };
}

module.exports = {
  PROJECT_ROOT,
  MiniEventTarget,
  MiniEvent,
  MiniCustomEvent,
  createBrowserRuntime
};
