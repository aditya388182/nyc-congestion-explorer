import { describe, expect, it } from "vitest";
import { fmtMs, fmtNum, fmtP, fmtPct } from "./format";

describe("format", () => {
  it("uses a real minus sign and an explicit plus", () => {
    expect(fmtPct(-9.941, 1)).toBe("−9.9%");
    expect(fmtPct(2.479, 2)).toBe("+2.48%");
    expect(fmtPct(0)).toBe("0.0%");
  });
  it("formats numbers with separators", () => {
    expect(fmtNum(1068928934)).toBe("1,068,928,934");
  });
  it("never rounds a tiny p-value to zero", () => {
    expect(fmtP(1.09e-186)).toBe("1.1e-186");
    expect(fmtP(0.0123)).toBe("0.012");
    expect(fmtP(0)).toBe("< 1e-300");
  });
  it("formats milliseconds", () => {
    expect(fmtMs(0.0123)).toBe("0.01 ms");
    expect(fmtMs(27.28)).toBe("27.3 ms");
  });
});
