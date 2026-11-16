"""Planted-effect simulation (SPEC 7.6; design fixed in DECISIONS.md D12 before it was run).

Real zones and weeks, baseline from real data, independent AR(1) errors; plant -8% on treated zones
after 2025-01-05 and check bias and CI coverage; plant a linear pre-trend and check the lead test.
"""

import argparse
import json
import time
from dataclasses import dataclass
from datetime import date

import numpy as np
import pandas as pd

from . import did, event_study, groups
from .paths import RESULTS
from .results import stamp

POST_START = date(2025, 1, 5)
PLANTED_PCT = -8.0
TREND_PER_MONTH = 0.005
N_SEEDS = 20
SCEN = {"effect": 0, "trend": 1, "null": 2}


@dataclass
class Baseline:
    sample: did.Sample
    base: np.ndarray  # (Z, W) a_i + g_t
    sd: np.ndarray  # (Z,) stationary residual SD per zone
    rho: float
    rel_month: np.ndarray  # (W,)


def fit_baseline(panel: pd.DataFrame, g: groups.Groups) -> Baseline:
    s = did.build_sample(panel, "all", "dropoffs", g.treated, g.control("AB"))
    Z, W = s.n_zones, s.n_weeks
    y = np.empty((Z, W))
    y[s.zone, s.week] = s.y
    pre = s.weeks < np.datetime64(POST_START)
    ctrl = ~s.zone_treated
    # week effects: two-way FE on control zones over ALL weeks (balanced => means)
    yc = y[ctrl]
    gt = (yc - yc.mean(axis=1, keepdims=True)).mean(axis=0)
    # zone effects and residuals from pre-2025 weeks only
    a = (y[:, pre] - gt[pre]).mean(axis=1)
    e = y[:, pre] - a[:, None] - gt[pre][None, :]
    sd = e.std(axis=1, ddof=1)
    z = e / sd[:, None]
    rho = float((z[:, 1:] * z[:, :-1]).sum() / (z[:, :-1] ** 2).sum())
    return Baseline(s, a[:, None] + gt[None, :], sd, rho, event_study.rel_months(s.weeks))


def simulate(b: Baseline, seed: int, scenario: str) -> did.Sample:
    s = b.sample
    Z, W = s.n_zones, s.n_weeks
    rng = np.random.default_rng(np.random.SeedSequence([seed, SCEN[scenario]]))
    eps = rng.standard_normal((Z, W))
    e = np.empty((Z, W))
    e[:, 0] = b.sd * eps[:, 0]
    inno = b.sd * np.sqrt(1 - b.rho**2)
    for t in range(1, W):
        e[:, t] = b.rho * e[:, t - 1] + inno * eps[:, t]
    y = b.base + e
    tz = s.zone_treated[:, None]
    if scenario == "effect":
        post = (s.weeks >= np.datetime64(POST_START))[None, :]
        y = y + np.log1p(PLANTED_PCT / 100.0) * (tz & post)
    elif scenario == "trend":
        m = b.rel_month
        lead = (m <= -1) & (m >= event_study.FIRST_LEAD)
        trend = np.where(lead, np.log1p(TREND_PER_MONTH) * (m + 1), 0.0)[None, :]
        y = y + tz * trend
    out = did.Sample(**s.__dict__)
    out.y = y[s.zone, s.week]
    return out


def run(n_seeds: int = N_SEEDS) -> dict[str, object]:
    t0 = time.time()
    g = groups.load()
    panel = groups.load_panel()
    b = fit_baseline(panel, g)
    est, lo, hi, se = [], [], [], []
    p_trend_f, p_trend_chi, p_null_f, p_null_chi = [], [], [], []
    slope_trend, slope_null = [], []
    start = np.datetime64(POST_START)
    for seed in range(n_seeds):
        r = did.did(simulate(b, seed, "effect"), POST_START, ref=False)
        est.append(r.effect_pct)
        lo.append(r.ci_low_pct)
        hi.append(r.ci_high_pct)
        se.append(r.se)
        et = event_study.event_study(simulate(b, seed, "trend"), ref=False)
        p_trend_f.append(et.lead_p_F)
        p_trend_chi.append(et.lead_p_chi2)
        slope_trend.append(
            event_study.pretrend_slope(simulate(b, seed, "trend"), start, ref=False).p
        )
        en = event_study.event_study(simulate(b, seed, "null"), ref=False)
        p_null_f.append(en.lead_p_F)
        p_null_chi.append(en.lead_p_chi2)
        slope_null.append(event_study.pretrend_slope(simulate(b, seed, "null"), start, ref=False).p)
    # larger null-only size estimate (seeds 100..299), reported next to the 20-seed rate
    size_chi, size_f, size_slope = [], [], []
    if n_seeds >= N_SEEDS:
        for seed in range(100, 300):
            sn = simulate(b, seed, "null")
            en = event_study.event_study(sn, ref=False)
            size_chi.append(en.lead_p_chi2)
            size_f.append(en.lead_p_F)
            size_slope.append(event_study.pretrend_slope(sn, start, ref=False).p)
    est_a, lo_a, hi_a = np.array(est), np.array(lo), np.array(hi)
    covered = int(((lo_a <= PLANTED_PCT) & (PLANTED_PCT <= hi_a)).sum())
    # cross-check one seed against the statsmodels reference implementation
    ref = did.did(simulate(b, 0, "effect"), POST_START, ref=True)
    bias = float(est_a.mean() - PLANTED_PCT)
    rej = lambda p: int((np.array(p) < 0.05).sum())
    out = {
        "planted_effect_pct": PLANTED_PCT,
        "seeds": list(range(n_seeds)),
        "n_seeds": n_seeds,
        "bias_pp": bias,
        "mean_estimate_pct": float(est_a.mean()),
        "sd_estimate_pct": float(est_a.std(ddof=1)),
        "mean_se_beta": float(np.mean(se)),
        "coverage": covered,
        "coverage_of": n_seeds,
        "pass_bias": abs(bias) < 1.0,
        "pass_coverage": covered >= round(17 / 20 * n_seeds),
        "trend_per_month_pct": TREND_PER_MONTH * 100,
        "trend_reject_F": rej(p_trend_f),
        "trend_reject_chi2": rej(p_trend_chi),
        "null_reject_F": rej(p_null_f),
        "null_reject_chi2": rej(p_null_chi),
        "slope_trend_reject": rej(slope_trend),
        "slope_null_reject": rej(slope_null),
        "size_200_seeds": None if not size_f else {
            "seeds": "100-299", "n": len(size_f), "joint_chi2": float(np.mean(np.array(size_chi) < 0.05)),
            "joint_F": float(np.mean(np.array(size_f) < 0.05)),
            "slope": float(np.mean(np.array(size_slope) < 0.05)),
        },
        "decision_statistic": "F form: chi2/q vs F(q, G-1)",
        "pass_trend_power": rej(p_trend_f) >= round(18 / 20 * n_seeds),
        "per_seed_estimate_pct": est,
        "per_seed_ci_low_pct": lo,
        "per_seed_ci_high_pct": hi,
        "reference_check_seed0": {
            "demeaned_beta": did.did(simulate(b, 0, "effect"), POST_START, ref=False).beta,
            "statsmodels_beta": ref.beta,
        },
        "parameters": {
            "n_zones": b.sample.n_zones, "n_treated": int(b.sample.zone_treated.sum()),
            "n_control": int((~b.sample.zone_treated).sum()), "n_weeks": b.sample.n_weeks,
            "rho": b.rho, "median_zone_sd": float(np.median(b.sd)),
            "min_zone_sd": float(b.sd.min()), "max_zone_sd": float(b.sd.max()),
            "dropped_by_balancing": b.sample.dropped,
        },
        "runtime_s": round(time.time() - t0, 1),
        **stamp("python -m congestion.planted"),
    }  # fmt: skip
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--seeds", type=int, default=N_SEEDS)
    ap.add_argument("--out", default=str(RESULTS / "planted.json"))
    a = ap.parse_args()
    res = run(a.seeds)
    RESULTS.mkdir(exist_ok=True)
    with open(a.out, "w") as fh:
        json.dump(res, fh, indent=1)
    keys = ["bias_pp", "coverage", "coverage_of", "trend_reject_F", "trend_reject_chi2",
            "null_reject_F", "null_reject_chi2", "slope_trend_reject", "slope_null_reject", "size_200_seeds", "pass_bias", "pass_coverage", "pass_trend_power",
            "parameters", "runtime_s"]  # fmt: skip
    print(json.dumps({k: res[k] for k in keys}, indent=1))


if __name__ == "__main__":
    main()
