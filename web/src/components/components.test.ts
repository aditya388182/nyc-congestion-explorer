import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EstimateControls from "./EstimateControls.vue";
import ResultTables from "./ResultTables.vue";
import ZonePanel from "./ZonePanel.vue";
import { useEstimateStore } from "../stores/estimate";

const runQuery = vi.fn();
vi.mock("../lib/api", async (orig) => ({ ...(await orig<typeof import("../lib/api")>()), runQuery: (...a: unknown[]) => runQuery(...a) as unknown }));

const stubs = { LineChart: true, RouterLink: { template: "<a><slot /></a>" } };

describe("ZonePanel", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    runQuery.mockReset();
  });
  const zone = { id: 161, name: "Midtown Center", borough: "Manhattan", group: "TREATED", ring: false, change: -3.456, weekly: [{ weekStart: "2025-01-05", trips: 10 }] };

  it("shows the zone, its group and change, and toggles exclusion in the estimate store", async () => {
    runQuery.mockResolvedValue({ zone });
    const w = mount(ZonePanel, { props: { zoneId: 161 }, global: { stubs } });
    expect(w.text()).toContain("Loading this zone");
    await flushPromises();
    expect(w.text()).toContain("Midtown Center");
    expect(w.text()).toContain("Treated");
    expect(w.get('[data-testid="zone-change"]').text()).toBe("−3.5%");
    const btn = w.get('[data-testid="exclude-zone"]');
    expect(btn.text()).toBe("Exclude from the estimate");
    await btn.trigger("click");
    expect(useEstimateStore().excludeZones).toEqual([161]);
    expect(w.get('[data-testid="exclude-zone"]').attributes("aria-pressed")).toBe("true");
  });

  it("shows a visible error with a retry", async () => {
    runQuery.mockRejectedValueOnce(new Error("Cannot reach the API. Is it running?"));
    const w = mount(ZonePanel, { props: { zoneId: 161 }, global: { stubs } });
    await flushPromises();
    expect(w.get('[role="alert"]').text()).toContain("Cannot reach the API");
    runQuery.mockResolvedValueOnce({ zone });
    await w.get('[role="alert"] button').trigger("click");
    await flushPromises();
    expect(w.text()).toContain("Midtown Center");
  });

  it("emits close", async () => {
    runQuery.mockResolvedValue({ zone });
    const w = mount(ZonePanel, { props: { zoneId: 161 }, global: { stubs } });
    await flushPromises();
    await w.get('button[aria-label="Close zone panel"]').trigger("click");
    expect(w.emitted("close")).toHaveLength(1);
  });
});

describe("EstimateControls", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });
  const names = new Map([[161, "Midtown Center"], [48, "Clinton East"]]);

  it("every control has a label and writes to the store", async () => {
    const w = mount(EstimateControls, { props: { zoneNames: names } });
    for (const el of w.findAll("select, input")) {
      expect(el.element.closest("label"), `${el.attributes("data-testid")} has a wrapping label`).not.toBeNull();
    }
    await w.get('[data-testid="est-trip-type"]').setValue("FHVHV");
    await w.get('[data-testid="est-control"]').setValue("B");
    await w.get('[data-testid="est-outcome"]').setValue("PICKUPS");
    await w.get('[data-testid="est-drop-boundary"]').setValue(false);
    await w.get('[data-testid="est-placebo"]').setValue("2024-01-07");
    const s = useEstimateStore();
    expect([s.tripType, s.control, s.outcome, s.dropBoundary, s.placeboStart]).toEqual(["FHVHV", "B", "PICKUPS", false, "2024-01-07"]);
  });

  it("adds an excluded zone, lists it as a removable chip, and removes it", async () => {
    const w = mount(EstimateControls, { props: { zoneNames: names } });
    await w.get('[data-testid="est-exclude-add"]').setValue("161");
    const s = useEstimateStore();
    expect(s.excludeZones).toEqual([161]);
    expect(w.get('[data-testid="excluded-list"]').text()).toContain("Midtown Center");
    await w.get('button[aria-label="Stop excluding Midtown Center"]').trigger("click");
    expect(s.excludeZones).toEqual([]);
    expect(w.text()).toContain("No zones excluded");
  });
});

describe("ResultTables", () => {
  it("renders every row with formatted numbers and a header scope", () => {
    const rows = [
      { label: "Main", effectPct: -9.941, ciLowPct: -11.24, ciHighPct: -8.62, nTreated: 30, nControl: 81, nWeeks: 195, nObs: 21645, droppedZones: [] },
      { label: "Other", effectPct: 2.5, ciLowPct: 1.3, ciHighPct: 3.6, nTreated: 30, nControl: 60, nWeeks: 195, nObs: 17550, droppedZones: [7, 8] },
    ];
    const w = mount(ResultTables, { props: { caption: "Specs", rows, testid: "t" } });
    expect(w.findAll("tbody tr")).toHaveLength(2);
    expect(w.text()).toContain("−9.94%");
    expect(w.text()).toContain("+2.50%");
    expect(w.text()).toContain("21,645");
    expect(w.text()).toContain("7, 8");
    expect(w.text()).toContain("none");
    expect(w.findAll('th[scope="col"]').length).toBeGreaterThan(5);
  });
});
