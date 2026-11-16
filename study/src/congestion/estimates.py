"""Event studies for the 9 type x control combinations, figures, and results/headline.json."""

import json
from dataclasses import asdict

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from . import did, event_study, groups, manifest, specs
from .paths import REPO, RESULTS
from .results import stamp

FIG = REPO / "reports" / "figures"
TYPES = ("yellow", "fhvhv", "all")
CONTROLS = ("A", "B", "AB")


def event_studies(panel: pd.DataFrame, g: groups.Groups) -> list[dict[str, object]]:
    out = []
    for t in TYPES:
        for c in CONTROLS:
            case = specs.Case(trip_type=t, control=c)
            s = specs.sample_for(panel, g, case)
            es = event_study.event_study(s, ref=True)
            sl = event_study.pretrend_slope(s, np.datetime64(specs.TOLL_START), ref=True)
            out.append({
                "tripType": t, "control": c, "nTreated": int(s.zone_treated.sum()),
                "nControl": int((~s.zone_treated).sum()), "nWeeks": s.n_weeks, "nObs": len(s.y),
                "droppedZones": s.dropped, **asdict(es), "slope": asdict(sl),
            })  # fmt: skip
    (RESULTS / "event_study.json").write_text(
        json.dumps(
            {"event_studies": out, **stamp("python -m congestion.estimates")},
            indent=1,
            default=float,
        )
    )
    return out


def plot_event_study(es: dict[str, object], path, title: str) -> None:
    m = np.array(es["months"])
    lo, hi = np.array(es["ci_low_pct"]), np.array(es["ci_high_pct"])
    est = np.array([did.pct(b) for b in es["coef"]])  # type: ignore[union-attr]
    # insert the omitted month -1 as an exact zero
    mm = np.insert(m, np.searchsorted(m, -1), -1)
    est, lo, hi = (np.insert(a, np.searchsorted(m, -1), 0.0) for a in (est, lo, hi))
    fig, ax = plt.subplots(figsize=(9, 4.6))
    ax.fill_between(mm, lo, hi, alpha=0.25, color="#1f77b4", label="95% CI (clustered by zone)")
    ax.plot(mm, est, marker="o", ms=3, color="#1f77b4", label="treated vs control, % difference")
    ax.axhline(0, color="k", lw=0.8)
    ax.axvline(-0.5, color="#d62728", ls="--", lw=1)
    ax.text(-0.4, ax.get_ylim()[1] * 0.9, "toll starts\n5 Jan 2025", color="#d62728", va="top")
    ax.set_xlabel("months relative to January 2025 (month -1 omitted)")
    ax.set_ylabel("% difference vs month -1")
    ax.set_title(title)
    txt = (f"Joint test, all leads (-24..-2) = 0:\nchi2 = {es['lead_chi2']:.1f} (df {es['lead_df']}), "
           f"p = {es['lead_p_chi2']:.3g}\nF = {es['lead_F']:.2f}, p = {es['lead_p_F']:.3g}")  # fmt: skip
    ax.text(0.02, 0.03, txt, transform=ax.transAxes, fontsize=8, va="bottom",
            bbox={"facecolor": "white", "edgecolor": "0.7"})  # fmt: skip
    ax.legend(loc="upper left", fontsize=8)
    fig.tight_layout()
    fig.savefig(path, dpi=130)
    plt.close(fig)


def plot_specs(
    rows: list[dict[str, object]], placebos: list[dict[str, object]], spill: dict[str, object], path
) -> None:
    items = [(r["label"], r) for r in rows] + [(r["label"], r) for r in placebos]
    items += [("Spillover: ring vs control B", spill["ring_vs_control_b"]),
              ("Spillover: outer ring vs control B", spill["outer_ring_vs_control_b"])]  # fmt: skip
    fig, ax = plt.subplots(figsize=(9, 5.5))
    y = np.arange(len(items))[::-1]
    for yi, (label, r) in zip(y, items, strict=True):
        col = "#1f77b4" if label in {x["label"] for x in rows} else "#7f7f7f"
        ax.errorbar(r["effect_pct"], yi, xerr=[[r["effect_pct"] - r["ci_low_pct"]], [r["ci_high_pct"] - r["effect_pct"]]],
                    fmt="o", color=col, capsize=3)  # fmt: skip
    ax.set_yticks(y, [i[0] for i in items])
    ax.axvline(0, color="k", lw=0.8)
    ax.set_xlabel("effect on weekly trips, % (95% CI)")
    ax.set_title("Robustness specifications (blue), placebos and spillover (grey)")
    fig.tight_layout()
    fig.savefig(path, dpi=130)
    plt.close(fig)


def headline(panel: pd.DataFrame, g: groups.Groups, rows: list[dict[str, object]], ess: list[dict[str, object]],
             spill: dict[str, object], placebos: list[dict[str, object]]) -> dict[str, object]:  # fmt: skip
    mf = manifest.read()
    done = [r for r in mf.values() if r["status"] == "done"]
    months = sorted({r["month"] for r in done})
    main = rows[0]
    es = next(e for e in ess if e["tripType"] == "all" and e["control"] == "AB")
    effects = [float(r["effect_pct"]) for r in rows]  # type: ignore[arg-type]
    by = {r["id"]: r for r in rows}
    s = specs.sample_for(panel, g, specs.Case())
    out = {
        "total_trips_raw": sum(int(r["parquet_rows"]) for r in done),
        "total_trips_kept": sum(int(r["kept"]) for r in done),
        "n_files": len(done), "first_month": months[0], "last_month": months[-1],
        "n_treated_zones": main["n_treated"], "n_boundary_zones": len(g.boundary),
        "n_control_a": int(np.isin(s.zone_ids, list(g.control_a)).sum()),
        "n_control_b": int(np.isin(s.zone_ids, list(g.control_b)).sum()),
        "n_ring": len(g.ring),
        "main_beta": main["beta"], "main_se": main["se"], "main_estimate_pct": main["effect_pct"],
        "ci_low_pct": main["ci_low_pct"], "ci_high_pct": main["ci_high_pct"],
        "pretrend_stat": es["lead_chi2"], "pretrend_df": es["lead_df"], "pretrend_p": es["lead_p_chi2"],
        "pretrend_F": es["lead_F"], "pretrend_p_F": es["lead_p_F"],
        "pretrend_slope_per_month_pct": did.pct(es["slope"]["slope_per_month"]),  # type: ignore[index]
        "pretrend_slope_p": es["slope"]["p"],  # type: ignore[index]
        "n_specs": len(rows), "spec_min_pct": min(effects), "spec_max_pct": max(effects),
        "yellow_pct": by["yellow"]["effect_pct"], "fhvhv_pct": by["fhvhv"]["effect_pct"],
        "placebo_2024_01_05_pct": placebos[0]["effect_pct"], "placebo_2024_06_30_pct": placebos[1]["effect_pct"],
        "spillover_pct": spill["ring_vs_control_b"]["effect_pct"],  # type: ignore[index]
        "outer_ring_pct": spill["outer_ring_vs_control_b"]["effect_pct"],  # type: ignore[index]
        "first_week": str(s.weeks[0]), "last_week": str(s.weeks[-1]),
        **stamp("python -m congestion.run_study"),
    }  # fmt: skip
    (RESULTS / "headline.json").write_text(json.dumps(out, indent=1, default=float))
    return out


def run(panel: pd.DataFrame | None = None, g: groups.Groups | None = None) -> dict[str, object]:
    from . import placebo, spillover

    panel = groups.load_panel() if panel is None else panel
    g = groups.load() if g is None else g
    FIG.mkdir(parents=True, exist_ok=True)
    rows = specs.write(panel, g)
    pl = placebo.write(panel, g)
    sp = spillover.write(panel, g)
    ess = event_studies(panel, g)
    main_es = next(e for e in ess if e["tripType"] == "all" and e["control"] == "AB")
    plot_event_study(
        main_es,
        FIG / "event_study.png",
        "Event study: dropoffs into treated zones (all trip types, control A+B)",
    )
    plot_specs(rows, pl, sp, FIG / "specs.png")
    return headline(panel, g, rows, ess, sp, pl)


if __name__ == "__main__":
    print(json.dumps(run(), indent=1, default=float))
