import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PanelStore } from "../src/store/panelStore.js";
import type { OutcomeKey, TripTypeKey } from "../src/store/panelStore.js";
import { REPO, sharedData } from "./helpers.js";

describe("panel.bin loader (values written by Python)", () => {
  const { panel } = sharedData();
  const meta = panel.meta;

  it("matches the sha256 and size in panel.meta.json", () => {
    const buf = readFileSync(join(REPO, "api", "data", "panel.bin"));
    expect(createHash("sha256").update(buf).digest("hex")).toBe(meta.sha256);
    expect(buf.length).toBe(meta.bytes);
  });

  it("rejects a corrupted binary", () => {
    const buf = Buffer.from(readFileSync(join(REPO, "api", "data", "panel.bin")));
    buf[100] = (buf[100] ?? 0) ^ 0xff;
    expect(() => new PanelStore(meta, buf)).toThrow(/sha256/);
  });

  it("returns the 1,000 sampled cells written by Python", () => {
    expect(meta.sample).toHaveLength(1000);
    for (const [bi, zi, wi, value] of meta.sample) {
      const b = meta.blocks[bi];
      expect(b).toBeDefined();
      const s = panel.series(meta.zoneIds[zi] as number, b?.tripType as TripTypeKey, b?.outcome as OutcomeKey);
      expect(s?.[wi]).toBe(value);
    }
  });

  it("reproduces the per-block totals", () => {
    for (const t of meta.totals) {
      let sum = 0;
      for (const z of meta.zoneIds) for (const v of panel.series(z, t.tripType, t.outcome) ?? []) sum += v;
      expect(sum).toBe(t.sum);
    }
  });

  it("serves precomputed percent change and null for undefined", () => {
    const vals = meta.zoneIds.map((z) => panel.change(z, "all", "dropoffs"));
    expect(vals.some((v) => v !== null)).toBe(true);
    expect(panel.change(999999, "all", "dropoffs")).toBeNull();
  });
});
