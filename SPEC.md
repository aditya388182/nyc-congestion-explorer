# NYC Congestion Pricing Impact Explorer: A-to-Z Build Guide

**Project 5 of 5** (P4 in the master plan): a data science project with a full software stack.

**How to use this file:** it lives in the repo as `SPEC.md`, next to `CLAUDE.md`. SPEC.md is the source of truth. Build one phase at a time (section 14). Every phase ends with a **Check** whose real output must be shown.

---

## 0. Situation (read first)

- **New repo** `nyc-congestion-explorer`, branch `main`. At the start it holds only this spec, `CLAUDE.md`, `.claude/settings.json` and `.gitignore`.
- **Machine:** an Ubuntu 24.04 EC2 box (t3.2xlarge: 8 vCPUs, 32 GB RAM, a 96 GB disk with other projects' files on it). Docker is installed, sudo is passwordless, and the box has **no AWS credentials**. It reaches the internet directly.
- **Data host:** TLC trip files are on `https://d37ci6vzurychx.cloudfront.net/trip-data/`. Take every URL from the TLC trip record page (https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page); never guess a file name. On the day this spec was written, the latest month listed was **September 2026** for yellow, green and high-volume FHV (`fhvhv`).
- **Downloads:** at most 2 at a time, retry with backoff, and record a failed file in the manifest. If the host blocks you, stop downloading, write it in BLOCKERS.md, and finish everything else on the months you have. Never use a third-party mirror (Kaggle, Hugging Face, BigQuery copies): the reconciliation only means something against the official files.
- **Deployment is mine (Phase 9).** You write and test the AWS CDK stack (`cdk synth`, cdk-nag, assertion tests) but never deploy, bootstrap or call AWS.
- **A spec fact turns out wrong** (a column name, a library API, a version, a date): record the evidence in DECISIONS.md, correct this spec, and continue.

---

## 1. What you are building

**One-line pitch:** what did New York's Manhattan congestion toll, which started on 5 January 2025, do to taxi and ride-hail trips into the zone? A reproducible causal study over the official TLC trip records, published as an interactive map app whose API re-runs the estimate live.

**The distinct engineering problem:** an API that re-estimates a two-way fixed-effects difference-in-differences model on demand (any trip type, control group, outcome, set of left-out zones, or placebo start date), fast enough for a web request on AWS Lambda, using an estimator ported from Python to TypeScript and proven to match statsmodels.

### What it proves

| Track | Proof |
|---|---|
| DS | Difference-in-differences with zone and week fixed effects and zone-clustered standard errors; an event study with a joint pre-trend Wald test; placebo start dates; a planted-effect simulation (bias and CI coverage); a robustness table; a spillover check; a 2-page memo whose numbers are checked by a test |
| DE | Hundreds of millions of raw trip rows from 3 TLC datasets (the measured count goes in `results/`), reduced with DuckDB SQL into a weekly zone panel; a per-file manifest with sha256 and a reconciliation where raw rows = kept + excluded by reason, with zero unexplained rows; DuckDB spatial for zone adjacency |
| SWE | Node.js/TypeScript GraphQL API (Apollo Server, DataLoader, query-complexity and depth limits, an LRU cache); Vue 3 + Pinia + MapLibre GL frontend; AWS Lambda, API Gateway, S3 and CloudFront in AWS CDK with cdk-nag; Vitest, fast-check property tests, Playwright with axe; GitHub Actions CI |

**The interview story:** "I let the data decide which zones are treated, fixed the main specification before I looked at any estimate, and proved the estimator recovers a planted −8% effect before running it on real data. The API re-runs the regression live in TypeScript, and a test checks it against statsmodels on 61 cases."

### Resume lines this build must make true (2-page SWE/AI version)
- "Built a weekly zone-level panel from NYC taxi and ride-hail trip records (Jan 2023 onward) with **DuckDB** SQL window functions, reconciled so raw rows equal kept plus excluded rows, by reason, for every file."
- "Estimated the toll's effect with **difference-in-differences** (zone-clustered standard errors), an **event study** with a joint pre-trend test, placebo start dates, and a planted-effect test proving the estimator recovers a known −8%."
- "Built a **Node.js**/TypeScript **GraphQL** API (Apollo Server, DataLoader, query-complexity limits) that re-runs the estimate on demand by trip type and control group, using an estimator ported to TypeScript and checked against statsmodels; runs on **AWS Lambda**, provisioned with **AWS CDK**."
- "Built a **Vue 3** frontend (TypeScript, Pinia, **MapLibre GL**): a zone map colored by trip change with a spillover-ring toggle, live re-estimation controls, and the event-study chart; served from S3 and **CloudFront**; **Vitest** and fast-check property tests."

**One-page version:** "Built a Node.js GraphQL API on AWS Lambda (CDK) and a Vue 3 map that re-run a difference-in-differences estimate on demand, with the estimator ported to TypeScript and checked against statsmodels."

"Runs on AWS Lambda" and "served from S3 and CloudFront" become true only after Phase 9 (my deploy). Until then the resume says "AWS CDK stack for Lambda, API Gateway, S3 and CloudFront". "−8%" is the planted effect (test setup); the real effect is whatever the data gives, and a null or mixed result is written up the same way.

---

## 2. Scope

### In scope
- **Data:** yellow, green and fhvhv trip records, **January 2023 to the latest month listed** on the TLC page.
- **Question:** the effect on trips ending in the charged zone (main), and trips starting there (secondary), by trip type.
- **Design:** treated zones from the data (section 6.1); control groups A, B and A+B; a spillover ring.
- **Estimates:** the pre-registered main DiD, an event study, two placebo dates, 8 robustness rows, a spillover estimate, a planted-effect simulation.
- **App:** a GraphQL API (Lambda handler plus a local server, one schema) and a Vue 3 web app with Map, Estimate and Data & Method pages.
- **Infrastructure:** a CDK stack and CI; deploy and a live smoke test are mine (Phase 9).
- **Memo:** 2 pages, numbers generated and checked.

### Out of scope
Synthetic control, wild cluster bootstrap, Poisson (PPML) estimation, private-vehicle counts, subway or bus ridership, traffic speeds, weather data, the standard (non-high-volume) FHV dataset, user accounts, any data needing an account. List them as limitations or "next steps" in the memo where relevant.

---

## 3. Architecture

```
 TLC trip files (Parquet, CloudFront)          TLC taxi zone shapefile
            │ download 2 at a time, sha256            │
            ▼                                          ▼
 study/ (Python 3.12, uv, DuckDB)      DuckDB spatial: zone polygons → WGS84 GeoJSON,
   aggregate_month.sql per file ──►    adjacency (ST_Touches) → spillover ring
   raw file deleted after aggregation
            │
            ▼
 data/agg/*.parquet (committed, small) + data/manifest.csv + results/reconciliation.json
            │
            ▼
 panel.sql (weekly zone panel, window functions) → statsmodels: DiD, event study,
 placebos, specs, spillover, planted-effect simulation → results/*.json, figures, memo
            │
            ├── export: api/data/panel.bin + panel.meta.json + zones.geojson (bundled into Lambda)
            └── export: results/estimator_reference.json (61 cases for the TS equivalence test)

 api/ (Node.js, TypeScript, Apollo Server)
   schema.graphql → resolvers → DataLoader → in-memory panel store
   estimate: TypeScript two-way FE estimator + cluster-robust SE, LRU cache
   complexity + depth limits; handler for Lambda (HTTP API v2 events) and a local server

 web/ (Vue 3, Vite, TypeScript, Pinia, MapLibre GL, urql + GraphQL codegen)
   Map │ Estimate │ Data & Method

 infra/ (AWS CDK, TypeScript)
   CloudFront ──► S3 (private, OAC) for the web build
             └──► /graphql ──► API Gateway HTTP API (throttled) ──► Lambda (Node.js, arm64)
```

### Key design decisions (be able to explain each)
1. **Aggregate per file, then delete the raw file.** About 25 GB of raw Parquet passes through the box; only small daily aggregates are kept and committed. The study reruns from the aggregates in seconds.
2. **The panel is bundled into the Lambda package**, as a compact typed-array binary. No database, no S3 read on the request path; cold start loads it once.
3. **Same origin through CloudFront** (`/graphql` routed to the API), so the browser needs no CORS.
4. **API Gateway throttling, not Lambda reserved concurrency,** bounds cost: new AWS accounts often have a concurrency limit of 10, which leaves nothing to reserve.
5. **The main specification is fixed in this spec before any estimate runs** (section 7.1). Every other choice is a robustness row.
6. **Weeks start on Sunday**, because the toll started on Sunday 5 January 2025. With Monday weeks, one week would mix 6 untreated days and 1 treated day.

---

## 4. Repo layout

```
nyc-congestion-explorer/
  SPEC.md  CLAUDE.md  README.md  Makefile  VERSIONS.md
  PROGRESS.md  DECISIONS.md  BLOCKERS.md  PROBE.md  DONE.md
  study/                      # Python 3.12, uv
    pyproject.toml  uv.lock
    src/congestion/  download.py manifest.py aggregate.py zones.py panel.py
                     did.py event_study.py placebo.py specs.py spillover.py planted.py
                     export.py memo.py results.py bullets.py
    sql/  aggregate_month.sql  zones.sql  panel.sql
    tests/  fixtures/
  data/
    SOURCE.md  manifest.csv
    raw/          # gitignored; each file deleted after aggregation
    agg/          # committed: daily_counts.parquet, intra_zone.parquet, zones.geojson
  api/                        # Node.js, TypeScript, Apollo Server
    src/ schema.graphql resolvers/ loaders/ estimator/ store/ limits/ lambda.ts server.ts
    data/  panel.bin panel.meta.json zones.geojson   # generated by `make export`, committed
    test/  bench/
  web/                        # Vue 3, Vite
    src/ pages/ components/ stores/ graphql/ (generated) lib/
    e2e/
  infra/                      # AWS CDK
    bin/ lib/ test/
  results/  reports/memo.md  reports/memo.pdf  reports/figures/
  docs/screenshots/  docs/demo.gif
  .github/workflows/ci.yml
```

Node packages use npm workspaces (`api`, `web`, `infra`) with one `package-lock.json`.

---

## 5. Data

### 5.1 Files
- `yellow_tripdata_YYYY-MM.parquet`, `green_tripdata_YYYY-MM.parquet`, `fhvhv_tripdata_YYYY-MM.parquet`, January 2023 to the latest month listed for all three.
- Taxi zone shapefile (`taxi_zones.zip`) and zone lookup CSV, from the links on the TLC page.
- Record every source in `data/SOURCE.md`: URL, download date, bytes, sha256, row count, and the terms note from the TLC page.

### 5.2 Columns (confirm each in the Phase 0 probe; schemas changed across years)
| Type | Pickup / dropoff time | Zones | Fee |
|---|---|---|---|
| yellow | `tpep_pickup_datetime`, `tpep_dropoff_datetime` | `PULocationID`, `DOLocationID` | `cbd_congestion_fee` (2025 on) |
| green | `lpep_pickup_datetime`, `lpep_dropoff_datetime` | same | `cbd_congestion_fee` (2025 on) |
| fhvhv | `pickup_datetime`, `dropoff_datetime` | same | `cbd_congestion_fee` (2025 on; the TLC data dictionary says "Per-trip charge for MTA's Congestion Relief Zone starting Jan. 5, 2025") |

Column types and capitalisation vary by year: read with explicit casts and `union_by_name`, never by position. Timestamps are local New York time without a zone.

### 5.3 The toll (confirm on the MTA taxi/FHV toll page and cite it)
Per trip into, out of or within the Congestion Relief Zone (Manhattan at or below 60th Street, excluding the FDR Drive, the West Side Highway and the Battery Park Underpass): **$0.75** for yellow and green taxis, **$1.50** for high-volume FHV trips. This is the dose check in section 7.4.

### 5.4 Exclusion rules (applied in this order; each dropped row gets the first reason that matches)
1. `null_zone`: `PULocationID` or `DOLocationID` is null
2. `unknown_zone`: either zone is 264 or 265
3. `outside_month`: the pickup time is outside the file's month
4. `bad_duration`: dropoff minus pickup is under 1 minute or over 4 hours (including negative)

**Reconciliation test:** for every file, `parquet_metadata_rows = count(*) = kept + Σ dropped_by_reason`, with **zero** unexplained rows. Totals go to `results/reconciliation.json`.

### 5.5 Aggregates kept (per file, then appended)
- `daily_counts`: (trip_type, date, zone, direction ∈ {dropoff, pickup}, trips, trips_with_fee, fee_sum). Dropoff counts use `DOLocationID` and the dropoff date; pickup counts use `PULocationID` and the pickup date.
- `intra_zone`: (trip_type, month, zone, trips with pickup zone = dropoff zone, of which `cbd_congestion_fee > 0`). Used to classify zones (section 6.1).
- Record the size of `data/agg/` in PROGRESS.md. If it exceeds 50 MB, aggregate to weeks instead and record why.

### 5.6 Manifest (`data/manifest.csv`, restartable)
One row per file: url, trip_type, month, bytes, sha256, parquet_rows, rows_counted, kept, dropped by each reason, unexplained, aggregated_at, status. `make data` skips files already marked `done`, so a crash costs one file.

---

## 6. Zones and the panel

### 6.1 Treated zones come from the data
- For each zone, the share of **intra-zone 2025 trips** (pickup and dropoff in the same zone) with `cbd_congestion_fee > 0`, all types pooled. An intra-zone trip inside the charged zone pays; one outside does not; so the share separates the zones cleanly without trips that only start or end inside.
- **Treated:** share ≥ 0.95. **Outside:** share ≤ 0.05. **Boundary:** in between, listed by name. Zones with fewer than 200 intra-zone 2025 trips are listed as "too few to classify" and left out of every group.
- Cross-check against the TLC zone lookup: every treated zone must be in Manhattan. A treated zone elsewhere is a bug; stop and investigate.
- The toll start is also checked in the data: the share of trips with a fee > 0 by day, from late December 2024 to mid January 2025, must jump on 5 January 2025. Save the plot.

### 6.2 Groups
- **Control A:** Manhattan zones classified outside, not boundary.
- **Control B:** the 60 busiest non-Manhattan zones by 2024 dropoffs (all types), excluding the airports (zones 1, 132 and 138).
- **Control AB:** both.
- **Spillover ring:** non-treated zones that share a border with a treated zone, from the shapefile with DuckDB spatial (`ST_Touches` or a tiny-buffer `ST_Intersects`; record which and why). Ring zones stay in control A for the main estimate; the spillover check (section 7.5) tests whether that matters.
- Polygons: the shapefile is in NY State Plane (EPSG:2263). Transform to WGS84 for GeoJSON with `ST_Transform(..., always_xy := true)` and check one known zone lands in Manhattan (axis order is a common bug). Simplify for the web; keep the full geometry for adjacency.
- Saved to `results/zones.json` (every zone with its group, share and ring flag) and `data/agg/zones.geojson`.

### 6.3 Weekly panel (`sql/panel.sql`)
- Unit: zone × week × trip type (`yellow`, `green`, `fhvhv`, `all` = the sum) × outcome (`dropoffs`, `pickups`).
- **Week:** starts Sunday. In DuckDB, `date_trunc('week', d + INTERVAL 1 DAY) - INTERVAL 1 DAY`. Only complete weeks inside the data range.
- Window columns: same week last year (`LAG(trips, 52)`), 4-week rolling mean, pre-period volume rank. The map's "change" uses them: mean weekly trips in the first 52 post weeks vs the same 52 weeks a year earlier.
- **Balanced panel:** a zone enters an estimate for a given type and outcome only if it has trips > 0 in every week of the window; dropped zones are listed in the result. Outcome is `log(trips)`.
- **Fixture test:** a hand-built 3-zone, 10-week fixture (including a Sunday-week boundary and a year gap for `LAG(52)`) with a known answer for every column.

---

## 7. The study (Python: statsmodels, numpy, pandas, scipy)

### 7.1 Main specification (pre-registered; do not change it after seeing results)
- `log(trips) = zone FE + week FE + β·(treated × post) + ε`, OLS, **standard errors clustered by zone**.
- Outcome `dropoffs`, trip type `all`, control **AB**, boundary zones dropped, post = weeks starting on or after 5 January 2025, window = January 2023 to the latest complete week.
- Effect % = `100·(exp(β) − 1)`, with the 95% CI transformed the same way.
- **Reference implementation:** statsmodels OLS with explicit zone and week dummies and `cov_type="cluster"` (statsmodels' default small-sample correction). This is what the TypeScript port must match.

### 7.2 Event study
- Treated × relative-month dummies from −24 to the last complete month, omitting −1, with zone and week FE, clustered by zone.
- Plot with 95% CIs; save `reports/figures/event_study.png`.
- **Joint Wald test that all leads (−24 to −2) are zero,** with the cluster-robust covariance: report the statistic, degrees of freedom and p-value, both χ² and F forms. The plot alone is not a test.
- Computed for every trip type × control group (9 combinations) and saved, so the API can serve them.

### 7.3 Placebos
Re-estimate on pre-2025 weeks only, with fake start dates of **5 January 2024** and **30 June 2024** (the original launch date, paused in June 2024). Confirm both dates in news sources and cite them in the memo.

### 7.4 Robustness table (`results/specs.csv` and `.json`, 8 rows)
1. Main (section 7.1)
2. Control A only
3. Control B only
4. Boundary zones kept as treated
5. Outcome = pickups
6. Yellow only ($0.75)
7. fhvhv only ($1.50): rows 6 and 7 together are the dose check
8. Weighted by each zone's 2024 trip volume (WLS)

Each row: β, % effect, 95% CI, number of treated and control zones, weeks, observations, dropped zones.

### 7.5 Spillover
Estimate the ring zones against control B (ring = "treated"). If the ring moved, the memo says control A is contaminated and the main estimate's direction of bias.

### 7.6 Planted-effect simulation (Phase 3: built and passed before any real estimate)
- From the real **pre-2025** panel, estimate zone means, week effects, each zone's residual SD and a pooled AR(1) coefficient. Simulate panels with the real zones and weeks from those, then plant **−8%** on treated zones after the start date.
- Seeds 0–19. **Pass:** mean bias under 1 percentage point, and the 95% CI covers −8% in at least 17 of 20 (a nominal 95% CI misses 1–3 of 20 by chance).
- **Pre-trend power:** plant a linear pre-trend of 0.5% per month over the 24 lead months instead; the joint lead test must reject at 5% in at least 18 of 20 seeds. Also report the rejection rate with no planted trend (the test's size).
- If it fails, find the bug. Never loosen a threshold to pass; if the estimator is right and the design genuinely can't hit a threshold, record the evidence in DECISIONS.md and report the measured values.
- `results/planted.json`: bias, coverage, both rejection rates, seeds, the simulation parameters.

### 7.7 Headline (`results/headline.json`)
`total_trips_raw, total_trips_kept, n_files, first_month, last_month, n_treated_zones, n_boundary_zones, n_control_a, n_control_b, n_ring, main_beta, main_estimate_pct, ci_low_pct, ci_high_pct, pretrend_stat, pretrend_df, pretrend_p, n_specs, spec_min_pct, spec_max_pct, yellow_pct, fhvhv_pct, spillover_pct, commit, dirty, generated_at_utc, command`.

---

## 8. Export for the API

- `make export` writes `api/data/panel.bin` (Float64Array/Int32Array columns, little-endian) and `panel.meta.json` (zone ids, week starts, types, outcomes, offsets, sha256 of the binary), plus `zones.geojson`.
- A Vitest test loads the binary and checks a sample of 1,000 cells, the totals and the sha256 against values Python wrote into the meta file.
- `results/estimator_reference.json`: statsmodels β and clustered SE for **61 cases**: all 36 combinations of trip type (`yellow`, `fhvhv`, `all`) × control (A, B, AB) × boundary (dropped, kept) × outcome (dropoffs, pickups); 20 seeded random sets of 1–10 excluded zones; 5 placebo start dates inside the pre period.

---

## 9. GraphQL API (`api/`, Node.js, TypeScript strict)

### 9.1 Libraries
Apollo Server (current major; Apollo Server 4 reached end of life in January 2026), its AWS Lambda integration for HTTP API v2 events, `dataloader`, `graphql-query-complexity` (or the current maintained equivalent) and a depth limit, `lru-cache`, `zod` for input validation, `pino` JSON logs. Node.js at the newest major the Lambda runtime supports (Node.js 24 at the time of writing), the same locally. Pin exact versions.

### 9.2 Schema (`schema.graphql`, schema-first; types generated with GraphQL Code Generator)
```graphql
enum TripType { YELLOW GREEN FHVHV ALL }
enum ControlGroup { A B AB }
enum Outcome { DROPOFFS PICKUPS }
enum ZoneGroup { TREATED BOUNDARY CONTROL_A CONTROL_B OTHER UNCLASSIFIED }

type Query {
  zones: [Zone!]!
  zone(id: Int!): Zone
  estimate(input: EstimateInput!): Estimate!
  eventStudy(tripType: TripType!, control: ControlGroup!): EventStudy!
  placebos: [Placebo!]!
  specs: [Spec!]!
  reconciliation: Reconciliation!
  meta: Meta!
}

type Zone {
  id: Int!  name: String!  borough: String!  group: ZoneGroup!  ring: Boolean!
  geometry: JSON!
  change(tripType: TripType!, outcome: Outcome!): Float      # % change, post 52 weeks vs a year earlier
  weekly(tripType: TripType!, outcome: Outcome!): [WeekPoint!]!   # batched with DataLoader
}

input EstimateInput {
  tripType: TripType!  control: ControlGroup!  dropBoundary: Boolean!  outcome: Outcome!
  excludeZones: [Int!]       # at most 20; unknown ids → BAD_USER_INPUT
  placeboStart: String       # ISO date before 2025-01-05; uses pre-2025 weeks only; ≥13 weeks each side
}
# Fewer than 5 treated or 5 control zones left after balancing and exclusions → BAD_USER_INPUT.
# eventStudy serves the 9 precomputed combinations (YELLOW, FHVHV, ALL × A, B, AB); GREEN → BAD_USER_INPUT.

type Estimate {
  beta: Float!  se: Float!  effectPct: Float!  ciLowPct: Float!  ciHighPct: Float!
  nTreated: Int!  nControl: Int!  nWeeks: Int!  nObs: Int!  droppedZones: [Int!]!
  cached: Boolean!  computeMs: Float!
}
```
(EventStudy, Placebo, Spec, Reconciliation, Meta, WeekPoint and the JSON scalar: define them to match `results/*.json`.)

### 9.3 Estimator port (`src/estimator/`)
- Two-way fixed effects by **alternating-projection demeaning** (zone means, then week means, repeated to a tolerance of 1e-12), which is exact for balanced and unbalanced panels; then OLS on the demeaned variables.
- Cluster-robust SE by zone with statsmodels' correction: `G/(G−1) · (N−1)/(N−K)`, where K counts the intercept and every zone and week dummy, as in the explicit-dummy reference.
- **Equivalence test:** every case in `estimator_reference.json` matches within 1e-8 relative on β and SE. Record the largest differences in `results/estimator_equivalence.json`.
- **fast-check property tests:** adding a constant to one zone's outcomes doesn't change β; adding a constant to one week's outcomes doesn't change β; row order doesn't change β or SE; a noise-free planted effect is recovered exactly; excluding a zone equals removing its rows.

### 9.4 Limits and caching
- Query depth limit 6; complexity limit with `weekly` costed per zone (one zone's series = 10, the estimate = 50). A query asking for every zone's weekly series for every type must be rejected with `extensions.code = QUERY_TOO_COMPLEX` and the computed cost in the message.
- Introspection off when `NODE_ENV=production`, on locally.
- `estimate` results cached in an LRU (500 entries), keyed by the normalized input (sorted `excludeZones`). `cached` and `computeMs` are returned so the UI and the benchmark can show them.
- Errors: `BAD_USER_INPUT` with a clear message for invalid input; never a stack trace in a response.

### 9.5 DataLoader
`Zone.weekly` uses a per-request DataLoader keyed by (zone, type, outcome). A test counts store reads: a query for 50 zones' series does one batched read, not 50.

### 9.6 Two entry points, one schema
`src/lambda.ts` (the Lambda handler) and `src/server.ts` (a local HTTP server on 127.0.0.1:4000 for development and Playwright). A test invokes the Lambda handler directly with a recorded HTTP API v2 event.

### 9.7 Benchmark (`make bench` → `results/api_latency.json`)
On this box, against the local server: every one of the 36 standard combinations, the cache cleared first, then the same requests warm. Report p50, p95 and max for cold-cache and warm-cache estimates, the panel load time at handler start, and the machine. Label it "local, not Lambda". Target: a cold-cache estimate under 1 s at p95; report the measured value whatever it is.

---

## 10. Frontend (`web/`, Vue 3, Vite, TypeScript strict)

### 10.1 Libraries
Vue 3 (current 3.x), Vue Router, Pinia, MapLibre GL JS (current major), urql for Vue with GraphQL Code Generator's typed documents, Chart.js through one small wrapper component. No UI kit is required; keep the CSS small and accessible.

### 10.2 Pages
- **Map:**
  - zone polygons colored by `change` on a diverging scale with a legend; treated zones outlined; a toggle that highlights the spillover ring
  - trip-type and outcome toggles
  - clicking a zone opens a side panel: name, group, the weekly series chart with 5 January 2025 marked, and an "Exclude from the estimate" button
  - polygons only, on a plain background. A basemap only if its terms allow this use and its attribution is shown; record the choice in DECISIONS.md.
- **Estimate:**
  - the headline number with its CI, and controls (trip type, control group, drop boundary, outcome, excluded zones, a placebo date picker) that call `estimate` live, with a loading state and the `computeMs`
  - the event-study chart with the lead-test p-value printed under it
  - the placebo table and the 8-row robustness table
- **Data & Method:**
  - the reconciliation table (raw, kept, dropped by reason, unexplained = 0) and the sources
  - the design in plain words, the pre-registered main specification, the planted-effect result
  - limitations: other 2025 changes (return-to-office policies; the federal attempt to end the program and the court rulings that followed, with dates confirmed and cited), weather, TLC data revisions, trips that avoid the zone rather than disappear, unweighted zone averages
  - a link to the memo PDF

### 10.3 Quality
Strict TypeScript, no `any`; API types only from codegen (`make contract` shows no diff); every network error shown to the user; keyboard reachable controls with labels; axe clean in Playwright; the map works at phone width (the side panel becomes a bottom sheet).

---

## 11. Infrastructure (`infra/`, AWS CDK v2, TypeScript)

- **Lambda:** the API bundled with esbuild, the newest Node.js runtime Lambda supports, arm64, 1,024 MB, 10 s timeout, `panel.bin` and the meta file included in the bundle, log retention 2 weeks.
- **API Gateway HTTP API:** one route `POST /graphql` (and `GET` for health), default-stage throttling (rate 20/s, burst 40).
- **S3:** a private bucket (block public access, enforce TLS) for the web build, deployed with `BucketDeployment`.
- **CloudFront:** S3 origin with Origin Access Control as the default behavior; `/graphql` routed to the HTTP API origin with caching disabled and all query strings and the body forwarded; SPA fallback to `index.html`; a security-headers response policy; HTTPS only.
- **No Lambda reserved concurrency** (design decision 4).
- **Checks:** `cdk synth` succeeds; cdk-nag (AwsSolutions) has zero unsuppressed findings, and each suppression has a written reason; assertion tests check the runtime, architecture, throttling, the bucket's public access block, the OAC and the `/graphql` behavior.
- `make deploy` and `make smoke URL=…` exist for me. `make smoke` sends 20 `estimate` requests through the CloudFront URL and writes `results/deploy_smoke.json` (status codes, p50/p95, the first request's latency, the URL, date, commit). Never run either.

---

## 12. Tests and CI

| Suite | What | Where |
|---|---|---|
| pytest (study) | exclusion rules and reconciliation on small fixture files; zone classification on a fixture; panel window columns on the 3-zone fixture; DiD on a tiny hand-computed panel; planted-effect (fast mode in CI: 5 seeds; full 20 in `make study`); memo number check | CI |
| Vitest (api) | equivalence (61 cases), fast-check properties, the binary loader, DataLoader batching, complexity and depth rejections, input validation, the Lambda handler with a recorded event | CI |
| Vitest (web) | components (zone panel, estimate controls, tables), the color-scale helper with fast-check, stores | CI |
| Vitest (infra) | CDK assertions and cdk-nag | CI |
| Playwright | against the local API and `vite preview`: the map loads and colors zones; click a zone → its chart loads; exclude a zone → the estimate updates; change trip type and control → the estimate updates; a placebo date → a placebo estimate; the Data & Method page shows unexplained = 0; axe clean on every page | CI (the committed aggregates make it light) |
| Contract | regenerate GraphQL types; no diff | CI |
| Bench | section 9.7 | local |
| Full study | `make all` downloads ~25 GB | local |

All counts go to `results/tests.json` from the runners' JSON output. CI (`.github/workflows/ci.yml`) runs on every push and PR: study (uv, ruff, pytest), api, web, infra, contract, Playwright. Every job must fit a standard GitHub-hosted runner.

---

## 13. Results, evidence and resume bullets

- Every `results/*.json` has `commit`, `dirty`, `generated_at_utc` and `command`.
- `make readme` writes the README's numbers table from `results/*.json`.
- `make memo` fills `reports/memo.md` from `results/*.json` and renders `reports/memo.pdf` (at most 2 pages; Playwright's PDF output is fine). A test parses the memo and checks every number against the JSON.
- `make bullets` prints these, with MISSING for an absent key:
  - "Built a weekly zone-level panel from {total_trips_raw} NYC taxi and ride-hail trip records ({first_month} to {last_month}, {n_files} files) with DuckDB SQL window functions, reconciled to zero unexplained rows by exclusion reason."
  - "Estimated the toll's effect on trips into the zone with difference-in-differences (zone-clustered SEs): {main_estimate_pct}% (95% CI {ci_low_pct} to {ci_high_pct}); event-study pre-trend test p = {pretrend_p}; placebo dates; {n_specs} robustness specs from {spec_min_pct}% to {spec_max_pct}%; a planted −8% was recovered with {bias_pp} pp mean bias and {coverage}/20 CI coverage."
  - "Built a Node.js/TypeScript GraphQL API (Apollo Server, DataLoader, query-complexity limits) that re-runs the estimate on demand, with an estimator ported to TypeScript that matches statsmodels on {n_cases} cases (max relative difference {max_rel_diff}); cold-cache estimate p95 {cold_p95_ms} ms (local)."
  - "Built a Vue 3 frontend (TypeScript, Pinia, MapLibre GL) with live re-estimation and an event-study chart; {vitest_total} Vitest tests including fast-check properties, {playwright_passed} Playwright tests; AWS CDK stack for Lambda, API Gateway, S3 and CloudFront."
  - After Phase 9 only: "Deployed on AWS Lambda behind CloudFront: {deploy_p95_ms} ms p95 over {n} live requests."

---

## 14. Build phases (commit at the end of each, with a message naming the phase)

### Phase 0: versions, scaffolding and the data probe
Install uv with Python 3.12, Node.js (the Lambda major), and Playwright's browsers and system dependencies. Scaffold `study/`, `api/`, `web/`, `infra/`, the Makefile and CI. Pin versions in `VERSIONS.md`. Write `PROBE.md` with evidence (URL, excerpt, answer) for: the TLC page's listed months per type; one example URL; each type's schema in January 2023, January 2024 and January 2025 (names and types of the columns in section 5.2); `cbd_congestion_fee` values and their frequency per type in January 2025 (expect 0.75 and 1.50; record what is there); the shapefile's CRS and zone count; the MTA toll page amounts; the dates in section 7.3 and the court timeline, with sources.
**Check:** `PROBE.md`, `VERSIONS.md`, `make help`, and CI's lint jobs passing locally.

### Phase 1: download, aggregate, manifest, reconciliation
Build `make data`. **Run one yellow month (January 2025) first and show its reconciliation before downloading anything else.** Then all files.
**Check:** `data/manifest.csv` summary (files, bytes, raw rows, kept, dropped by reason), `results/reconciliation.json` with unexplained = 0 for every file, the pytest output, `data/agg/` size, and free disk space after.

### Phase 2: zones and the weekly panel
Zone classification, the fee-share jump plot, groups, ring, GeoJSON, `panel.sql`, fixture tests.
**Check:** the zone table (treated, boundary, too-few, controls, ring, with names), the jump plot, a static map image of the groups, and the fixture test output.

### Phase 3: planted-effect simulation (before any real estimate)
**Check:** `results/planted.json` with bias, coverage, pre-trend rejection rate and size.

### Phase 4: real estimates
Main, event study (9 combinations), placebos, robustness table, spillover, `headline.json`, figures, `make export`, `estimator_reference.json`.
**Check:** `headline.json`, `specs.csv`, the event-study figure with the lead-test numbers, the placebo and spillover results.

### Phase 5: GraphQL API
**Check:** Vitest output (equivalence, properties, DataLoader, limits, handler), `results/estimator_equivalence.json`, `results/api_latency.json`.

### Phase 6: Vue frontend
**Check:** Vitest and Playwright output, screenshots of every page in `docs/screenshots/` (desktop and phone width), axe results.

### Phase 7: infrastructure and CI
**Check:** `cdk synth` output summary, cdk-nag result, infra tests, `actionlint` on the workflow, and every CI job's command run locally.

### Phase 8: memo, README, evidence
Memo and PDF with the number check, README (pitch, screenshots, architecture, numbers table, how to run, how it's tested, limits), `docs/demo.gif` (captioned real screenshots or a Playwright recording), `make results`, `make bullets`, then a subagent review against section 15, fixing what it finds.
**Check:** `make test` output, the memo check, `make bullets` output.

### Phase 9: deploy (mine; write the exact steps in BLOCKERS.md)
An AWS role for the box (or credentials on my laptop), `cdk bootstrap`, `make deploy`, `make smoke URL=…`, the live link in the README, a budget alarm. Then the resume can say "runs on AWS Lambda" and "served from S3 and CloudFront".

---

## 15. Done means (final checklist)

1. `make all` reruns the study from the manifest; `make test` passes; CI's commands all pass locally.
2. Reconciliation: unexplained = 0 for every file, by reason, in `results/reconciliation.json`.
3. Treated zones come from the data, all in Manhattan, with the fee jump on 5 January 2025 shown.
4. The planted-effect simulation passed before real estimates (commit order shows it), or its measured failure is recorded.
5. `headline.json`, the event study with the joint lead test, placebos, the 8-row table and spillover are all saved and shown in the app.
6. The TypeScript estimator matches statsmodels on all 61 cases; fast-check properties pass.
7. The GraphQL API rejects over-complex and too-deep queries, batches `weekly` with DataLoader, validates input, and the Lambda handler is tested.
8. The Vue app's three pages work, Playwright passes with axe clean, screenshots exist at desktop and phone width.
9. `cdk synth` passes with zero unsuppressed cdk-nag findings; assertion tests pass.
10. The memo is at most 2 pages and its number check passes.
11. Every number in the README, app, memo and DONE.md comes from `results/*.json`; `make bullets` prints no MISSING except the Phase 9 line.
12. DONE.md is written (sections listed in the autopilot prompt).

---

## 16. Interview prep (answers you should be able to give from your own code)

- Why difference-in-differences here, and what parallel trends means for these zones. What the lead test can and can't tell you.
- Why cluster by zone; how many clusters you had and why that's enough (or not).
- Why log trips, what happens to zero weeks, and why the panel is balanced.
- Why the treated zones come from intra-zone fee shares, not a hand-drawn map. What the boundary zones are.
- Spillover: why upper Manhattan might be a contaminated control, and what your ring estimate showed.
- The dose check: $0.75 vs $1.50, and why a bigger effect for ride-hail is (or isn't) evidence.
- Why the main specification was fixed before looking, and why a planted-effect test comes before real data.
- Why weeks start on Sunday.
- How the reconciliation works and what a non-zero unexplained count would mean.
- How the TypeScript estimator works (alternating projections, cluster-robust SE), the K in the correction, and how you proved it matches statsmodels.
- The N+1 problem and DataLoader; why GraphQL needs complexity limits.
- Lambda cold starts, why the panel is bundled, why API Gateway throttling and not reserved concurrency, why CloudFront serves both the site and `/graphql`.
- What else changed in 2025 that this design can't separate from the toll.
