import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { CHANGE_DOMAIN, NO_DATA_COLOR, changeToColor, legendGradient } from "./colorScale";

const channels = (hex: string): [number, number, number] => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const distFromNeutral = (hex: string): number => {
  const [r, g, b] = channels(hex);
  return Math.abs(r - 245) + Math.abs(g - 245) + Math.abs(b - 245);
};

describe("changeToColor", () => {
  it("always returns a 6-digit hex colour", () => {
    fc.assert(fc.property(fc.double({ min: -1e6, max: 1e6, noNaN: true }), (v) => /^#[0-9a-f]{6}$/.test(changeToColor(v))));
  });
  it("missing values get the no-data colour", () => {
    expect(changeToColor(null)).toBe(NO_DATA_COLOR);
    expect(changeToColor(undefined)).toBe(NO_DATA_COLOR);
    expect(changeToColor(Number.NaN)).toBe(NO_DATA_COLOR);
  });
  it("zero is the neutral colour", () => {
    expect(changeToColor(0)).toBe("#f5f5f5");
  });
  it("colour gets further from neutral as |change| grows, on each side, and saturates at the domain", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 200, noNaN: true }), fc.double({ min: 0, max: 200, noNaN: true }), (a, b) => {
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        expect(distFromNeutral(changeToColor(lo))).toBeLessThanOrEqual(distFromNeutral(changeToColor(hi)));
        expect(distFromNeutral(changeToColor(-lo))).toBeLessThanOrEqual(distFromNeutral(changeToColor(-hi)));
      }),
    );
    expect(changeToColor(CHANGE_DOMAIN * 3)).toBe(changeToColor(CHANGE_DOMAIN));
    expect(changeToColor(-CHANGE_DOMAIN * 3)).toBe(changeToColor(-CHANGE_DOMAIN));
  });
  it("increases and decreases use different hues", () => {
    expect(changeToColor(CHANGE_DOMAIN)).not.toBe(changeToColor(-CHANGE_DOMAIN));
    const [r1, , b1] = channels(changeToColor(CHANGE_DOMAIN));
    const [r2, , b2] = channels(changeToColor(-CHANGE_DOMAIN));
    expect(r1).toBeLessThan(r2); // decreases are brown (red-heavy), increases teal
    expect(b1).toBeGreaterThan(b2);
  });
  it("legend gradient has five stops", () => {
    expect(legendGradient().match(/#/g)).toHaveLength(5);
  });
});
