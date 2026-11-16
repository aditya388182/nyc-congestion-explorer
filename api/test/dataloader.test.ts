import { describe, expect, it } from "vitest";
import { newApp, runQuery, sharedData } from "./helpers.js";

describe("Zone.weekly uses DataLoader", () => {
  it("50 zones' series are one batched store read, not 50", async () => {
    const data = sharedData();
    const ids = data.panel.meta.zoneIds.slice(0, 50);
    const fields = ids.map((id, i) => `z${i}: zone(id: ${id}) { id weekly(tripType: ALL, outcome: DROPOFFS) { weekStart trips } }`).join("\n");
    const app = newApp();
    data.panel.batchReads = 0;
    data.panel.seriesReads = 0;
    const res = await runQuery(app, `{ ${fields} }`);
    expect(res.errors).toBeUndefined();
    expect(data.panel.batchReads).toBe(1);
    expect(data.panel.seriesReads).toBe(50);
    const first = (res.data as Record<string, { weekly: unknown[] }>)["z0"];
    expect(first?.weekly).toHaveLength(data.panel.nWeeks);
  });

  it("caches repeated keys within a request", async () => {
    const data = sharedData();
    const id = data.panel.meta.zoneIds[0] as number;
    const q = `{ a: zone(id: ${id}) { weekly(tripType: ALL, outcome: DROPOFFS) { trips } } b: zone(id: ${id}) { weekly(tripType: ALL, outcome: DROPOFFS) { trips } } }`;
    data.panel.seriesReads = 0;
    await runQuery(newApp(), q);
    expect(data.panel.seriesReads).toBe(1);
  });
});
