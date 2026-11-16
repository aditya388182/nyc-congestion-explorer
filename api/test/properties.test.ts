import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { fitRows } from "../src/estimator/twfe.js";
import type { Row } from "../src/estimator/twfe.js";

/** Tolerances for floating-point comparisons (named, SPEC 9.3). */
const BETA_ABS_TOL = 1e-8;
const SE_REL_TOL = 1e-7;
const EXACT_ABS_TOL = 1e-9;

interface Design {
  rows: Row[];
  nz: number;
  nw: number;
  nTreated: number;
}

/** Balanced random panel: nz zones x nw weeks, a few treated zones, post from week `cut`. */
const design = fc
  .record({
    nz: fc.integer({ min: 6, max: 10 }),
    nw: fc.integer({ min: 5, max: 12 }),
    seed: fc.array(fc.double({ min: -3, max: 3, noNaN: true }), { minLength: 200, maxLength: 200 }),
    nTreated: fc.integer({ min: 1, max: 3 }),
    cut: fc.integer({ min: 2, max: 4 }),
  })
  .map(({ nz, nw, seed, nTreated, cut }): Design => {
    const rows: Row[] = [];
    let k = 0;
    for (let z = 0; z < nz; z++)
      for (let w = 0; w < nw; w++) rows.push({ zone: z, week: w, y: seed[k++ % seed.length] as number, treated: z < nTreated ? 1 : 0, post: w >= cut ? 1 : 0 });
    return { rows, nz, nw, nTreated };
  });

describe("TWFE estimator properties (fast-check)", () => {
  it("adding a constant to one zone's outcomes does not change beta or SE", () => {
    fc.assert(
      fc.property(design, fc.integer({ min: 0, max: 8 }), fc.double({ min: -5, max: 5, noNaN: true }), (d, zsel, c) => {
        const z = zsel % d.nz;
        const a = fitRows(d.rows);
        const b = fitRows(d.rows.map((r) => (r.zone === z ? { ...r, y: r.y + c } : r)));
        expect(Math.abs(a.beta - b.beta)).toBeLessThan(BETA_ABS_TOL);
        expect(Math.abs(a.se - b.se)).toBeLessThan(SE_REL_TOL * Math.max(1, a.se));
      }),
      { numRuns: 100 },
    );
  });

  it("adding a constant to one week's outcomes does not change beta or SE", () => {
    fc.assert(
      fc.property(design, fc.integer({ min: 0, max: 11 }), fc.double({ min: -5, max: 5, noNaN: true }), (d, wsel, c) => {
        const w = wsel % d.nw;
        const a = fitRows(d.rows);
        const b = fitRows(d.rows.map((r) => (r.week === w ? { ...r, y: r.y + c } : r)));
        expect(Math.abs(a.beta - b.beta)).toBeLessThan(BETA_ABS_TOL);
        expect(Math.abs(a.se - b.se)).toBeLessThan(SE_REL_TOL * Math.max(1, a.se));
      }),
      { numRuns: 100 },
    );
  });

  it("row order does not change beta or SE", () => {
    fc.assert(
      fc.property(design, fc.infiniteStream(fc.nat()), (d, stream) => {
        const a = fitRows(d.rows);
        const shuffled = [...d.rows];
        const it2 = stream[Symbol.iterator]();
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = (it2.next().value as number) % (i + 1);
          [shuffled[i], shuffled[j]] = [shuffled[j] as Row, shuffled[i] as Row];
        }
        const b = fitRows(shuffled);
        expect(Math.abs(a.beta - b.beta)).toBeLessThan(BETA_ABS_TOL);
        expect(Math.abs(a.se - b.se)).toBeLessThan(SE_REL_TOL * Math.max(1, a.se));
      }),
      { numRuns: 100 },
    );
  });

  it("a noise-free planted effect is recovered exactly", () => {
    fc.assert(
      fc.property(design, fc.double({ min: -1, max: 1, noNaN: true }), (d, tau) => {
        // outcomes with zone and week effects only (taken from the random data), plus tau on treated x post
        const za = Array.from({ length: d.nz }, (_, z) => (d.rows[z * d.nw]?.y ?? 0));
        const wg = Array.from({ length: d.nw }, (_, w) => (d.rows[w]?.y ?? 0));
        const rows = d.rows.map((r) => ({ ...r, y: (za[r.zone] as number) + (wg[r.week] as number) + tau * r.treated * r.post }));
        expect(Math.abs(fitRows(rows).beta - tau)).toBeLessThan(EXACT_ABS_TOL);
      }),
      { numRuns: 100 },
    );
  });

  it("excluding a zone equals removing its rows", () => {
    fc.assert(
      fc.property(design, fc.integer({ min: 0, max: 8 }), (d, zsel) => {
        // pick a control zone; nz >= 6 and nTreated <= 3 leave at least 2 controls
        const z = d.nTreated + (zsel % (d.nz - d.nTreated));
        const kept = d.rows.filter((r) => r.zone !== z);
        const a = fitRows(kept);
        // same rows, but zone labels relabelled and rows interleaved: still the same fit
        const b = fitRows(kept.map((r) => ({ ...r, zone: r.zone * 7 + 100 })).reverse());
        expect(Math.abs(a.beta - b.beta)).toBeLessThan(BETA_ABS_TOL);
        expect(Math.abs(a.se - b.se)).toBeLessThan(SE_REL_TOL * Math.max(1, a.se));
        expect(a.nZones).toBe(d.nz - 1);
        expect(a.nObs).toBe(d.rows.length - d.nw);
      }),
      { numRuns: 100 },
    );
  });
});
