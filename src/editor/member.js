// Member completion: what appears after a dot.
//
// Everything here is pure text in, plain data out, so it can be tested
// without CodeMirror. The editor adapter only adds string/comment detection
// and the runtime check for user-created instruments.

import {
  matches,
  methodsFor,
  pickLabel,
  rankFor,
  resolveGlobal,
} from "./lpIndex.query.js";

const MEMBER = /([\p{L}_$][\p{L}\p{N}_$]*)[^\S\n]*\.[^\S\n]*([\p{L}\p{N}_]*)$/u;

const NAMESPACE_TYPES = new Set([
  "sequencer",
  "eventList",
  "sample",
  "midiRecorder",
]);

/**
 * Read the member access around the cursor.
 *
 * "guitar.rev" at the end -> receiverName "guitar", prefix "rev", from 7,
 * so accepting a completion replaces only "rev".
 */
export function readMemberContext(text, pos) {
  const before = text.slice(Math.max(0, pos - 300), pos);
  const match = before.match(MEMBER);
  if (!match) return null;
  return {
    receiverName: match[1],
    prefix: match[2],
    from: pos - match[2].length,
  };
}

/** Map a global name (canonical or alias) to a method receiver. */
export function receiverTypeOf(name) {
  const item = resolveGlobal(name);
  if (!item) return null;
  if (item.kind === "instrument") return "Instrument";
  if (item.kind === "namespace" && NAMESPACE_TYPES.has(item.name)) {
    return item.name;
  }
  return null;
}

/** Completion options for a receiver, already labelled and ranked. */
export function methodOptions(receiver, prefix = "", language = "en") {
  return methodsFor(receiver)
    .filter((item) => matches(item, prefix))
    .map((item) => {
      const label = pickLabel(item, prefix, language);
      return {
        rank: rankFor(item, prefix),
        label,
        option: {
          label,
          type: "method",
          detail: item.signature ?? "",
          info: item.summary || undefined,
          apply: label,
        },
      };
    })
    .sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label))
    .map((item) => item.option);
}
