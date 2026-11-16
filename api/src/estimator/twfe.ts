/**
 * Two-way fixed-effects DiD with zone-clustered standard errors, in Float64.
 *
 * Port of `study/src/congestion/did.py::twfe_demeaned`, checked against the statsmodels reference
 * (explicit zone and week dummies, cov_type="cluster") in test/equivalence.test.ts.
 */

/** Convergence tolerance of the alternating projections (SPEC 9.3). */
export const DEMEAN_TOLERANCE = 1e-12;
export const DEMEAN_MAX_ITERATIONS = 100_000;
/** Normal 97.5% quantile: statsmodels' clustered CI uses the normal distribution (use_t=False). */
export const Z_975 = 1.959963984540054;

export interface PanelData {
  /** zone code of each observation, 0..nz-1 */
  zone: Int32Array;
  /** week code of each observation, 0..nw-1 */
  week: Int32Array;
  /** outcome, log(trips) */
  y: Float64Array;
  /** regressor: treated x post (0 or 1) */
  x: Float64Array;
  nz: number;
  nw: number;
}

export interface DidFit {
  beta: number;
  se: number;
  nObs: number;
  nZones: number;
  nWeeks: number;
}

/** Remove zone means then week means repeatedly until both are below the tolerance (exact for unbalanced panels). */
export function demean(values: Float64Array, zone: Int32Array, week: Int32Array, nz: number, nw: number): Float64Array {
  const n = values.length;
  const out = Float64Array.from(values);
  const zc = new Float64Array(nz);
  const wc = new Float64Array(nw);
  for (let i = 0; i < n; i++) {
    zc[zone[i] as number] = (zc[zone[i] as number] as number) + 1;
    wc[week[i] as number] = (wc[week[i] as number] as number) + 1;
  }
  const zs = new Float64Array(nz);
  const ws = new Float64Array(nw);
  for (let iter = 0; iter < DEMEAN_MAX_ITERATIONS; iter++) {
    zs.fill(0);
    for (let i = 0; i < n; i++) zs[zone[i] as number] = (zs[zone[i] as number] as number) + (out[i] as number);
    let delta = 0;
    for (let z = 0; z < nz; z++) {
      zs[z] = (zs[z] as number) / (zc[z] as number);
      delta = Math.max(delta, Math.abs(zs[z] as number));
    }
    for (let i = 0; i < n; i++) out[i] = (out[i] as number) - (zs[zone[i] as number] as number);
    ws.fill(0);
    for (let i = 0; i < n; i++) ws[week[i] as number] = (ws[week[i] as number] as number) + (out[i] as number);
    for (let w = 0; w < nw; w++) {
      ws[w] = (ws[w] as number) / (wc[w] as number);
      delta = Math.max(delta, Math.abs(ws[w] as number));
    }
    for (let i = 0; i < n; i++) out[i] = (out[i] as number) - (ws[week[i] as number] as number);
    if (delta < DEMEAN_TOLERANCE) break;
  }
  return out;
}

/**
 * beta = sum(x~ y~) / sum(x~ x~); cluster-robust variance
 * c * (sum_g s_g^2) / sxx^2 with s_g = sum_{i in g} x~_i u_i and
 * c = G/(G-1) * (N-1)/(N-K), K = 1 (regressor) + 1 (intercept) + (Z-1) + (W-1) = Z + W.
 */
export function twfeDid(p: PanelData): DidFit {
  const n = p.y.length;
  const yd = demean(p.y, p.zone, p.week, p.nz, p.nw);
  const xd = demean(p.x, p.zone, p.week, p.nz, p.nw);
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xd[i] as number) * (xd[i] as number);
    sxy += (xd[i] as number) * (yd[i] as number);
  }
  if (!(sxx > 0)) throw new RangeError("regressor has no variation after removing fixed effects");
  const beta = sxy / sxx;
  const scores = new Float64Array(p.nz);
  for (let i = 0; i < n; i++) {
    const u = (yd[i] as number) - beta * (xd[i] as number);
    scores[p.zone[i] as number] = (scores[p.zone[i] as number] as number) + (xd[i] as number) * u;
  }
  let meat = 0;
  for (let z = 0; z < p.nz; z++) meat += (scores[z] as number) * (scores[z] as number);
  const k = 1 + 1 + (p.nz - 1) + (p.nw - 1);
  const c = (p.nz / (p.nz - 1)) * ((n - 1) / (n - k));
  const variance = (c * meat) / (sxx * sxx);
  return { beta, se: Math.sqrt(variance), nObs: n, nZones: p.nz, nWeeks: p.nw };
}

export interface Row {
  zone: number;
  week: number;
  y: number;
  treated: 0 | 1;
  post: 0 | 1;
}

/** Recode arbitrary zone/week labels to contiguous codes and fit. Used by tests and property tests. */
export function fitRows(rows: readonly Row[]): DidFit {
  const zoneCode = new Map<number, number>();
  const weekCode = new Map<number, number>();
  for (const r of rows) {
    if (!zoneCode.has(r.zone)) zoneCode.set(r.zone, zoneCode.size);
    if (!weekCode.has(r.week)) weekCode.set(r.week, weekCode.size);
  }
  const n = rows.length;
  const zone = new Int32Array(n);
  const week = new Int32Array(n);
  const y = new Float64Array(n);
  const x = new Float64Array(n);
  rows.forEach((r, i) => {
    zone[i] = zoneCode.get(r.zone) as number;
    week[i] = weekCode.get(r.week) as number;
    y[i] = r.y;
    x[i] = r.treated * r.post;
  });
  return twfeDid({ zone, week, y, x, nz: zoneCode.size, nw: weekCode.size });
}

/** Percent effect of a log-point coefficient: 100 (exp(b) - 1). */
export function effectPct(beta: number): number {
  return 100 * (Math.exp(beta) - 1);
}
