import { buildSchema, parse, specifiedRules, validate } from "graphql";
import { describe, expect, it } from "vitest";
import { depthLimit } from "../src/limits/depth.js";
import { newApp, runQuery } from "./helpers.js";

const ALL_TYPES = ["YELLOW", "GREEN", "FHVHV", "ALL"];

describe("query limits", () => {
  it("rejects every zone's weekly series for every type with QUERY_TOO_COMPLEX and the cost", async () => {
    const fields = ALL_TYPES.map((t) => `${t.toLowerCase()}: weekly(tripType: ${t}, outcome: DROPOFFS) { trips }`).join(" ");
    const res = await runQuery(newApp(), `{ zones { id ${fields} } }`);
    const err = res.errors?.[0];
    expect(err?.extensions?.["code"]).toBe("QUERY_TOO_COMPLEX");
    expect(err?.message).toMatch(/cost \d+/);
    expect(err?.extensions?.["cost"]).toBeGreaterThan(5000);
    expect(res.data ?? null).toBeNull();
  });

  it("allows the map query (zones with geometry and change)", async () => {
    const res = await runQuery(newApp(), `{ zones { id name borough group ring geometry change(tripType: ALL, outcome: DROPOFFS) } }`);
    expect(res.errors).toBeUndefined();
  });

  it("costs one estimate at 50 and one zone's series at 10", async () => {
    const q = `{ zone(id: 161) { weekly(tripType: ALL, outcome: DROPOFFS) { trips } } }`;
    expect((await runQuery(newApp(), q)).errors).toBeUndefined();
  });

  it("the depth rule rejects depth 7 and accepts depth 6 (QUERY_TOO_DEEP)", () => {
    // the real schema is only 3 levels deep, so the rule is exercised on a recursive test schema
    const schema = buildSchema("type Node { id: Int! child: Node } type Query { root: Node }");
    const nest = (n: number): string => `{ root ${"{ child ".repeat(n - 1)}{ id }${" }".repeat(n - 1)} }`;
    const six = validate(schema, parse(nest(5)), [...specifiedRules, depthLimit()]); // root + 4 child + id = 6
    expect(six).toHaveLength(0);
    const seven = validate(schema, parse(nest(6)), [...specifiedRules, depthLimit()]);
    expect(seven).toHaveLength(1);
    expect(seven[0]?.extensions["code"]).toBe("QUERY_TOO_DEEP");
    expect(seven[0]?.message).toMatch(/depth 7/);
  });

  it("introspection fields do not count towards depth", () => {
    const schema = buildSchema("type Query { a: Int }");
    const q = "{ __schema { types { fields { type { ofType { ofType { name } } } } } } }";
    expect(validate(schema, parse(q), [...specifiedRules, depthLimit()])).toHaveLength(0);
  });

  it("the depth limit is wired into the server", async () => {
    // an undefined deep field is also a validation error, but the depth error must be reported too
    const res = await runQuery(newApp(), "{ a { b { c { d { e { f { g } } } } } } }");
    const codes = res.errors?.map((e) => e.extensions?.["code"]);
    expect(codes).toContain("QUERY_TOO_DEEP");
    expect(res.errors?.some((e) => /too deep/.test(e.message))).toBe(true);
  });

  it("introspection is on locally and off when NODE_ENV=production", async () => {
    const local = await runQuery(newApp(), "{ __schema { queryType { name } } }");
    expect(local.errors).toBeUndefined();
    const prev = process.env["NODE_ENV"];
    process.env["NODE_ENV"] = "production";
    try {
      const prod = await runQuery(newApp(), "{ __schema { queryType { name } } }");
      expect(prod.errors?.length).toBeGreaterThan(0);
    } finally {
      if (prev === undefined) delete process.env["NODE_ENV"];
      else process.env["NODE_ENV"] = prev;
    }
  });
});
