"""Shared stamping for results/*.json: commit, dirty, generated_at_utc, command."""

import subprocess
from datetime import UTC, datetime

from .paths import REPO


def _git(*args: str) -> str:
    return subprocess.run(
        ["git", *args], check=False, cwd=REPO, capture_output=True, text=True
    ).stdout.strip()


def stamp(command: str) -> dict[str, object]:
    return {
        "commit": _git("rev-parse", "--short", "HEAD"),
        "dirty": bool(_git("status", "--porcelain", "--", ".", ":!results", ":!data")),
        "generated_at_utc": datetime.now(UTC).isoformat(timespec="seconds"),
        "command": command,
    }


# ---------------------------------------------------------------------------------------------
# Flat summary of every measured value (used by README, memo, bullets and DONE.md)
# ---------------------------------------------------------------------------------------------
import json
from typing import Any

from .paths import RESULTS

STAMP_KEYS = ("commit", "dirty", "generated_at_utc", "command")


def _load(name: str) -> dict[str, Any] | None:
    p = RESULTS / f"{name}.json"
    return json.loads(p.read_text()) if p.exists() else None


def collect() -> dict[str, Any]:
    """Flatten results/*.json into one dict of named values. Absent files simply give absent keys."""
    s: dict[str, Any] = {}
    if h := _load("headline"):
        s.update({k: v for k, v in h.items() if k not in STAMP_KEYS})
        s["results_commit"] = h["commit"]
    if p := _load("planted"):
        for k in ("planted_effect_pct", "n_seeds", "bias_pp", "coverage", "coverage_of", "trend_reject_F",
                  "null_reject_F", "slope_trend_reject", "slope_null_reject", "mean_estimate_pct",
                  "sd_estimate_pct"):  # fmt: skip
            s[k] = p[k]
        s["size_joint_F_200"] = (p.get("size_200_seeds") or {}).get("joint_F")
        s["size_joint_chi2_200"] = (p.get("size_200_seeds") or {}).get("joint_chi2")
        s["size_slope_200"] = (p.get("size_200_seeds") or {}).get("slope")
        s["planted_rho"] = p["parameters"]["rho"]
        s["pass_bias"], s["pass_coverage"], s["pass_trend_power"] = (
            p["pass_bias"],
            p["pass_coverage"],
            p["pass_trend_power"],
        )
    if e := _load("estimator_equivalence"):
        s["n_cases"], s["max_rel_diff"] = e["n_cases"], e["max_rel_diff"]
    if a := _load("api_latency"):
        s["cold_p50_ms"], s["cold_p95_ms"], s["cold_max_ms"] = (
            a["cold_client_ms"][k] for k in ("p50", "p95", "max")
        )
        s["warm_p95_ms"] = a["warm_client_ms"]["p95"]
        s["panel_load_ms"] = a["panel_load_ms"]["p50"]
        s["bench_rounds"], s["bench_cases"] = a["rounds"], a["cases"]
    if t := _load("tests"):
        s["pytest_passed"] = t["pytest"]["passed"]
        s["vitest_total"], s["vitest_passed"] = t["vitest_total"], t["vitest_passed"]
        s["playwright_passed"] = t["playwright"]["passed"]
    if d := _load("deploy_smoke"):
        s["deploy_p95_ms"], s["deploy_n"] = d["p95_ms"], d["n"]
    if x := _load("exploratory"):
        ta, sw = x["trend_adjusted"], x["short_window_52_52"]
        s.update(trend_adj_pct=ta["effect_pct"], trend_adj_low=ta["ci_low_pct"], trend_adj_high=ta["ci_high_pct"],
                 trend_adj_slope_pct=ta["trend_per_month_pct"], short_pct=sw["effect_pct"],
                 short_low=sw["ci_low_pct"], short_high=sw["ci_high_pct"])  # fmt: skip
    if sp := _load("spillover"):
        s["ring_pct"] = sp["ring_vs_control_b"]["effect_pct"]
        s["ring_low"], s["ring_high"] = (
            sp["ring_vs_control_b"]["ci_low_pct"],
            sp["ring_vs_control_b"]["ci_high_pct"],
        )
        s["outer_ring_low"], s["outer_ring_high"] = (
            sp["outer_ring_vs_control_b"]["ci_low_pct"],
            sp["outer_ring_vs_control_b"]["ci_high_pct"],
        )
        s["n_outer_ring"] = sp["outer_ring_vs_control_b"]["n_zones_tested"]
        s["main_without_outer_ring_pct"] = sp["main_without_outer_ring"]["effect_pct"]
    if sx := _load("specs"):
        for r in sx["specs"]:
            s[f"spec_{r['id']}_pct"] = r["effect_pct"]
            s[f"spec_{r['id']}_low"], s[f"spec_{r['id']}_high"] = r["ci_low_pct"], r["ci_high_pct"]
    if pl := _load("placebos"):
        for r in pl["placebos"]:
            tag = r["id"].replace("placebo_", "").replace("-", "_")
            s[f"placebo_{tag}_low"], s[f"placebo_{tag}_high"] = r["ci_low_pct"], r["ci_high_pct"]
    if es := _load("event_study"):
        for e_ in es["event_studies"]:
            if e_["control"] == "AB":
                k = e_["tripType"]
                s[f"lead_p_chi2_{k}_AB"], s[f"lead_slope_pct_{k}_AB"] = (
                    e_["lead_p_chi2"],
                    100 * (2.718281828459045 ** e_["slope"]["slope_per_month"] - 1),
                )
                s[f"lead_slope_p_{k}_AB"] = e_["slope"]["p"]
    if rc := _load("reconciliation"):
        t_ = rc["totals"]
        s["unexplained"] = t_["unexplained"]
        for k, v in t_["dropped_by_reason"].items():
            s[f"dropped_{k}"] = v
    if z := _load("zones"):
        s["n_unclassified"] = z["counts"].get("UNCLASSIFIED", 0)
        s["n_other_zones"] = z["counts"].get("OTHER", 0)
        s["n_outer_ring_zones"] = z["n_ring2"]
        s["fee_share_2025_01_04"] = z["fee_jump"]["share_treated_2025_01_04"]
        s["fee_share_2025_01_05"] = z["fee_jump"]["share_treated_2025_01_05"]
    return s


def main() -> None:
    out = {**collect(), **stamp("python -m congestion.results")}
    (RESULTS / "summary.json").write_text(json.dumps(out, indent=1, default=float))
    print(f"results/summary.json: {len(out) - len(STAMP_KEYS)} values")


if __name__ == "__main__":
    main()
