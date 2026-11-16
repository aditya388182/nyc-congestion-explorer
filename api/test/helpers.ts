import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "../src/app.js";
import type { App } from "../src/app.js";
import { loadData } from "../src/store/dataStore.js";
import type { DataStore } from "../src/store/dataStore.js";
import { logger } from "../src/logger.js";
import pino from "pino";

export const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const quietLogger = pino({ level: process.env["TEST_LOG"] ?? "silent" });

let data: DataStore | undefined;
export function sharedData(): DataStore {
  data ??= loadData(join(REPO, "api", "data"));
  return data;
}

export function newApp(): App {
  return createApp(sharedData(), quietLogger);
}

export async function runQuery(app: App, query: string, variables?: Record<string, unknown>) {
  const res = await app.server.executeOperation({ query, variables }, { contextValue: await app.context() });
  if (res.body.kind !== "single") throw new Error("unexpected incremental response");
  return res.body.singleResult;
}

export function readResultsJson(name: string): unknown {
  return JSON.parse(readFileSync(join(REPO, "results", `${name}.json`), "utf8"));
}

export function stamp(command: string): Record<string, unknown> {
  const git = (...a: string[]): string => execFileSync("git", a, { cwd: REPO, encoding: "utf8" }).trim();
  return {
    commit: git("rev-parse", "--short", "HEAD"),
    dirty: git("status", "--porcelain", "--", ".", ":!results", ":!data").length > 0,
    generated_at_utc: new Date().toISOString().replace(/\.\d+Z$/, "+00:00"),
    command,
  };
}
export { logger };
