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
