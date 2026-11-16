import { LRUCache } from "lru-cache";
import type { DataStore } from "../store/dataStore.js";
import type { OutcomeKey, TripTypeKey } from "../store/panelStore.js";
import { effectPct, twfeDid, Z_975 } from "./twfe.js";

/** First treated week: the toll started on Sunday 5 January 2025. */
export const TOLL_START = "2025-01-05";
export const MIN_ZONES_PER_ARM = 5;
export const MIN_WEEKS_EACH_SIDE = 13;
export const MAX_EXCLUDED_ZONES = 20;
export const CACHE_ENTRIES = 500;

export class UserInputError extends Error {
  override readonly name = "UserInputError";
}

export interface EstimateRequest {
  tripType: TripTypeKey;
  control: "A" | "B" | "AB";
  dropBoundary: boolean;
  outcome: OutcomeKey;
  excludeZones: number[];
  placeboStart: string | null;
}

export interface EstimateResult {
  beta: number;
  se: number;
  effectPct: number;
  ciLowPct: number;
  ciHighPct: number;
  nTreated: number;
  nControl: number;
  nWeeks: number;
  nObs: number;
  droppedZones: number[];
}

/** Normalised cache key: excluded zones are de-duplicated and sorted. */
export function cacheKey(r: EstimateRequest): string {
  const ex = [...new Set(r.excludeZones)].sort((a, b) => a - b);
  return JSON.stringify([r.tripType, r.control, r.dropBoundary, r.outcome, ex, r.placeboStart]);
}

/** Pure estimator over the store: balanced panel -> TWFE DiD (no caching). */
export function computeEstimate(data: DataStore, req: EstimateRequest): EstimateResult {
  const { panel } = data;
  const weekStarts = panel.weekStarts;
  const exclude = new Set(req.excludeZones);
  const placebo = req.placeboStart !== null;
  const nWindow = placebo ? weekStarts.filter((w) => w < TOLL_START).length : weekStarts.length;
  const postStart = req.placeboStart ?? TOLL_START;
  const isPost = (wi: number): boolean => (weekStarts[wi] as string) >= postStart;

  let nPre = 0;
  for (let w = 0; w < nWindow; w++) if (!isPost(w)) nPre++;
  if (Math.min(nPre, nWindow - nPre) < MIN_WEEKS_EACH_SIDE) {
    throw new UserInputError(`placeboStart leaves fewer than ${MIN_WEEKS_EACH_SIDE} weeks on one side`);
  }

  const treatedIds = new Set(data.zones.filter((z) => z.group === "TREATED" || (!req.dropBoundary && z.group === "BOUNDARY")).map((z) => z.id));
  const controlGroups = req.control === "A" ? ["CONTROL_A"] : req.control === "B" ? ["CONTROL_B"] : ["CONTROL_A", "CONTROL_B"];
  const controlIds = new Set(data.zones.filter((z) => controlGroups.includes(z.group) && !treatedIds.has(z.id)).map((z) => z.id));

  const wanted = [...treatedIds, ...controlIds].filter((id) => !exclude.has(id)).sort((a, b) => a - b);
  const kept: { id: number; series: Int32Array; treated: boolean }[] = [];
  const dropped: number[] = [];
  for (const id of wanted) {
    const s = panel.series(id, req.tripType, req.outcome);
    let ok = s !== undefined && s.length >= nWindow;
    if (ok && s) for (let w = 0; w < nWindow; w++) if ((s[w] as number) <= 0) { ok = false; break; }
    if (ok && s) kept.push({ id, series: s, treated: treatedIds.has(id) });
    else dropped.push(id);
  }
  const nTreated = kept.filter((k) => k.treated).length;
  const nControl = kept.length - nTreated;
  if (nTreated < MIN_ZONES_PER_ARM || nControl < MIN_ZONES_PER_ARM) {
    throw new UserInputError(`fewer than ${MIN_ZONES_PER_ARM} treated or ${MIN_ZONES_PER_ARM} control zones remain after balancing and exclusions (treated ${nTreated}, control ${nControl})`);
  }

  const n = kept.length * nWindow;
  const zone = new Int32Array(n);
  const week = new Int32Array(n);
  const y = new Float64Array(n);
  const x = new Float64Array(n);
  let i = 0;
  kept.forEach((k, zi) => {
    for (let w = 0; w < nWindow; w++, i++) {
      zone[i] = zi;
      week[i] = w;
      y[i] = Math.log(k.series[w] as number);
      x[i] = k.treated && isPost(w) ? 1 : 0;
    }
  });
  let fit;
  try {
    fit = twfeDid({ zone, week, y, x, nz: kept.length, nw: nWindow });
  } catch (e) {
    if (e instanceof RangeError) throw new UserInputError(e.message);
    throw e;
  }
  return {
    beta: fit.beta,
    se: fit.se,
    effectPct: effectPct(fit.beta),
    ciLowPct: effectPct(fit.beta - Z_975 * fit.se),
    ciHighPct: effectPct(fit.beta + Z_975 * fit.se),
    nTreated,
    nControl,
    nWeeks: nWindow,
    nObs: n,
    droppedZones: dropped,
  };
}

export interface CachedEstimate extends EstimateResult {
  cached: boolean;
  computeMs: number;
}

/** Estimate with an LRU cache (500 entries) keyed by the normalised input. */
export class EstimateService {
  private readonly cache = new LRUCache<string, EstimateResult>({ max: CACHE_ENTRIES });
  constructor(private readonly data: DataStore) {}

  estimate(req: EstimateRequest): CachedEstimate {
    const t0 = performance.now();
    const key = cacheKey(req);
    const hit = this.cache.get(key);
    if (hit) return { ...hit, cached: true, computeMs: performance.now() - t0 };
    const res = computeEstimate(this.data, { ...req, excludeZones: [...new Set(req.excludeZones)] });
    this.cache.set(key, res);
    return { ...res, cached: false, computeMs: performance.now() - t0 };
  }

  clear(): void {
    this.cache.clear();
  }
  get size(): number {
    return this.cache.size;
  }
}
