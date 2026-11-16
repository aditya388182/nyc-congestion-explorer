import { describe, expect, it } from "vitest";
import { newApp, runQuery, sharedData } from "./helpers.js";

const EST = `query($i: EstimateInput!) { estimate(input: $i) { beta se nObs droppedZones cached computeMs } }`;
const base = { tripType: "ALL", control: "AB", dropBoundary: true, outcome: "DROPOFFS" };
const code = (r: Awaited<ReturnType<typeof runQuery>>): unknown => r.errors?.[0]?.extensions?.["code"];

describe("input validation (zod) and error shape", () => {
  it("accepts a valid input", async () => {
    const r = await runQuery(newApp(), EST, { i: base });
    expect(r.errors).toBeUndefined();
  });

  it.each([
    ["unknown zone id", { ...base, excludeZones: [999999] }, /unknown zone/],
    ["more than 20 excluded zones", { ...base, excludeZones: Array.from({ length: 21 }, (_, i) => i + 1) }, /at most 20/],
    ["placebo on or after the toll", { ...base, placeboStart: "2025-01-05" }, /before 2025-01-05/],
    ["placebo not an ISO date", { ...base, placeboStart: "5 Jan 2024" }, /ISO date/],
    ["placebo not a real date", { ...base, placeboStart: "2024-02-31" }, /calendar date/],
    ["placebo leaving fewer than 13 weeks", { ...base, placeboStart: "2023-01-08" }, /13 weeks/],
    ["placebo too close to the toll", { ...base, placeboStart: "2024-12-01" }, /13 weeks/],
  ])("%s -> BAD_USER_INPUT", async (_name, input, msg) => {
    const r = await runQuery(newApp(), EST, { i: input });
    expect(code(r)).toBe("BAD_USER_INPUT");
    expect(r.errors?.[0]?.message).toMatch(msg);
  });

  it("fewer than 5 control zones after exclusions -> BAD_USER_INPUT", async () => {
    // control A has 21 zones; excluding 20 of them leaves 1
    const a = sharedData().zones.filter((z) => z.group === "CONTROL_A").slice(0, 20).map((z) => z.id);
    const r = await runQuery(newApp(), EST, { i: { ...base, control: "A", excludeZones: a } });
    expect(code(r)).toBe("BAD_USER_INPUT");
    expect(r.errors?.[0]?.message).toMatch(/fewer than 5/);
  });

  it("eventStudy(GREEN) -> BAD_USER_INPUT", async () => {
    const r = await runQuery(newApp(), `{ eventStudy(tripType: GREEN, control: AB) { nObs } }`);
    expect(code(r)).toBe("BAD_USER_INPUT");
  });

  it("an invalid enum is rejected by GraphQL validation, never a stack trace", async () => {
    const r = await runQuery(newApp(), EST, { i: { ...base, tripType: "BUS" } });
    expect(r.errors?.length).toBe(1);
    expect(JSON.stringify(r)).not.toMatch(/stacktrace|at .*\.ts/);
  });

  it("excluded zones are normalised (order and duplicates) and cached", async () => {
    const app = newApp();
    const a = await runQuery(app, EST, { i: { ...base, excludeZones: [48, 161] } });
    const b = await runQuery(app, EST, { i: { ...base, excludeZones: [161, 48, 161] } });
    expect((a.data as { estimate: { cached: boolean } }).estimate.cached).toBe(false);
    expect((b.data as { estimate: { cached: boolean; beta: number } }).estimate.cached).toBe(true);
    expect((b.data as { estimate: { beta: number } }).estimate.beta).toBe((a.data as { estimate: { beta: number } }).estimate.beta);
  });

  it("an internal failure is masked: no message, no stack", async () => {
    const app = newApp();
    const spy = app.services.estimates;
    const orig = spy.estimate.bind(spy);
    spy.estimate = () => {
      throw new Error("secret internal detail at /home/ubuntu/x.ts:12");
    };
    const r = await runQuery(app, EST, { i: base });
    spy.estimate = orig;
    expect(r.errors?.[0]?.message).toBe("Internal server error");
    expect(JSON.stringify(r)).not.toMatch(/secret|ubuntu|stacktrace/);
  });
});
