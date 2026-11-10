// Argument scaffolding for ghost text.
//
// Pure data in, one string out. The editor adapter decides where the cursor
// is; this module decides what the remaining arguments should look like.

function formatDefault(param) {
  const value = param.default;
  if (value === undefined) return null;

  if (typeof value === "string") {
    if (param.type === "function") return value;
    if (param.type === "string") return JSON.stringify(value);
    if (param.type === "event") return value;
    return null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) return JSON.stringify(value);
  return null;
}

function isEmptyDefault(value) {
  return (
    value === 0 ||
    value === false ||
    value === "" ||
    value === null ||
    value === undefined ||
    (Array.isArray(value) && value.length === 0)
  );
}

function isRange(param) {
  return (
    Array.isArray(param.range) &&
    param.range.length === 2 &&
    param.range.every((value) => Number.isFinite(value))
  );
}

function canOmit(param) {
  return param.optional === true || param.default !== undefined;
}

/**
 * Build the ghost text for the arguments that follow `startIndex`.
 *
 * Fills the leading parameters that have defaults. It stops early when every
 * remaining parameter can be omitted, so accepting the suggestion always
 * produces a valid call. A single remaining parameter with a range is filled
 * with the midpoint (reverb() -> 0.5).
 */
export function scaffoldArgs(params, startIndex = 0) {
  if (!Array.isArray(params)) return null;
  const remaining = params.slice(startIndex);
  if (!remaining.length) return null;

  if (remaining.length === 1) {
    const [param] = remaining;
    if (param.default === undefined && isRange(param)) {
      const [min, max] = param.range;
      return String(Math.round(((min + max) / 2) * 100) / 100);
    }
  }

  const parts = [];
  const values = [];

  for (let index = 0; index < remaining.length; index++) {
    const param = remaining[index];
    const text = formatDefault(param);
    if (text !== null) {
      parts.push(text);
      values.push(param.default);
      continue;
    }

    if (!remaining.slice(index).every(canOmit)) return null;
    break;
  }

  if (!parts.length || values.every(isEmptyDefault)) return null;
  return parts.join(", ");
}
