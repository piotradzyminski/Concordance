"use strict";

function createDeterministicMath(seed = 123456789) {
  let state = Number(seed) >>> 0;
  const math = Object.create(Math);
  math.random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  return math;
}

function createDeterministicDate(initialIso = "2109-02-13T12:00:00.000Z") {
  let now = Date.parse(initialIso);
  if (!Number.isFinite(now)) throw new Error(`Invalid deterministic date: ${initialIso}`);

  class DeterministicDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [now]));
    }

    static now() {
      return now;
    }
  }

  DeterministicDate.parse = Date.parse;
  DeterministicDate.UTC = Date.UTC;

  return {
    Date: DeterministicDate,
    now: () => now,
    set(iso) {
      const next = Date.parse(iso);
      if (!Number.isFinite(next)) throw new Error(`Invalid deterministic date: ${iso}`);
      now = next;
    },
    advance(milliseconds) {
      now += Number(milliseconds) || 0;
      return now;
    }
  };
}

module.exports = { createDeterministicMath, createDeterministicDate };
