# CLAUDE.md: nyc-congestion-explorer

**Project:** a causal study of NYC's January 2025 congestion toll on taxi and ride-hail trips (Python, DuckDB, statsmodels), served by a Node.js/TypeScript GraphQL API built for AWS Lambda and a Vue 3 map app, with an AWS CDK stack. SPEC.md is the source of truth. Work phase by phase and run each phase's Check.

## Stack (do not swap any of these; the resume names them)
| Part | Stack |
|---|---|
| Study | Python 3.12, uv, DuckDB (with the spatial extension), pandas, numpy, scipy, statsmodels, pyarrow, matplotlib, httpx |
| API | Node.js (the newest major Lambda supports), TypeScript strict, Apollo Server (current major), its AWS Lambda integration, DataLoader, a query-complexity and a depth limit, lru-cache, zod, pino, GraphQL Code Generator |
| Frontend | Vue 3, Vite, Vue Router, Pinia, MapLibre GL JS, urql for Vue, Chart.js through one wrapper |
| Infra | AWS CDK v2 (TypeScript), cdk-nag, Lambda (arm64), API Gateway HTTP API, S3, CloudFront with OAC |
| Tests | pytest, Vitest, fast-check, @vue/test-utils, Playwright with @axe-core/playwright |
| CI | GitHub Actions |

## Honesty of results (most important)
- Every number in the README, `results/`, the app, the memo or DONE.md comes from code output. Never type, round up or estimate a result.
- "−8%" is the planted effect, "61 cases", "20 seeds", "1 s" and "January 2023 onward" are design scope. Measured values come from `results/*.json`.
- `results/*.json` include `commit`, `dirty`, `generated_at_utc` and `command`. `make bullets` fills the resume bullets and prints MISSING for absent keys.
- **The main specification in SPEC 7.1 is fixed.** Never change it, the exclusion rules, the zone thresholds or the planted-effect pass criteria after seeing an estimate. If something is genuinely wrong, record the evidence in DECISIONS.md, change it openly, and say so in the memo.
- A null, small, wrong-signed or mixed result is reported as found. Never tune toward a number.
- Until Phase 9 is done, nothing says "deployed", "runs on Lambda" or "live".

## Stop and record instead of guessing
- A spec fact turns out wrong (a column, a library API, a version, a date, a toll amount): show the evidence in DECISIONS.md, update SPEC.md, continue.
- A step needs my AWS account, credentials, money or a domain: list it in BLOCKERS.md with exact clicks and values, skip it, keep going.

## Safety rules
- Never push, never use `gh`, never call AWS, never run `cdk deploy`, `cdk bootstrap` or `cdk destroy`, never run `make deploy` or `make smoke`. `cdk synth` is fine.
- Data only from the official TLC links (SPEC section 0). At most 2 downloads at a time.
- Never read or print `~/.aws/*` or any credentials.
- Deleting files: never chain `rm` with other commands. Use `make clean` targets, `git clean` for build output, or one `rm` of explicit paths inside this repo per command. Raw trip files are deleted by the pipeline code itself after aggregation, one explicit path at a time.
- Local servers bind to 127.0.0.1.

## Code rules
**Python:** type hints on public functions; ruff clean; SQL in `study/sql/*.sql` files, not built from strings; fixed seeds; structured logs.

**TypeScript (all packages):** strict, no `any`; eslint clean; `vue-tsc --noEmit` for the web; GraphQL types only from codegen (`make contract` shows no diff); input validated with zod; errors as GraphQL errors with `extensions.code`, never a stack trace; JSON logs without request bodies.

**Numerics:** the TypeScript estimator uses Float64; tolerances are named constants; the equivalence test compares against `results/estimator_reference.json`, never against values typed into a test.

**Frontend:** labelled, keyboard-reachable controls; every loading and error state visible; axe clean; works at phone width.

**CDK:** pinned versions; no secrets in code or context; least-privilege IAM; every cdk-nag suppression has a written reason.

**Dependencies:** exact versions in `VERSIONS.md` and lockfiles (`uv.lock`, `package-lock.json`).

## Definition of done for a phase
1. Tests pass. Show the real output.
2. The phase's Check from SPEC.md has been run and its output shown.
3. Nothing left as TODO without a note in SPEC.md or BLOCKERS.md.
4. PROGRESS.md updated (what was done, the Check output, interview notes, what's next); committed with a message naming the phase.

## Commands (keep `make help` current)
- `make setup`, `make data` (download + aggregate, restartable), `make study`, `make export`, `make all`
- `make api-dev` (127.0.0.1:4000), `make web-dev`, `make dev`
- `make test`, `make e2e`, `make bench`, `make contract`, `make lint`
- `make synth`, `make infra-test`
- `make results`, `make readme`, `make memo`, `make bullets`
- `make deploy`, `make smoke URL=…`: for me only

## Working style
- Plan before anything touching more than one file. One phase at a time.
- Keep PROGRESS.md, DECISIONS.md (every judgement call with its reason) and BLOCKERS.md (what needs me) current.
- After each phase, list in PROGRESS.md what I should understand well enough to explain in an interview.
