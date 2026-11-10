// Lookup and matching helpers over LP_INDEX.

import { LP_INDEX } from "./lpIndex.js";

export const GLOBAL_ENTRIES = Object.freeze(
  LP_INDEX.filter((item) => item.receiver === null),
);

export const METHODS_BY_RECEIVER = Object.freeze(
  LP_INDEX.reduce((map, item) => {
    if (item.receiver === null) return map;
    if (!map.has(item.receiver)) map.set(item.receiver, []);
    map.get(item.receiver).push(item);
    return map;
  }, new Map()),
);

const BY_NAME = new Map();
const BY_ALIAS = new Map();

for (const item of LP_INDEX) {
  if (item.receiver !== null) continue;
  if (!BY_NAME.has(item.name)) BY_NAME.set(item.name, item);
  for (const name of [...item.alias.en, ...item.alias.pt]) {
    if (!BY_ALIAS.has(name)) BY_ALIAS.set(name, item);
  }
}

/** Lowercase and strip diacritics, so "transpor" matches "transpôr". */
export function normalize(text) {
  return String(text)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Canonical name plus every alias, in a stable order. */
export function namesOf(item) {
  return [item.name, ...item.alias.en, ...item.alias.pt];
}

export function byName(name) {
  return BY_NAME.get(name) ?? null;
}

export function byAlias(name) {
  return BY_ALIAS.get(name) ?? null;
}

/** Resolve either a canonical name or an alias to its entry. */
export function resolveGlobal(name) {
  return byName(name) ?? byAlias(name);
}

export function methodsFor(receiver) {
  return METHODS_BY_RECEIVER.get(receiver) ?? [];
}

/** Resolve a method by receiver and canonical name or alias. */
export function resolveMethod(receiver, name) {
  const methods = methodsFor(receiver);
  return (
    methods.find((item) => namesOf(item).includes(name)) ??
    methods.find((item) =>
      namesOf(item).some((n) => normalize(n) === normalize(name)),
    ) ??
    null
  );
}

/** Whether a typed prefix matches the entry's name or any alias. */
export function matches(item, prefix) {
  if (!prefix) return true;
  const needle = normalize(prefix);
  return namesOf(item).some((name) => normalize(name).startsWith(needle));
}

/**
 * Rank a match: exact name, name prefix, English alias, Portuguese alias,
 * then anything else. Used to keep the completion list predictable.
 */
export function rankFor(item, typed) {
  const needle = normalize(typed);
  const name = normalize(item.name);
  if (name === needle) return 0;
  if (name.startsWith(needle)) return 1;
  if (item.alias.en.some((alias) => normalize(alias).startsWith(needle)))
    return 2;
  if (item.alias.pt.some((alias) => normalize(alias).startsWith(needle)))
    return 3;
  return 4;
}

/** Global entries whose name or alias starts with the typed prefix. */
export function candidates(prefix = "") {
  const needle = normalize(prefix);
  return GLOBAL_ENTRIES.filter((item) =>
    namesOf(item).some((name) => normalize(name).startsWith(needle)),
  );
}

const PT_ONLY = new Set();
const EN_ONLY = new Set();
{
  const canonical = new Set(GLOBAL_ENTRIES.map((item) => item.name));
  const ptAliases = new Set();
  const enAliases = new Set();
  for (const item of GLOBAL_ENTRIES) {
    for (const name of item.alias.pt) {
      const key = normalize(name);
      if (!canonical.has(name)) ptAliases.add(key);
    }
    for (const name of item.alias.en) enAliases.add(normalize(name));
  }
  for (const key of ptAliases) if (!enAliases.has(key)) PT_ONLY.add(key);
  for (const name of canonical) {
    const key = normalize(name);
    if (!ptAliases.has(key) && !enAliases.has(key)) EN_ONLY.add(key);
  }
}

/**
 * Guess whether a document is written in Portuguese or English.
 * Accented Portuguese names count double, since they are unambiguous.
 */
export function detectLanguage(text) {
  const tokens = String(text).match(/[\p{L}_][\p{L}\p{N}_]*/gu) ?? [];
  let score = 0;
  for (const token of tokens) {
    const key = normalize(token);
    if (PT_ONLY.has(key)) score += key !== token.toLowerCase() ? 2 : 1;
    else if (EN_ONLY.has(key)) score -= 1;
  }
  return score > 0 ? "pt" : "en";
}

/**
 * Choose the label to show for a completion.
 *
 * 1. An exact raw prefix match on a Portuguese alias wins, so typing "transpô"
 *    keeps the accented name.
 * 2. If the canonical name matches, use it (English is the default).
 * 3. Otherwise fall back to the first matching alias.
 * 4. With no typed prefix, use the document language.
 */
export function pickLabel(item, typedPrefix = "", language = "en") {
  const raw = String(typedPrefix).toLowerCase();

  if (raw) {
    const ptMatch = item.alias.pt.find((name) =>
      name.toLowerCase().startsWith(raw),
    );
    if (ptMatch && !item.name.toLowerCase().startsWith(raw)) return ptMatch;

    if (normalize(item.name).startsWith(normalize(raw))) return item.name;

    const alias = [...item.alias.en, ...item.alias.pt].find((name) =>
      normalize(name).startsWith(normalize(raw)),
    );
    if (alias) return alias;

    return item.name;
  }

  if (language === "pt") return item.alias.pt[0] ?? item.name;
  return item.name;
}
