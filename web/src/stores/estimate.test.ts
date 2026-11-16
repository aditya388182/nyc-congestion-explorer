import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../lib/api";
import { useEstimateStore } from "./estimate";

const runQuery = vi.fn();
vi.mock("../lib/api", async (orig) => ({ ...(await orig<typeof import("../lib/api")>()), runQuery: (...a: unknown[]) => runQuery(...a) as unknown }));

const result = (effectPct: number) => ({ estimate: { beta: -0.1, se: 0.01, effectPct, ciLowPct: effectPct - 1, ciHighPct: effectPct + 1, nTreated: 30, nControl: 81, nWeeks: 195, nObs: 21645, droppedZones: [], cached: false, computeMs: 3 } });

describe("estimate store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    runQuery.mockReset();
  });

  it("builds the API input from the controls (empty placebo date becomes null, exclusions kept)", () => {
    const s = useEstimateStore();
    s.toggleExclude(161);
    s.toggleExclude(48);
    s.placeboStart = "";
    expect(s.input).toEqual({ tripType: "ALL", control: "AB", dropBoundary: true, outcome: "DROPOFFS", excludeZones: [161, 48], placeboStart: null });
    s.placeboStart = "2024-01-07";
    expect(s.input.placeboStart).toBe("2024-01-07");
  });

  it("toggleExclude adds and removes", () => {
    const s = useEstimateStore();
    s.toggleExclude(5);
    expect(s.isExcluded(5)).toBe(true);
    s.toggleExclude(5);
    expect(s.isExcluded(5)).toBe(false);
  });

  it("run() goes loading -> done and stores the result", async () => {
    runQuery.mockResolvedValue(result(-9.9));
    const s = useEstimateStore();
    const p = s.run();
    expect(s.status).toBe("loading");
    await p;
    expect(s.status).toBe("done");
    expect(s.result?.effectPct).toBe(-9.9);
  });

  it("an API error becomes a visible error state with the code", async () => {
    runQuery.mockRejectedValue(new ApiError("unknown zone id(s): 999999", "BAD_USER_INPUT"));
    const s = useEstimateStore();
    await s.run();
    expect(s.status).toBe("error");
    expect(s.errorCode).toBe("BAD_USER_INPUT");
    expect(s.errorMessage).toMatch(/unknown zone/);
  });

  it("only the latest request may update the state", async () => {
    let resolveFirst: (v: unknown) => void = () => undefined;
    runQuery.mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)));
    runQuery.mockResolvedValueOnce(result(-5));
    const s = useEstimateStore();
    const first = s.run();
    await s.run(); // second request finishes first
    resolveFirst(result(-99));
    await first;
    expect(s.result?.effectPct).toBe(-5);
  });
});
