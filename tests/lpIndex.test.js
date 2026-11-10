import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, it, expect, beforeAll } from "vitest";
import { LP_INDEX, NOTE_FAMILY } from "../src/agent/lpIndex.js";
import { namesOf } from "../src/agent/lpIndex.query.js";

const here = dirname(fileURLToPath(import.meta.url));
const constantsSource = readFileSync(
  resolve(here, "../src/core/litePlay.constants.js"),
  "utf8",
);

// Names the index deliberately does not describe: engine plumbing and
// internal state. Anything not listed here must be documented.
const INTERNAL_EXPORTS = [
  "startEngine",
  "dictionaryToArray",
  "csound",
  "audio_context",
];

const INTERNAL = {
  Instrument: ["what", "score", "event"],
  Sampler: [],
  sequencer: [
    "clickOn",
    "seqList",
    "idcnt",
    "time",
    "callbacks",
    "click",
    "sequence",
  ],
  eventList: ["events", "maxdur"],
  sample: ["number", "fo", "bpm", "instr"],
  midiRecorder: [
    "_clockRef",
    "_events",
    "_log",
    "_logTempo",
    "_stopClockRef",
    "_tempoEvents",
    "recording",
  ],
};

let litePlay;
let extra;

beforeAll(async () => {
  globalThis.window = {};
  globalThis.quarterTone = 0.5;
  globalThis.thirdTone = 0.3333333333333333;
  globalThis.eighthTone = 0.25;
  globalThis.tenCent = 0.1;
  globalThis.oneCent = 0.01;
  globalThis.rnd = (min, max) => Math.random() * (max - min) + min;
  globalThis.rndInt = (min, max) =>
    Math.floor(
      Math.random() * (Math.floor(max) - Math.ceil(min)) + Math.ceil(min),
    );
  globalThis.choose = (...options) => {
    if (options.length === 1 && Array.isArray(options[0])) options = options[0];
    return options[Math.floor(Math.random() * options.length)];
  };
  globalThis.C4 = 60;
  globalThis.midPitch = () => globalThis.rndInt(48, 72);
  globalThis.eventList = {
    events: [],
    create: (...events) => ({ events }),
    add() {},
    insert() {},
    clear() {},
    remove() {},
  };

  litePlay = await import("../src/core/litePlay.js");
  extra = await import("../src/core/extra.js");
});

function autocompleteNames() {
  const block = constantsSource.match(
    /window\.lpAutocomplete\s*=\s*\{([\s\S]*?)\n\};/,
  );
  if (!block) throw new Error("window.lpAutocomplete block not found");
  return [...block[1].matchAll(/(?:^|\n)\s*([\p{L}\p{N}_]+)\s*,/gu)].map(
    (match) => match[1],
  );
}

function entriesFor(receiver) {
  return LP_INDEX.filter((item) => item.receiver === receiver);
}

function covers(entry, name) {
  return namesOf(entry).includes(name);
}

function isCovered(receiver, name) {
  return entriesFor(receiver).some((entry) => covers(entry, name));
}

describe("LP_INDEX shape", () => {
  it("uses known kinds and receivers", () => {
    const kinds = new Set([
      "function",
      "class",
      "method",
      "namespace",
      "instrument",
      "constant",
      "family",
    ]);
    for (const item of LP_INDEX) {
      expect(kinds.has(item.kind), `${item.name}: ${item.kind}`).toBe(true);
      expect(typeof item.name).toBe("string");
      expect(item.name.length).toBeGreaterThan(0);
    }
  });

  it("gives every callable a signature and every entry clean aliases", () => {
    for (const item of LP_INDEX) {
      if (item.kind === "function" || item.kind === "method") {
        expect(item.signature, `${item.name} has no signature`).toBeTruthy();
        expect(item.signature).toContain("(");
      }
      expect(Array.isArray(item.alias.en)).toBe(true);
      expect(Array.isArray(item.alias.pt)).toBe(true);
      for (const name of [...item.alias.en, ...item.alias.pt]) {
        expect(typeof name).toBe("string");
        expect(name).not.toBe(item.name);
      }
      if (item.example !== null) expect(typeof item.example).toBe("string");
    }
  });

  it("has no duplicate canonical names within a receiver", () => {
    const seen = new Map();
    for (const item of LP_INDEX) {
      const scope = item.receiver ?? "<global>";
      const key = `${scope}:${item.name}`;
      expect(seen.has(key), `${key} is defined twice`).toBe(false);
      seen.set(key, item);
    }
  });

  it("has no ambiguous aliases within a receiver", () => {
    const seen = new Map();
    for (const item of LP_INDEX) {
      const scope = item.receiver ?? "<global>";
      for (const name of [...item.alias.en, ...item.alias.pt]) {
        const key = `${scope}:${name}`;
        expect(
          seen.has(key),
          `${name} is an alias of both ${seen.get(key)?.name} and ${item.name}`,
        ).toBe(false);
        seen.set(key, item);
      }
    }
  });

  it("references real receivers for every method", () => {
    const receivers = new Set([
      "Instrument",
      "Sampler",
      "sequencer",
      "eventList",
      "sample",
      "midiRecorder",
    ]);
    for (const item of LP_INDEX) {
      if (item.kind !== "method") continue;
      expect(
        receivers.has(item.receiver),
        `${item.name} -> ${item.receiver}`,
      ).toBe(true);
    }
  });
});

describe("coverage of module exports", () => {
  it("documents every export of litePlay.js and extra.js", () => {
    const missing = [];
    for (const name of [...Object.keys(litePlay), ...Object.keys(extra)]) {
      if (INTERNAL_EXPORTS.includes(name)) continue;
      const item = LP_INDEX.find(
        (entry) => entry.receiver === null && covers(entry, name),
      );
      if (!item) missing.push(name);
    }
    expect(missing).toEqual([]);
  });

  it("does not document exports that no longer exist", () => {
    const known = new Set([...Object.keys(litePlay), ...Object.keys(extra)]);
    const autocomplete = new Set(autocompleteNames());
    const missing = [];
    for (const item of LP_INDEX) {
      if (item.receiver !== null || item.kind === "family") continue;
      if (known.has(item.name) || autocomplete.has(item.name)) continue;
      missing.push(item.name);
    }
    expect(missing).toEqual([]);
  });
});

describe("coverage of constants", () => {
  const names = autocompleteNames();

  it("finds the constants block", () => {
    expect(names.length).toBeGreaterThan(200);
  });

  it("documents every autocomplete constant", () => {
    const missing = [];
    for (const name of names) {
      if (NOTE_FAMILY.pattern.test(name)) continue;
      const item = LP_INDEX.find(
        (entry) => entry.receiver === null && covers(entry, name),
      );
      if (!item) missing.push(name);
    }
    expect(missing).toEqual([]);
  });

  it("note family matches note names and nothing else", () => {
    for (const name of names) {
      if (/^[A-G]/.test(name) && !/^[A-G](s|b)?m?\d+$/.test(name)) {
        expect(NOTE_FAMILY.pattern.test(name), name).toBe(false);
      }
    }
    expect(NOTE_FAMILY.pattern.test("C4")).toBe(true);
    expect(NOTE_FAMILY.pattern.test("Csm1")).toBe(true);
    expect(NOTE_FAMILY.pattern.test("Bb7")).toBe(true);
    expect(NOTE_FAMILY.pattern.test("kick")).toBe(false);
  });
});

describe("coverage of methods", () => {
  it("documents every Instrument prototype member", () => {
    const missing = Object.getOwnPropertyNames(litePlay.Instrument.prototype)
      .filter((name) => name !== "constructor")
      .filter((name) => !INTERNAL.Instrument.includes(name))
      .filter((name) => !isCovered("Instrument", name));
    expect(missing).toEqual([]);
  });

  it("documents every Sampler prototype member", () => {
    const missing = Object.getOwnPropertyNames(litePlay.Sampler.prototype)
      .filter((name) => name !== "constructor")
      .filter((name) => !INTERNAL.Sampler.includes(name))
      .filter((name) => !isCovered("Sampler", name));
    expect(missing).toEqual([]);
  });

  it("documents every public namespace member", () => {
    const namespaces = {
      sequencer: litePlay.sequencer,
      eventList: litePlay.eventList,
      sample: litePlay.sample,
      midiRecorder: litePlay.midiRecorder,
    };
    const missing = [];
    for (const [receiver, value] of Object.entries(namespaces)) {
      for (const name of Object.keys(value)) {
        if (INTERNAL[receiver].includes(name)) continue;
        if (!isCovered(receiver, name)) missing.push(`${receiver}.${name}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("does not document methods that no longer exist", () => {
    const sources = {
      Instrument: litePlay.Instrument.prototype,
      Sampler: litePlay.Sampler.prototype,
      sequencer: litePlay.sequencer,
      eventList: litePlay.eventList,
      sample: litePlay.sample,
      midiRecorder: litePlay.midiRecorder,
    };
    const missing = [];
    for (const item of LP_INDEX) {
      if (item.kind !== "method") continue;
      const source = sources[item.receiver];
      const found = namesOf(item).some((name) => name in source);
      if (!found) missing.push(`${item.receiver}.${item.name}`);
    }
    expect(missing).toEqual([]);
  });

  it("never documents an internal member", () => {
    const conflicts = [];
    for (const item of LP_INDEX) {
      if (item.kind !== "method") continue;
      for (const name of namesOf(item)) {
        if (INTERNAL[item.receiver]?.includes(name)) {
          conflicts.push(`${item.receiver}.${name}`);
        }
      }
    }
    expect(conflicts).toEqual([]);
  });
});
