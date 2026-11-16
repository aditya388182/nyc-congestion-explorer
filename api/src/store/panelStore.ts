import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type TripTypeKey = "yellow" | "green" | "fhvhv" | "all";
export type OutcomeKey = "dropoffs" | "pickups";

interface Block {
  tripType: TripTypeKey;
  outcome: OutcomeKey;
  offset: number;
  zones: number;
  weeks: number;
  dtype: string;
}

export interface PanelMeta {
  zoneIds: number[];
  weekStarts: string[];
  tripTypes: TripTypeKey[];
  outcomes: OutcomeKey[];
  blocks: Block[];
  change: { offset: number; rows: number; cols: number; dtype: string; order: { tripType: TripTypeKey; outcome: OutcomeKey }[] };
  bytes: number;
  sha256: string;
  totals: { tripType: TripTypeKey; outcome: OutcomeKey; sum: number }[];
  sample: [number, number, number, number][];
  commit: string;
  generated_at_utc: string;
}

export interface SeriesKey {
  zoneId: number;
  tripType: TripTypeKey;
  outcome: OutcomeKey;
}

/** In-memory weekly panel: little-endian typed arrays over the bundled panel.bin. */
export class PanelStore {
  /** Number of read operations (a batch counts once); tests use it to check DataLoader batching. */
  batchReads = 0;
  /** Number of individual series read. */
  seriesReads = 0;
  readonly loadMs: number;
  private readonly zoneIndex = new Map<number, number>();
  private readonly blocks = new Map<string, { data: Int32Array; weeks: number }>();
  private readonly changeData: Float64Array;

  constructor(
    readonly meta: PanelMeta,
    buffer: Buffer,
    loadMs = 0,
  ) {
    this.loadMs = loadMs;
    if (buffer.length !== meta.bytes) throw new Error("panel.bin size does not match panel.meta.json");
    const sha = createHash("sha256").update(buffer).digest("hex");
    if (sha !== meta.sha256) throw new Error("panel.bin sha256 does not match panel.meta.json");
    // copy into an aligned ArrayBuffer so typed-array views are valid regardless of the Buffer pool offset
    const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    meta.zoneIds.forEach((z, i) => this.zoneIndex.set(z, i));
    for (const b of meta.blocks) {
      this.blocks.set(`${b.tripType}|${b.outcome}`, { data: new Int32Array(ab, b.offset, b.zones * b.weeks), weeks: b.weeks });
    }
    this.changeData = new Float64Array(ab, meta.change.offset, meta.change.rows * meta.change.cols);
  }

  static load(dir: string): PanelStore {
    const t0 = performance.now();
    const meta = JSON.parse(readFileSync(join(dir, "panel.meta.json"), "utf8")) as PanelMeta;
    const buf = readFileSync(join(dir, "panel.bin"));
    return new PanelStore(meta, buf, performance.now() - t0);
  }

  get nWeeks(): number {
    return this.meta.weekStarts.length;
  }
  get weekStarts(): readonly string[] {
    return this.meta.weekStarts;
  }
  hasZone(id: number): boolean {
    return this.zoneIndex.has(id);
  }

  /** Weekly trips of one zone as a view (no copy); undefined if the zone is not in the panel. */
  series(zoneId: number, tripType: TripTypeKey, outcome: OutcomeKey): Int32Array | undefined {
    this.seriesReads++;
    return this.view(zoneId, tripType, outcome);
  }

  /** One store read for many series (what the DataLoader batch function calls). */
  readBatch(keys: readonly SeriesKey[]): (Int32Array | undefined)[] {
    this.batchReads++;
    return keys.map((k) => {
      this.seriesReads++;
      return this.view(k.zoneId, k.tripType, k.outcome);
    });
  }

  private view(zoneId: number, tripType: TripTypeKey, outcome: OutcomeKey): Int32Array | undefined {
    const zi = this.zoneIndex.get(zoneId);
    const b = this.blocks.get(`${tripType}|${outcome}`);
    if (zi === undefined || b === undefined) return undefined;
    return b.data.subarray(zi * b.weeks, (zi + 1) * b.weeks);
  }

  /** Percent change, post 52 weeks vs a year earlier; null when undefined. */
  change(zoneId: number, tripType: TripTypeKey, outcome: OutcomeKey): number | null {
    const zi = this.zoneIndex.get(zoneId);
    const row = this.meta.change.order.findIndex((o) => o.tripType === tripType && o.outcome === outcome);
    if (zi === undefined || row < 0) return null;
    const v = this.changeData[row * this.meta.change.cols + zi];
    return v === undefined || Number.isNaN(v) ? null : v;
  }
}
