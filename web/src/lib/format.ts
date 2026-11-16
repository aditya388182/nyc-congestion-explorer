const MINUS = "−";

/** Signed percent with a real minus sign, e.g. "−9.9%". */
export function fmtPct(v: number, digits = 1): string {
  const s = Math.abs(v).toFixed(digits);
  return `${v < 0 ? MINUS : v > 0 ? "+" : ""}${s}%`;
}

export function fmtNum(v: number): string {
  return new Intl.NumberFormat("en-US").format(v);
}

/** p-values: small ones in scientific notation, never rounded to "0". */
export function fmtP(p: number): string {
  if (p === 0) return "< 1e-300";
  return p < 0.001 ? p.toExponential(1) : p.toFixed(3);
}

export function fmtMs(ms: number): string {
  return ms < 1 ? `${ms.toFixed(2)} ms` : `${ms.toFixed(1)} ms`;
}
