import { describe, it, expect } from "vitest";
import { scaffoldArgs } from "../src/agent/ghost.js";
import { methodsFor, resolveGlobal } from "../src/agent/lpIndex.query.js";

const paramsOf = (name) => resolveGlobal(name).params;
const methodOf = (receiver, name) =>
  methodsFor(receiver).find((item) => item.name === name);

describe("scaffoldArgs", () => {
  it("fills the optional arguments after the supplied ones", () => {
    expect(scaffoldArgs(paramsOf("arpeggio"), 2)).toBe('1, "backAndForth"');
  });

  it("stops at a required argument", () => {
    expect(scaffoldArgs(paramsOf("arpeggio"), 1)).toBe(null);
    expect(scaffoldArgs(paramsOf("blockChord"), 1)).toBe(null);
  });

  it("fills defaults before an optional tail", () => {
    expect(scaffoldArgs(paramsOf("ostinato"), 1)).toBe("1");
    expect(scaffoldArgs(paramsOf("euclidean"), 1)).toBe("1");
  });

  it("does not skip an optional argument to reach later ones", () => {
    expect(scaffoldArgs(paramsOf("ostinato"), 2)).toBe(null);
    expect(scaffoldArgs(paramsOf("rotationSequence"), 1)).toBe(null);
  });

  it("formats event defaults as source", () => {
    expect(scaffoldArgs(paramsOf("ostinato"), 0)).toBe("any, 1");
    expect(scaffoldArgs(paramsOf("rotationSequence"), 0)).toBe("any");
  });

  it("only stops early when every remaining parameter can be omitted", () => {
    expect(
      scaffoldArgs([
        { name: "a", type: "number", default: 1 },
        { name: "b", type: "number", optional: true },
      ]),
    ).toBe("1");
    expect(
      scaffoldArgs([
        { name: "a", type: "number", default: 1 },
        { name: "b", type: "number", optional: true },
        { name: "c", type: "number", default: 2 },
      ]),
    ).toBe("1");
    expect(
      scaffoldArgs([
        { name: "a", type: "number", default: 1 },
        { name: "b", type: "number", optional: true },
        { name: "c", type: "number" },
      ]),
    ).toBe(null);
  });

  it("keeps quiet when the filled defaults carry no information", () => {
    expect(
      scaffoldArgs([
        { name: "a", type: "number", default: 0 },
        { name: "b", type: "number", optional: true },
      ]),
    ).toBe(null);
  });

  it("fills a single ranged parameter with its midpoint", () => {
    expect(scaffoldArgs(methodOf("Instrument", "reverb").params, 0)).toBe(
      "0.5",
    );
    expect(scaffoldArgs(methodOf("Instrument", "delay").params, 1)).toBe("0.5");
  });

  it("leaves several ranged parameters alone", () => {
    expect(scaffoldArgs(methodOf("Instrument", "tremolo").params, 0)).toBe(
      null,
    );
  });

  it("skips defaults that carry no information", () => {
    expect(scaffoldArgs(paramsOf("transpose"), 0)).toBe(null);
  });

  it("formats numbers, strings, function references and arrays", () => {
    expect(scaffoldArgs(paramsOf("randomChord"), 0)).toBe("4, midPitch, false");
    expect(scaffoldArgs(paramsOf("randomRhythm"), 0)).toBe("4, midDur");
    expect(scaffoldArgs(paramsOf("rotate"), 1)).toBe("1");
    expect(scaffoldArgs(paramsOf("midiProgram"), 1)).toBe("1");
  });

  it("uses the corrected interval sequence defaults", () => {
    expect(scaffoldArgs(paramsOf("intervalSequence"), 2)).toBe("5");
    expect(scaffoldArgs(paramsOf("intervalSequence"), 3)).toBe(null);
  });

  it("refuses sentinel defaults that are not valid source", () => {
    expect(
      scaffoldArgs([{ name: "amount", type: "number", default: "instrument" }]),
    ).toBe(null);
  });

  it("formats synthetic defaults", () => {
    const params = [
      { name: "direction", type: "string", default: "forward" },
      { name: "pitches", type: "number[]", default: [60, 64] },
      { name: "on", type: "boolean", default: true },
    ];
    expect(scaffoldArgs(params)).toBe('"forward", [60,64], true');
  });

  it("handles a single synthetic range", () => {
    expect(
      scaffoldArgs([{ name: "amount", type: "number", range: [0, 2] }]),
    ).toBe("1");
  });

  it("does nothing without parameters or past the end", () => {
    expect(scaffoldArgs([])).toBe(null);
    expect(scaffoldArgs(undefined)).toBe(null);
    expect(scaffoldArgs(paramsOf("rotate"), 2)).toBe(null);
  });

  it("does not silently drop an unformattable default", () => {
    expect(
      scaffoldArgs([
        { name: "loud", type: "number", default: "instrument" },
        { name: "when", type: "number", default: 0 },
      ]),
    ).toBe(null);
  });
});
