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

/**
 * Build the ghost text for the arguments that follow `startIndex`.
 *
 * Fills only when every remaining parameter has a default and at least one
 * of those defaults carries information (so transpose() stays quiet), or
 * when a single remaining parameter has a range (reverb() -> 0.5).
 */
export function scaffoldArgs(params, startIndex = 0) {
  if (!Array.isArray(params)) return null;
  const remaining = params.slice(startIndex);
  if (!remaining.length) return null;

  if (remaining.every((param) => param.default !== undefined)) {
    if (remaining.every((param) => isEmptyDefault(param.default))) return null;
    const parts = remaining.map(formatDefault);
    if (parts.some((part) => part === null)) return null;
    return parts.join(", ");
  }

  if (remaining.length === 1) {
    const [param] = remaining;
    if (
      param.default === undefined &&
      Array.isArray(param.range) &&
      param.range.length === 2 &&
      param.range.every((value) => Number.isFinite(value))
    ) {
      const [min, max] = param.range;
      return String(Math.round(((min + max) / 2) * 100) / 100);
    }
  }

  return null;
}
