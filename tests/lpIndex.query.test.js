import { describe, it, expect } from "vitest";
import {
  GLOBAL_ENTRIES,
  METHODS_BY_RECEIVER,
  byAlias,
  byName,
  candidates,
  detectLanguage,
  matches,
  methodsFor,
  namesOf,
  normalize,
  pickLabel,
  resolveGlobal,
  resolveMethod,
} from "../src/editor/lpIndex.query.js";

describe("normalize", () => {
  it("strips diacritics and lowercases", () => {
    expect(normalize("transpôr")).toBe("transpor");
    expect(normalize("PAN AUTOMÁTICO")).toBe("pan automatico");
    expect(normalize("C4")).toBe("c4");
  });
});

describe("lookup", () => {
  it("resolves canonical names", () => {
    expect(byName("transpose").name).toBe("transpose");
    expect(byName("piano").name).toBe("piano");
  });

  it("resolves aliases to their canonical entry", () => {
    expect(byAlias("transpôr")).toBe(byName("transpose"));
    expect(resolveGlobal("violão")).toBe(byName("guitar"));
    expect(resolveGlobal("toque")).toBe(byName("play"));
  });

  it("returns null for unknown names", () => {
    expect(resolveGlobal("noSuchThing")).toBe(null);
  });

  it("keeps globals and methods in separate scopes", () => {
    expect(byName("play").receiver).toBe(null);
    expect(resolveMethod("Instrument", "play").receiver).toBe("Instrument");
    expect(resolveMethod("Instrument", "toque").name).toBe("play");
  });

  it("groups methods by receiver", () => {
    expect(methodsFor("Instrument").length).toBeGreaterThan(15);
    expect(methodsFor("eventList").length).toBe(8);
    expect(METHODS_BY_RECEIVER.get("sample").length).toBe(7);
    expect(resolveMethod("Instrument", "panAutomático").name).toBe("autoPan");
  });
});

describe("matching", () => {
  it("matches aliases without diacritics", () => {
    const transpose = byName("transpose");
    expect(matches(transpose, "transpô")).toBe(true);
    expect(matches(transpose, "transpor")).toBe(true);
    expect(matches(transpose, "xyz")).toBe(false);
  });

  it("finds candidates by name and alias", () => {
    expect(candidates("transp").map((item) => item.name)).toContain(
      "transpose",
    );
    expect(candidates("viol").map((item) => item.name)).toContain("guitar");
  });

  it("returns every global for an empty prefix", () => {
    expect(candidates("").length).toBe(GLOBAL_ENTRIES.length);
  });
});

describe("detectLanguage", () => {
  it("defaults to English", () => {
    expect(detectLanguage("")).toBe("en");
    expect(detectLanguage("play(C4, E4, G4);")).toBe("en");
    expect(detectLanguage("guitar.play(E3);")).toBe("en");
  });

  it("detects Portuguese aliases", () => {
    expect(detectLanguage("play(C4); transpôr([C4], 2);")).toBe("pt");
    expect(detectLanguage("violão.play(E3);\ninstrumento(violão);")).toBe("pt");
  });

  it("counts accented names double", () => {
    expect(detectLanguage("transpose transpôr")).toBe("pt");
  });

  it("breaks ties towards English", () => {
    expect(detectLanguage("piano guitar violão")).toBe("en");
  });
});

describe("pickLabel", () => {
  const transpose = byName("transpose");
  const play = byName("play");
  const kick = resolveGlobal("kick");

  it("keeps the language the user started typing", () => {
    expect(pickLabel(transpose, "transpô", "en")).toBe("transpôr");
    expect(pickLabel(transpose, "tra", "pt")).toBe("transpose");
    expect(pickLabel(play, "toq", "en")).toBe("toque");
  });

  it("uses the document language when there is no prefix", () => {
    expect(pickLabel(transpose, "", "pt")).toBe("transpôr");
    expect(pickLabel(transpose, "", "en")).toBe("transpose");
    expect(pickLabel(play, "", "pt")).toBe("toque");
    expect(pickLabel(play, "", "en")).toBe("play");
  });

  it("falls back to the canonical name when there is no translation", () => {
    expect(pickLabel(byName("edo"), "", "pt")).toBe("edo");
    expect(pickLabel(byName("reset"), "", "pt")).toBe("reset");
  });

  it("labels translated constants in Portuguese", () => {
    expect(pickLabel(kick, "", "pt")).toBe("bumbo");
    expect(pickLabel(kick, "", "en")).toBe("kick");
  });

  it("never returns an alias that does not belong to the entry", () => {
    for (const item of GLOBAL_ENTRIES) {
      for (const language of ["en", "pt"]) {
        expect(namesOf(item)).toContain(pickLabel(item, "", language));
      }
    }
  });
});
