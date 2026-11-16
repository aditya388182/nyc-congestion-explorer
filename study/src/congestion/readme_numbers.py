"""`make readme`: write the numbers table into README.md between the markers, from results/summary.json."""

import re

from . import fmt
from .paths import REPO
from .results import collect

START, END = "<!-- numbers:start -->", "<!-- numbers:end -->"


def rows(s: dict[str, object]) -> list[tuple[str, str, str]]:
    f = lambda k, g: g(s[k])  # type: ignore[arg-type]
    return [
        ("Data", "Raw trip records / files", f"{f('total_trips_raw', fmt.count)} / {s['n_files']} ({s['first_month']} to {s['last_month']})"),
        ("Data", "Unexplained rows after reconciliation", f"{f('unexplained', fmt.count)}"),
        ("Zones", "Treated / boundary / control A / control B / ring", f"{s['n_treated_zones']} / {s['n_boundary_zones']} / {s['n_control_a']} / {s['n_control_b']} / {s['n_ring']}"),
        ("Planted effect", f"Mean bias with a planted {f('planted_effect_pct', lambda v: fmt.pct(v, 0))} (seeds 0-{int(s['n_seeds']) - 1})", f"{f('bias_pp', lambda v: fmt.num(v, 2))} pp"),  # type: ignore[call-overload]
        ("Planted effect", "95% CI coverage of the planted value", f"{s['coverage']} / {s['coverage_of']}"),
        ("Planted effect", "Lead test rejects with a planted pre-trend / with nothing planted (F form)", f"{s['trend_reject_F']} / {s['null_reject_F']} of {s['n_seeds']}"),
        ("Main estimate", "Effect on trips into the zone (pre-registered; NOT a clean causal estimate, see pre-trend)", f"{f('main_estimate_pct', fmt.pct)} (95% CI {f('ci_low_pct', fmt.pct)} to {f('ci_high_pct', fmt.pct)})"),
        ("Pre-trend", "Joint lead test (23 leads)", f"chi2 = {f('pretrend_stat', lambda v: fmt.num(v, 1))}, df {s['pretrend_df']}, p = {f('pretrend_p', fmt.pval)}"),
        ("Pre-trend", "Treated-vs-control slope before the toll", f"{f('pretrend_slope_per_month_pct', fmt.pct)} per month, p = {f('pretrend_slope_p', fmt.pval)}"),
        ("Placebos", "Start 2024-01-05 / 2024-06-30", f"{f('placebo_2024_01_05_pct', fmt.pct)} / {f('placebo_2024_06_30_pct', fmt.pct)}"),
        ("Robustness", f"{s['n_specs']} specifications, min to max", f"{f('spec_min_pct', fmt.pct)} to {f('spec_max_pct', fmt.pct)}"),
        ("Dose check", "Yellow ($0.75) / high-volume FHV ($1.50)", f"{f('yellow_pct', fmt.pct)} / {f('fhvhv_pct', fmt.pct)}"),
        ("Spillover", "Ring vs control B / outer ring vs control B", f"{f('spillover_pct', fmt.pct)} / {f('outer_ring_pct', fmt.pct)}"),
        ("Post hoc", "With a treated-specific trend / 52-vs-52-week window", f"{f('trend_adj_pct', fmt.pct)} / {f('short_pct', fmt.pct)}"),
        ("Estimator port", "Max relative difference vs statsmodels over the reference cases", f"{f('max_rel_diff', lambda v: fmt.sci(v, 2))} ({s['n_cases']} cases)"),
        ("API latency (local, not Lambda)", "Cold-cache estimate p50 / p95 / max; warm p95", f"{f('cold_p50_ms', lambda v: fmt.num(v, 1))} / {f('cold_p95_ms', lambda v: fmt.num(v, 1))} / {f('cold_max_ms', lambda v: fmt.num(v, 1))} ms; {f('warm_p95_ms', lambda v: fmt.num(v, 1))} ms"),
        ("Tests", "pytest / Vitest / Playwright passed", f"{s['pytest_passed']} / {s['vitest_passed']} / {s['playwright_passed']}"),
    ]  # fmt: skip


def table(s: dict[str, object]) -> str:
    lines = ["| Area | Quantity | Value |", "|---|---|---|"]
    lines += [f"| {a} | {q} | {v} |" for a, q, v in rows(s)]
    return "\n".join(lines)


def main() -> None:
    p = REPO / "README.md"
    text = p.read_text()
    block = f"{START}\n{table(collect())}\n{END}"
    new = re.sub(re.escape(START) + r".*?" + re.escape(END), lambda _: block, text, flags=re.DOTALL)
    p.write_text(new)
    print("README numbers table updated")


if __name__ == "__main__":
    main()
