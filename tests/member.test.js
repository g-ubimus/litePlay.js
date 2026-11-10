import { describe, it, expect } from "vitest";
import {
  methodOptions,
  readMemberContext,
  receiverTypeOf,
} from "../src/agent/member.js";

function at(text) {
  return readMemberContext(text, text.length);
}

describe("readMemberContext", () => {
  it("reads a receiver and prefix", () => {
    expect(at("guitar.rev")).toEqual({
      receiverName: "guitar",
      prefix: "rev",
      from: 7,
    });
  });

  it("reads an empty prefix right after the dot", () => {
    expect(at("guitar.")).toEqual({
      receiverName: "guitar",
      prefix: "",
      from: 7,
    });
  });

  it("tolerates spaces around the dot", () => {
    expect(at("guitar . rev")).toEqual({
      receiverName: "guitar",
      prefix: "rev",
      from: 9,
    });
  });

  it("handles accented receivers", () => {
    expect(at("violão.rev")).toEqual({
      receiverName: "violão",
      prefix: "rev",
      from: 7,
    });
  });

  it("uses the last member of a chain", () => {
    expect(at("a.b.c")).toEqual({
      receiverName: "b",
      prefix: "c",
      from: 4,
    });
  });

  it("ignores members of call results", () => {
    const text = "let x = arpeggio(any, chord).play";
    expect(at(text)).toBe(null);
  });

  it("returns null outside a member access", () => {
    expect(at("play(C4")).toBe(null);
    expect(at("guitar")).toBe(null);
    expect(at("")).toBe(null);
  });

  it("does not reach across a newline", () => {
    expect(at("guitar\n.")).toBe(null);
  });
});

describe("receiverTypeOf", () => {
  it("maps instruments, including aliases", () => {
    expect(receiverTypeOf("guitar")).toBe("Instrument");
    expect(receiverTypeOf("piano")).toBe("Instrument");
    expect(receiverTypeOf("violão")).toBe("Instrument");
  });

  it("maps namespaces, including Portuguese aliases", () => {
    expect(receiverTypeOf("eventList")).toBe("eventList");
    expect(receiverTypeOf("listaEventos")).toBe("eventList");
    expect(receiverTypeOf("sequencer")).toBe("sequencer");
    expect(receiverTypeOf("sequenciador")).toBe("sequencer");
    expect(receiverTypeOf("sample")).toBe("sample");
    expect(receiverTypeOf("amostra")).toBe("sample");
    expect(receiverTypeOf("midiRecorder")).toBe("midiRecorder");
  });

  it("returns null for non-receivers", () => {
    expect(receiverTypeOf("play")).toBe(null);
    expect(receiverTypeOf("C4")).toBe(null);
    expect(receiverTypeOf("console")).toBe(null);
    expect(receiverTypeOf("unknownThing")).toBe(null);
  });
});

describe("methodOptions", () => {
  it("lists every Instrument method for an empty prefix", () => {
    const options = methodOptions("Instrument");
    expect(options).toHaveLength(17);
    expect(options.map((option) => option.label)).toContain("reverb");
    expect(options.map((option) => option.label)).not.toContain("toque");
    expect(
      methodOptions("Instrument", "", "pt").map((option) => option.label),
    ).toContain("toque");
  });

  it("filters by prefix", () => {
    const labels = methodOptions("Instrument", "rev").map((o) => o.label);
    expect(labels[0]).toBe("reverb");
    expect(labels).not.toContain("play");
  });

  it("resolves Portuguese aliases while typing", () => {
    expect(methodOptions("Instrument", "toq", "en")[0].label).toBe("toque");
    expect(methodOptions("eventList", "", "pt").map((o) => o.label)).toContain(
      "repetir",
    );
    expect(methodOptions("eventList", "rep", "pt")[0].label).toBe("repeat");
  });

  it("uses English labels by default", () => {
    expect(methodOptions("eventList").map((o) => o.label)).toContain("repeat");
  });

  it("produces completion-shaped options", () => {
    const [option] = methodOptions("Instrument", "reverb");
    expect(option).toMatchObject({
      label: "reverb",
      type: "method",
      detail: "reverb(amount)",
      apply: "reverb",
    });
    expect(option.info).toContain("Reverb");
  });

  it("returns nothing for an unknown receiver", () => {
    expect(methodOptions("console")).toEqual([]);
  });
});
