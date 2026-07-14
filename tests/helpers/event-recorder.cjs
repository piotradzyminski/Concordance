"use strict";

function recordEvents(target, eventNames = []) {
  const records = [];
  const listeners = [];
  for (const eventName of eventNames) {
    const listener = (event) => records.push({ type: event.type, detail: structuredClone(event.detail) });
    target.addEventListener(eventName, listener);
    listeners.push([eventName, listener]);
  }
  return {
    records,
    clear() { records.splice(0, records.length); },
    stop() { listeners.forEach(([eventName, listener]) => target.removeEventListener(eventName, listener)); }
  };
}

module.exports = { recordEvents };
