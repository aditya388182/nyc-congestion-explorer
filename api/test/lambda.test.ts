import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { APIGatewayProxyEventV2, Context } from "aws-lambda";
import { describe, expect, it } from "vitest";
import { REPO, readResultsJson } from "./helpers.js";

process.env["DATA_DIR"] = join(REPO, "api", "data");
process.env["LOG_LEVEL"] = "silent";
const { handler } = await import("../src/lambda.js");

const fixture = (): APIGatewayProxyEventV2 =>
  JSON.parse(readFileSync(join(REPO, "api", "test", "fixtures", "apigw-v2-estimate.json"), "utf8")) as APIGatewayProxyEventV2;
const ctx = { awsRequestId: "fixture" } as Context;

describe("Lambda handler (HTTP API v2 event)", () => {
  it("answers an estimate POST with the same schema", async () => {
    const res = await handler(fixture(), ctx);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body ?? "{}") as { data: { estimate: { beta: number; nTreated: number; nControl: number } } };
    expect(body.data.estimate.nTreated).toBe(30);
    expect(body.data.estimate.nControl).toBe(81);
    const headline = readResultsJson("headline") as { main_beta: number };
    expect(Math.abs(body.data.estimate.beta - headline.main_beta)).toBeLessThan(1e-9);
  });

  it("serves the health check on a bare GET /graphql", async () => {
    const ev = fixture();
    ev.requestContext.http.method = "GET";
    ev.routeKey = "GET /graphql";
    ev.body = undefined;
    const res = await handler(ev, ctx);
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body ?? "{}")).toMatchObject({ status: "ok" });
  });

  it("returns GraphQL errors (not a stack) for a bad query", async () => {
    const ev = fixture();
    ev.body = JSON.stringify({ query: "{ nope }" });
    const res = await handler(ev, ctx);
    expect(res.statusCode).toBe(400);
    expect(res.body).not.toMatch(/stacktrace/);
  });
});
