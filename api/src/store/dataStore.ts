import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PanelStore } from "./panelStore.js";

export interface ZoneRecord {
  id: number;
  name: string;
  borough: string;
  group: "TREATED" | "BOUNDARY" | "CONTROL_A" | "CONTROL_B" | "OTHER" | "UNCLASSIFIED";
  ring: boolean;
  ring2?: boolean;
}

interface GeoFeature {
  id: number;
  geometry: unknown;
}

export type Json = Record<string, unknown>;

export interface DataStore {
  panel: PanelStore;
  zones: ZoneRecord[];
  zoneById: Map<number, ZoneRecord>;
  geometry: Map<number, unknown>;
  results: {
    headline: Json;
    planted: Json;
    spillover: Json;
    exploratory: Json;
    specs: Json[];
    placebos: Json[];
    eventStudies: Json[];
    reconciliation: { totals: Json; files: Json[] };
  };
}

const EMPTY_GEOMETRY = { type: "GeometryCollection", geometries: [] };

/** Default data directory: api/data next to this package (works from src/ and from the bundle). */
export function defaultDataDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const fromEnv = process.env["DATA_DIR"];
  if (fromEnv) return fromEnv;
  for (const rel of ["../../data", "../data", "./data"]) {
    try {
      readFileSync(join(here, rel, "panel.meta.json"));
      return join(here, rel);
    } catch {
      /* try next */
    }
  }
  throw new Error("cannot find api/data (set DATA_DIR)");
}

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));

export function loadData(dir: string = defaultDataDir()): DataStore {
  const panel = PanelStore.load(dir);
  const r = (name: string): string => join(dir, "results", `${name}.json`);
  const zonesFile = readJson(r("zones")) as { zones: ZoneRecord[] };
  const geo = readJson(join(dir, "zones.geojson")) as { features: GeoFeature[] };
  const geometry = new Map<number, unknown>(geo.features.map((f) => [f.id, f.geometry]));
  const zones = zonesFile.zones.map((z) => ({ ...z }));
  return {
    panel,
    zones,
    zoneById: new Map(zones.map((z) => [z.id, z])),
    geometry: new Map(zones.map((z) => [z.id, geometry.get(z.id) ?? EMPTY_GEOMETRY])),
    results: {
      headline: readJson(r("headline")) as Json,
      planted: readJson(r("planted")) as Json,
      spillover: readJson(r("spillover")) as Json,
      exploratory: readJson(r("exploratory")) as Json,
      specs: (readJson(r("specs")) as { specs: Json[] }).specs,
      placebos: (readJson(r("placebos")) as { placebos: Json[] }).placebos,
      eventStudies: (readJson(r("event_study")) as { event_studies: Json[] }).event_studies,
      reconciliation: readJson(r("reconciliation")) as { totals: Json; files: Json[] },
    },
  };
}
