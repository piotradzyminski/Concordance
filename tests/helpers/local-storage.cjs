"use strict";

class MemoryStorage {
  constructor(seed = {}) {
    this._data = new Map();
    Object.entries(seed || {}).forEach(([key, value]) => this.setItem(key, value));
  }

  get length() {
    return this._data.size;
  }

  key(index) {
    return [...this._data.keys()][index] ?? null;
  }

  getItem(key) {
    const normalized = String(key);
    return this._data.has(normalized) ? this._data.get(normalized) : null;
  }

  setItem(key, value) {
    this._data.set(String(key), String(value));
  }

  removeItem(key) {
    this._data.delete(String(key));
  }

  clear() {
    this._data.clear();
  }

  snapshot() {
    return Object.fromEntries([...this._data.entries()].sort(([left], [right]) => left.localeCompare(right)));
  }
}

module.exports = { MemoryStorage };
