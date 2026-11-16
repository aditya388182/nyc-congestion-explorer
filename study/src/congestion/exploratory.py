"""POST-HOC analyses (not pre-registered; DECISIONS.md D14). Reported next to the main estimate."""

import json
from datetime import timedelta

import numpy as np
import pandas as pd

from . import did, groups, specs
from .paths import RESULTS
from .results import stamp

DAYS_PER_MONTH = 30.4375


def run(panel: pd.DataFrame, g: groups.Groups) -> dict[str, object]:
    s = specs.sample_for(panel, g, specs.Case())
    start = np.datetime64(specs.TOLL_START)
    post = (s.weeks[s.week] >= start).astype(float)
    months = (s.weeks[s.week] - start).astype("timedelta64[D]").astype(float) / DAYS_PER_MONTH
    X = np.column_stack([s.treated * post, s.treated * months])
    fit = did.twfe_statsmodels(s, X, ["treated_post", "treated_trend"])
    b, se = fit.b("treated_post"), fit.se("treated_post")
    trend_adj = {
        "label": "Main DiD + treated-specific linear trend (post hoc)",
        "beta": b, "se": se, "effect_pct": did.pct(b),
        "ci_low_pct": did.pct(b - did.Z975 * se), "ci_high_pct": did.pct(b + did.Z975 * se),
        "trend_per_month_pct": did.pct(fit.b("treated_trend")), "trend_se": fit.se("treated_trend"),
        "n_obs": len(s.y), "n_weeks": s.n_weeks, "n_treated": int(s.zone_treated.sum()),
        "n_control": int((~s.zone_treated).sum()),
    }  # fmt: skip
    lo = np.datetime64(specs.TOLL_START - timedelta(weeks=52))
    hi = np.datetime64(specs.TOLL_START + timedelta(weeks=52))
    short = did.restrict_weeks(s, (s.weeks >= lo) & (s.weeks < hi))
    r = did.did(short, specs.TOLL_START)
    out = {
        "note": "Post hoc: added after the pre-registered estimates showed a pre-trend. Not a replacement for the main specification.",
        "trend_adjusted": trend_adj,
        "short_window_52_52": {"label": "Main DiD, 52 weeks before vs 52 weeks after (post hoc)", **r.__dict__},
        **stamp("python -m congestion.exploratory"),
    }  # fmt: skip
    (RESULTS / "exploratory.json").write_text(json.dumps(out, indent=1, default=float))
    return out


if __name__ == "__main__":
    o = run(groups.load_panel(), groups.load())
    print(
        json.dumps(
            {k: v for k, v in o.items() if k in ("trend_adjusted", "short_window_52_52")},
            indent=1,
            default=float,
        )
    )
