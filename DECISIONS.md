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
