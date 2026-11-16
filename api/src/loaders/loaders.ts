import DataLoader from "dataloader";
import type { OutcomeKey, PanelStore, SeriesKey, TripTypeKey } from "../store/panelStore.js";

export interface WeekPointRow {
  weekStart: string;
  trips: number;
}

const keyOf = (k: SeriesKey): string => `${k.zoneId}|${k.tripType}|${k.outcome}`;

/** Per-request loaders. Zone.weekly keys are batched into ONE store read per tick. */
export function createLoaders(store: PanelStore) {
  const weekly = new DataLoader<SeriesKey, WeekPointRow[], string>(
    (keys) => {
      const series = store.readBatch(keys);
      const weeks = store.weekStarts;
      return Promise.resolve(
        series.map((s) => (s ? Array.from(s, (trips, i) => ({ weekStart: weeks[i] as string, trips })) : [])),
      );
    },
    { cacheKeyFn: keyOf },
  );
  return { weekly };
}

export type Loaders = ReturnType<typeof createLoaders>;
export type { OutcomeKey, TripTypeKey };
