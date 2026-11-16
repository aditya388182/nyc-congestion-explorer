# DECISIONS.md

Every judgement call, with its reason. Newest last.

## D1. Box is smaller than the spec says (Phase 0)
`nproc` = 4 and `free -g` = 15 GB, not 8 vCPU / 32 GB. Consequence: DuckDB is run with `threads=4` and a 10 GB memory limit while aggregating the biggest fhvhv files;
the benchmark is labelled with the real machine. Disk: 96 GB with ~71 GB free; one raw file at a time (largest fhvhv ~0.5 GB) so ~25 GB total passing through is fine.

## D2. Node.js 24 is the Lambda major (Phase 0)
AWS docs (search result 2026-11-16): nodejs24.x is GA, Node 26 is public preview only ("not covered by the Lambda SLA"). Local Node is v24.22.1. Used everywhere. CDK runtime: `Runtime.NODEJS_24_X`.

## D3. TypeScript 6.0.3, not 7.x (Phase 0)
npm's latest `typescript` is 7.x, but `typescript-eslint` 8.73 declares peer `typescript >=4.8.4 <6.1.0`. Using TypeScript 6.0.3 keeps strict type-aware linting working; all packages pinned to the same version.

## D4. npm install scripts (Phase 0)
npm 11 does not run dependency install scripts by default (warning `install-scripts ... not yet covered by allowScripts`). esbuild and Playwright work without them (esbuild ships its binary as an optional platform package; verified `esbuild --version` = 0.28.2 and bundling works), so no scripts are approved.

## D5. `cbd_congestion_fee` is absent before 2025, and has negative / NULL / 3.00 values (Phase 0 probe, PROBE.md section 4)
Spec 5.2 said "2025 on" which holds. The SQL therefore reads the column only if the file has it (`union_by_name`, then a `COLUMNS`/describe check) and otherwise uses NULL. "Trip pays the fee" is defined as `cbd_congestion_fee > 0` (so refunds of -0.75 and NULLs are "no fee"). `fee_sum` keeps the raw sum.

## D6. MTA toll page blocks curl (Phase 0)
`mta.info` returns 403 to automated clients. Amounts ($0.75 / $1.50) are cited from the TLC industry notice and MTA page as quoted in search results and confirmed against the modal positive fee values in the January 2025 data. Exact day of the June 2024 pause was not visible in the sources I could read; the memo says "June 2024".

## D7. NULL timestamps and the four exclusion reasons (Phase 1)
SPEC 5.4 has four reasons and requires raw = kept + dropped with zero unexplained. A row with a NULL pickup time cannot be "inside the month", and one with a NULL dropoff cannot have a 1 min to 4 h duration (a NULL comparison is neither true nor false in SQL, so such a row would silently fall into "kept"). They are assigned to `outside_month` (NULL pickup) and `bad_duration` (NULL dropoff) respectively, after the zone rules, so the reasons stay a complete partition. Boundaries: a trip of exactly 60 s and exactly 4 h is kept (rule says "under 1 minute or over 4 hours"); tested in `tests/test_aggregate.py`.

## D8. Aggregation SQL: `do` is a reserved word; per-file parts (Phase 1)
Columns normalised to `pz`/`dz` (DuckDB: `do` is a keyword, found when the first run failed with a parser error). SQL stays in `study/sql/normalize.sql` and `aggregate_month.sql` (named blocks, parameters bound with `?`). Six `normalize` variants exist (three types x fee column present/absent) instead of building SQL strings. Each file's aggregates are also saved in `data/agg/parts/` so a crash costs one file; `daily_counts.parquet` and `intra_zone.parquet` are the concatenation.
Dropoff aggregates are keyed by the dropoff date, so a trip picked up on 31 December and dropped off on 1 January is in the December file's aggregate under the 1 January date; sums over dates are unaffected.

## D9. Zone classification uses February to December 2025, not all of 2025 (Phase 2; thresholds unchanged)
SPEC 6.1 says "intra-zone 2025 trips". The `intra_zone` aggregate is monthly and January 2025 contains four pre-toll days (1 to 4 January), so every share in January is biased down (Times Sq/Theatre District: 0.829 in January vs 0.95 to 0.97 in each later month). With all of 2025, Times Sq (0.945) and Midtown North (0.949) fell just under the fixed 0.95 threshold and were labelled boundary: an artefact of the pre-toll days, not of the threshold. Fix: classify with the 11 complete post-toll months (2025-02 to 2025-12). **The thresholds (0.95 / 0.05 / 200 trips) are unchanged**, and no outcome estimate had been computed when this was decided (evidence: the first version of the zone table, group counts treated 25 / boundary 18; now treated 30 / boundary 13). The first-version numbers were produced by the same script with `CLASSIFY_FROM = "2025-01-01"` and are not used anywhere.
Zones just under the threshold (Seaport 0.946, Hudson Sq 0.946, Stuy Town 0.949) stay boundary and are dropped from the main estimate; robustness row 4 keeps boundary zones as treated.

## D10. The spillover ring is made of boundary zones; an outer ring is added (Phase 2, fixed before any estimate)
By the spec's definition (non-treated zones that share a border with a treated zone; `ST_Touches`) the ring is 14 zones and **all of them are boundary or unclassified** (Lenox Hill, Lincoln Square, Upper East Side South, Central Park, Battery Park, Seaport, ...): the zones next to the charged area are exactly the partially charged ones. So "ring zones stay in control A" is moot (they are not in control A) and the spec's spillover estimate (ring vs control B) mixes partial treatment with spillover. Pre-registered handling:
1. Spillover estimate as in SPEC 7.5: ring zones (excluding unclassified zone 12, which has too few trips, and excluding ring zones from control B) as "treated" against control B. Reported with the caveat that ring zones are partly charged.
2. Added "outer ring": the 8 control-A zones that touch a ring zone (Bloomingdale, Central Harlem, Manhattan Valley, UES North, UWS North, UWS South, Yorkville East and West), against control B. This is the clean test of whether control A is contaminated next to the zone. Flag `ring2` in `results/zones.json`.
3. Adjacency definition: `ST_Touches`; the 1-foot `ST_DWithin` version gives the identical set (`ring_touches_equals_near_1ft: true`), so the choice does not matter.

## D11. Control B qualification (Phase 2)
"The 60 busiest non-Manhattan zones by 2024 dropoffs, excluding airports" is restricted to zones classified `outside` (share <= 0.05 with >= 200 intra-zone trips), because SPEC 6.1 leaves too-few zones out of every group and a boundary zone is partly treated. Busiest = 2024 dropoffs of all three types.

## D12. Planted-effect simulation design, fixed BEFORE it was run (Phase 3)
(No real estimate exists yet at the time of writing; the pass criteria in SPEC 7.6 are untouched.)
- Sample: the main specification's sample (trip type `all`, outcome dropoffs, control AB, boundary and unclassified zones dropped, balanced over all 195 weeks).
- Baseline: week effects g_t are the two-way-FE week effects of the CONTROL zones over all weeks (the real calendar: holidays, seasonality, the 2025 level shifts), zone effects a_i = mean over pre-2025 weeks of (y_it - g_t) for every zone, per-zone residual SD and the pooled AR(1) coefficient rho (standardised residuals) from pre-2025 weeks only. Treated-zone post-2025 data is never used. SPEC says "estimate ... from the real pre-2025 panel"; the post-2025 week effects are needed because the simulated panel spans the real 195 weeks, and are taken from controls only, so no treatment effect leaks in.
- Errors: independent AR(1) per zone with stationary SD = the zone's residual SD. This ignores cross-zone correlation within a week, so coverage is measured under zone-independent errors (optimistic; stated as a limitation).
- Effect scenario: treated zones' log outcome gets +ln(0.92) for weeks on or after 2025-01-05 (a -8% level effect). Estimate: the main DiD. Bias in percentage points = mean over seeds of (estimated effect % - (-8)).
- Trend scenario: treated zones get ln(1.005)*(m+1) added for relative months m = -24..-2 (0 at m = -1, no planted treatment effect, nothing after). Null scenario: nothing planted (size of the lead test).
- Joint lead test: the decision statistic is the **F form** (chi2 / q with F(q, G-1) reference), because with q = 23 leads and ~110 clusters the plain chi2 form is known to over-reject; both forms are reported. 'Reject at 5%' uses the F form.
- Seeds 0 to 19, `numpy.random.default_rng(SeedSequence([seed, scenario_id]))`. Simulations use the alternating-projection estimator (`twfe_demeaned`), which tests show equals the statsmodels reference to 1e-8; the effect scenario is also re-estimated with the statsmodels reference for the first seed as a cross-check.
- Event-study months are the month of each week's Sunday; relative month 0 = January 2025. A week starting 29 Dec 2024 is month -1. Months run from -24 (Jan 2023) to the last month in the data (Sept 2026, month +20, three weeks).
- Confidence intervals are normal-based (z = 1.96), which is statsmodels' default for clustered covariance (`use_t=False`); the TypeScript port matches.

## D13. The joint lead test is badly over-sized in this design; a supplementary 1-df slope test is added (Phase 3, before any real estimate)
Smoke-testing the simulation showed the no-effect (null) scenario rejecting the joint test of 23 leads in most seeds. Diagnostic run (null scenario, seeds 100 to 299, 200 simulated panels, zone-independent AR(1) errors; not the reported seeds): rejection at 5% = **0.64 (chi2 form), 0.595 (F with q, G-1), 0.395 (Hotelling-corrected F with q, G-q)**. The two estimator implementations agree to 1e-13, so this is not an implementation bug. Reason: all 23 lead coefficients are treated x month dummies, so the cluster-robust covariance of the leads is driven by only the 30 treated clusters (control clusters contribute almost nothing to these scores): a 23x23 covariance estimated from ~30 informative clusters is near-singular and the Wald statistic is inflated.
Handling, per SPEC 7.6 ("never loosen a threshold to pass; ... record the evidence and report the measured values"):
- The pre-registered joint test (SPEC 7.2) is kept and reported as specified (both forms). The 20-seed null rejection rate ("the test's size") is reported in `results/planted.json` next to a 200-seed size estimate (seeds 100 to 299) for the same test. The power criterion (>= 18 of 20) is evaluated on the F form as pre-registered in D12.
- **Added, declared before any real estimate:** a supplementary linear pre-trend slope test (treated x continuous month in the pre-2025 weeks, 1 df, zone and week FE, clustered by zone). Its size and power are measured in the same simulation. The memo reports the joint test's p-value with the warning that the test is over-sized here, and the slope test as the better-calibrated check. The joint p-value is never described as "no pre-trend" without that caveat.

## D14. What the real estimates showed, and the post-hoc analyses added because of it (Phase 4)
The pre-registered main specification, the zone thresholds and the pass criteria were **not changed**. First real run (30 treated, 81 control zones, 195 weeks, 21,645 observations):
main -9.94% (95% CI -11.24 to -8.62); but the event study shows treated zones drifting down relative to control for two years BEFORE the toll (slope -0.45% per month, p = 3e-24; joint lead test p ~ 1e-44 to 1e-186, over-sized per D13 but the slope test agrees), the two placebo dates give -4.76% and -4.88% (both CIs exclude 0), and the dose check goes the wrong way (yellow, $0.75: -32.7%; fhvhv, $1.50: -14.3%). Parallel trends does not hold for this design, so the headline is reported with that warning, not as "the effect of the toll".
Because of that, two **post-hoc** (not pre-registered, labelled as such everywhere) analyses were added in `results/exploratory.json`: (a) the main DiD plus a treated-specific linear trend (identified from the 2 pre years); (b) the main DiD restricted to the 52 weeks before and the 52 weeks after the start (same window as the map's `change`). They are reported next to, never instead of, the main estimate. Nothing else was altered after seeing estimates.

## D15. API design choices (Phase 5)
- **Lambda test event**: `api/test/fixtures/apigw-v2-estimate.json` follows AWS's documented HTTP API payload format 2.0; it was written by hand, not captured from a live API Gateway (no AWS account on this box). The handler is invoked directly with it.
- **Complexity numbers**: depth limit 6; maximum cost 5,000; one zone's weekly series = 10, one `estimate` = 50, `eventStudy` = 20, other fields 1, a list field multiplies its children by the list's fixed size (zones 265, specs 8, placebos 2, reconciliation files 135, event-study points 45). The map query (zones with geometry and change) costs ~1,900; every zone's weekly series for the 4 trip types costs 10,866 and is rejected with `QUERY_TOO_COMPLEX` and the cost in the message. The real schema is only 3 levels deep, so the depth rule is unit-tested on a recursive test schema, and wired into the server (Apollo labels validation-rule errors `GRAPHQL_VALIDATION_FAILED`; `formatError` relabels them `QUERY_TOO_DEEP`).
- **Cache**: 500-entry LRU keyed by the normalised input; on a hit `computeMs` is the lookup time (about 0.01 ms) and `cached` is true.
- **Errors**: unexpected errors are logged server-side (message and stack in the JSON log) and returned to the client as `Internal server error` with code `INTERNAL_SERVER_ERROR`; request bodies and variables are never logged.
- **Vitest and graphql-js**: graphql is a dual CJS/ESM package; Vitest loaded the ESM build for source files while Apollo (externalised) used CJS ("Cannot use GraphQLObjectType from another module or realm"). Fixed by aliasing `graphql` to its CJS entry in `api/vitest.config.ts` (a test-runner issue only; the esbuild bundle and `tsx` server resolve a single copy).
- **Local server** is a small `node:http` wrapper around `server.executeHTTPGraphQLRequest` (path `/graphql`, `/health`, 127.0.0.1:4000, 100 KB body limit) so Playwright and the Vite proxy see the same path as CloudFront will.

## D16. Frontend choices (Phase 6)
- **No basemap.** Zone polygons on a plain background, as SPEC 10.2 prefers: no third-party tile terms to satisfy and no attribution needed; the zones carry the information.
- **MapLibre GL 6 worker**: v6's tile worker is an ES module importing a shared chunk by relative path, which Vite would hash apart ("Worker failed to load" in the production build). `web/scripts/copy-maplibre.mjs` copies both files to `web/public/maplibre/` (gitignored, regenerated on `dev`/`build`) and the app calls `setWorkerUrl`.
- **urql sends POST**: urql defaults to GET for small queries; Apollo's CSRF protection rejects GET without a preflight header (HTTP 400 on first load). `preferGetMethod: false`; it also matches CloudFront's `/graphql` POST behavior.
- **Map readiness** is the MapLibre `idle` event (data drawn), exposed as `data-ready` on the status line; `?e2e=1` also exposes the map object on `window` so Playwright can click a real lon/lat. It is only a test hook.
- **Accessibility**: the canvas map is not keyboard-operable, so a labelled zone list drives the same panel; scrollable tables are focusable regions; axe (WCAG 2.1 A and AA) is clean on all pages at desktop and 390 px width, including with the zone panel and an error shown.
- **Honest presentation**: the Estimate page shows a "read with care" box computed from the served pre-trend slope (not typed), and the Data & Method page states the over-sized lead test. ESLint: type-aware rules are disabled inside `.vue` files (vue-tsc checks them) and the stylistic Vue rules are not used.

## D17. Infrastructure choices (Phase 7)
- cdk-nag is v3 (native `Validations` API): each finding is acknowledged individually with a written reason in `infra/lib/nag.ts`; the test `synthesises with zero unacknowledged AwsSolutions findings` runs the rule pack through `app.synth()`.
- The stack has no `env`, so `cdk synth` and the tests need no AWS account; `Source.asset(web/dist)` needs the web build (tests use a temp folder).
- The Lambda bundle is created by `NodejsFunction` with the local esbuild (ESM, minified, source map): the weekly panel (1.6 MB), zone shapes, results JSON and the GraphQL schema are copied next to `index.mjs`; the loader looks in `./data`.
- No reserved concurrency (SPEC decision 4); throttling (20/s, burst 40) is on the `$default` stage. `S3BucketOrigin.withOriginAccessControl` makes the OAC and the bucket policy that lets only this distribution read.
- Acknowledged on purpose: no WAF, geo restriction, CloudFront or API access logs, no authorizer (public read-only API), default CloudFront certificate (TLSv1 floor; a custom domain would fix it), and CDK helper-function IAM wildcards. Reasons are in `infra/lib/nag.ts`.
- `make smoke` is `congestion.smoke`, tested only against a mock transport; the autopilot never runs it.
