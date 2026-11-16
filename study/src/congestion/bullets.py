"""`make bullets`: resume bullets from results/summary.json; MISSING for any absent key."""

import re

from . import fmt
from .results import collect

TEMPLATES = [
    (
        "Built a weekly zone-level panel from {total_trips_raw} NYC taxi and ride-hail trip records ({first_month} to {last_month}, {n_files} files) with DuckDB SQL window functions, reconciled to zero unexplained rows by exclusion reason.",
        False,
    ),
    (
        "Estimated the toll's effect on trips into the zone with difference-in-differences (zone-clustered SEs): {main_estimate_pct}% (95% CI {ci_low_pct} to {ci_high_pct}); event-study pre-trend test p = {pretrend_p}; placebo dates; {n_specs} robustness specs from {spec_min_pct}% to {spec_max_pct}%; a planted -8% was recovered with {bias_pp} pp mean bias and {coverage}/20 CI coverage.",
        False,
    ),
    (
        "Built a Node.js/TypeScript GraphQL API (Apollo Server, DataLoader, query-complexity limits) that re-runs the estimate on demand, with an estimator ported to TypeScript that matches statsmodels on {n_cases} cases (max relative difference {max_rel_diff}); cold-cache estimate p95 {cold_p95_ms} ms (local).",
        False,
    ),
    (
        "Built a Vue 3 frontend (TypeScript, Pinia, MapLibre GL) with live re-estimation and an event-study chart; {vitest_total} Vitest tests including fast-check properties, {playwright_passed} Playwright tests; AWS CDK stack for Lambda, API Gateway, S3 and CloudFront.",
        False,
    ),
    (
        "Deployed on AWS Lambda behind CloudFront: {deploy_p95_ms} ms p95 over {deploy_n} live requests.",
        True,
    ),
]

FORMATS = {
    "total_trips_raw": fmt.count, "n_files": lambda v: str(int(v)),
    "main_estimate_pct": lambda v: fmt.num(v, 1), "ci_low_pct": lambda v: fmt.num(v, 1), "ci_high_pct": lambda v: fmt.num(v, 1),
    "pretrend_p": fmt.pval, "spec_min_pct": lambda v: fmt.num(v, 1), "spec_max_pct": lambda v: fmt.num(v, 1),
    "bias_pp": lambda v: fmt.num(v, 2), "coverage": lambda v: str(int(v)), "n_cases": lambda v: str(int(v)),
    "max_rel_diff": lambda v: fmt.sci(v, 1), "cold_p95_ms": lambda v: fmt.num(v, 1),
    "vitest_total": lambda v: str(int(v)), "playwright_passed": lambda v: str(int(v)),
    "deploy_p95_ms": lambda v: fmt.num(v, 0), "deploy_n": lambda v: str(int(v)),
}  # fmt: skip


def render(summary: dict[str, object]) -> list[tuple[str, list[str], bool]]:
    out = []
    for tpl, phase9 in TEMPLATES:
        missing: list[str] = []

        def sub(m: re.Match[str], missing: list[str] = missing) -> str:
            k = m.group(1)
            if k not in summary:
                missing.append(k)
                return "MISSING"
            v = summary[k]
            return FORMATS[k](v) if k in FORMATS else str(v)  # type: ignore[arg-type]

        out.append((re.sub(r"\{(\w+)\}", sub, tpl), missing, phase9))
    return out


def main() -> None:
    for text, missing, phase9 in render(collect()):
        print(("[Phase 9 only] " if phase9 else "") + text)
        if missing:
            print(f"  MISSING keys: {', '.join(missing)}")
        print()


if __name__ == "__main__":
    main()
