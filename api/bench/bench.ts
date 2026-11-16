/**
 * API latency benchmark (SPEC 9.7). LOCAL, NOT LAMBDA: a freshly started local server on this machine.
 * 36 standard combinations (3 trip types x 3 controls x boundary dropped/kept x 2 outcomes), run
 * cold (empty LRU cache) then warm (same requests again). The server is restarted for every round
 * so each round's cold requests really hit an empty cache.
 */
import { execFileSync, spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import os from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PORT = 4010;
const ROUNDS = 5;
const QUERY = `query($i: EstimateInput!){ estimate(input:$i){ cached computeMs nObs } }`;
const TARGET_P95_MS = 1000;

const types = ["YELLOW", "FHVHV", "ALL"];
const controls = ["A", "B", "AB"];
const cases = types.flatMap((tripType) =>
  controls.flatMap((control) =>
    [true, false].flatMap((dropBoundary) => ["DROPOFFS", "PICKUPS"].map((outcome) => ({ tripType, control, dropBoundary, outcome }))),
  ),
);

function pct(sorted: number[], p: number): number {
  const i = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, i)] as number;
}
const stats = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return { n: s.length, p50: pct(s, 50), p95: pct(s, 95), max: s[s.length - 1] as number, mean: s.reduce((a, b) => a + b, 0) / s.length };
};

async function post(input: unknown): Promise<{ ms: number; computeMs: number; cached: boolean }> {
  const t0 = performance.now();
  const res = await fetch(`http://127.0.0.1:${PORT}/graphql`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query: QUERY, variables: { i: input } }),
  });
  const body = (await res.json()) as { data?: { estimate: { cached: boolean; computeMs: number } }; errors?: unknown };
  const ms = performance.now() - t0;
  if (!body.data) throw new Error(`request failed: ${JSON.stringify(body.errors)}`);
  return { ms, computeMs: body.data.estimate.computeMs, cached: body.data.estimate.cached };
}

async function startServer(): Promise<{ stop: () => void; panelLoadMs: number }> {
  const child = spawn(join(REPO, "node_modules", ".bin", "tsx"), ["src/server.ts"], {
    cwd: join(REPO, "api"),
    env: { ...process.env, PORT: String(PORT), NODE_ENV: "production" },
    stdio: ["ignore", "pipe", "inherit"],
  });
  const panelLoadMs = await new Promise<number>((resolve, reject) => {
    let buf = "";
    child.stdout.on("data", (d: Buffer) => {
      buf += d.toString();
      const m = /"panelLoadMs":([0-9.]+)/.exec(buf);
      if (m) resolve(Number(m[1]));
    });
    child.on("exit", (c) => {
      reject(new Error(`server exited ${String(c)}`));
    });
  });
  return { stop: () => child.kill("SIGTERM"), panelLoadMs };
}

const coldClient: number[] = [];
const warmClient: number[] = [];
const coldCompute: number[] = [];
const warmCompute: number[] = [];
const panelLoads: number[] = [];
for (let round = 0; round < ROUNDS; round++) {
  const s2 = await startServer(); // fresh process = empty cache; no warm-up request to the estimator
  panelLoads.push(s2.panelLoadMs);
  for (const c of cases) {
    const r = await post(c);
    if (r.cached) throw new Error("expected a cold (uncached) estimate");
    coldClient.push(r.ms);
    coldCompute.push(r.computeMs);
  }
  for (const c of cases) {
    const r = await post(c);
    if (!r.cached) throw new Error("expected a warm (cached) estimate");
    warmClient.push(r.ms);
    warmCompute.push(r.computeMs);
  }
  s2.stop();
  await new Promise((r) => setTimeout(r, 300));
}

const git = (...a: string[]): string => execFileSync("git", a, { cwd: REPO, encoding: "utf8" }).trim();
const cold = stats(coldClient);
const out = {
  label: "local, not Lambda",
  what: "HTTP round trip to a freshly started local server on 127.0.0.1 (includes JSON, GraphQL execution and the estimate)",
  cases: cases.length,
  rounds: ROUNDS,
  cold_client_ms: cold,
  warm_client_ms: stats(warmClient),
  cold_compute_ms: stats(coldCompute),
  warm_compute_ms: stats(warmCompute),
  panel_load_ms: stats(panelLoads),
  target_cold_p95_ms: TARGET_P95_MS,
  meets_target: cold.p95 < TARGET_P95_MS,
  machine: { cpu: os.cpus()[0]?.model, vcpus: os.cpus().length, total_mem_gb: Math.round(os.totalmem() / 2 ** 30), node: process.version, platform: `${os.platform()} ${os.release()}` },
  commit: git("rev-parse", "--short", "HEAD"),
  dirty: git("status", "--porcelain", "--", ".", ":!results", ":!data").length > 0,
  generated_at_utc: new Date().toISOString().replace(/\.\d+Z$/, "+00:00"),
  command: "npm run -w api bench",
};
writeFileSync(join(REPO, "results", "api_latency.json"), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
