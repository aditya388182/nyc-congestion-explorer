/** Diverging colour scale for "% change in trips" (colour-blind safe brown to teal). */
export const CHANGE_DOMAIN = 30; // percent at which the colours saturate
export const NO_DATA_COLOR = "#d9d9d9";

type Rgb = readonly [number, number, number];
const NEGATIVE: Rgb = [140, 81, 10];
const NEUTRAL: Rgb = [245, 245, 245];
const POSITIVE: Rgb = [1, 102, 94];

const hex = (n: number): string => Math.round(n).toString(16).padStart(2, "0");
const mix = (a: Rgb, b: Rgb, t: number): string =>
  `#${hex(a[0] + (b[0] - a[0]) * t)}${hex(a[1] + (b[1] - a[1]) * t)}${hex(a[2] + (b[2] - a[2]) * t)}`;

/** Map a percent change to a colour: negative to brown, zero to light grey, positive to teal. */
export function changeToColor(pct: number | null | undefined, domain: number = CHANGE_DOMAIN): string {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return NO_DATA_COLOR;
  const t = Math.max(-1, Math.min(1, pct / domain));
  return t < 0 ? mix(NEUTRAL, NEGATIVE, -t) : mix(NEUTRAL, POSITIVE, t);
}

/** CSS gradient for the legend, from -domain to +domain. */
export function legendGradient(domain: number = CHANGE_DOMAIN): string {
  const stops = [-domain, -domain / 2, 0, domain / 2, domain].map((v) => changeToColor(v, domain));
  return `linear-gradient(to right, ${stops.join(", ")})`;
}
