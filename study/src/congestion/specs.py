"""One function for every estimate in the study (and the API reference cases), plus the 8-row table.

The main specification (SPEC 7.1) is FIXED: outcome dropoffs, trip type all, control AB, boundary
zones dropped, post = weeks starting on or after 2025-01-05, all weeks in the data.
"""

import json
from dataclasses import asdict, dataclass
from datetime import date

import numpy as np
import pandas as pd

from . import did, groups
from .paths import RESULTS
from .results import stamp

TOLL_START = date(2025, 1, 5)
MIN_WEEKS_EACH_SIDE = 13
MIN_ZONES = 5


@dataclass(frozen=True)
class Case:
    trip_type: str = "all"  # yellow | green | fhvhv | all
    control: str = "AB"  # A | B | AB
    drop_boundary: bool = True  # False: boundary zones are treated
    outcome: str = "dropoffs"
    exclude: tuple[int, ...] = ()
    placebo_start: date | None = None
    weighted: bool = False


def treated_ids(g: groups.Groups, c: Case) -> set[int]:
    return g.treated if c.drop_boundary else g.treated | g.boundary


def sample_for(panel: pd.DataFrame, g: groups.Groups, c: Case) -> did.Sample:
    end = None
    if c.placebo_start is not None:
        end = TOLL_START - pd.Timedelta(days=1)  # pre-2025 weeks only
        end = date(end.year, end.month, end.day)
    treated = treated_ids(g, c)
    s = did.build_sample(panel, c.trip_type, c.outcome, treated, g.control(c.control) - treated,
                         end=end, exclude=set(c.exclude))  # fmt: skip
    if c.weighted:
        p = panel[(panel["trip_type"] == c.trip_type) & (panel["outcome"] == c.outcome)]
        p = p[(p["week_start"] >= "2024-01-01") & (p["week_start"] < "2025-01-01")]
        vol = p.groupby("zone")["trips"].sum()
        s.weight = vol.reindex(s.zone_ids).to_numpy(dtype=np.float64)[s.zone]
    return s


class InputError(ValueError):
    """Invalid estimate request (the API maps this to BAD_USER_INPUT)."""


def run_case(panel: pd.DataFrame, g: groups.Groups, c: Case, ref: bool = True) -> did.DidResult:
    s = sample_for(panel, g, c)
    post_start = c.placebo_start or TOLL_START
    if int(s.zone_treated.sum()) < MIN_ZONES or int((~s.zone_treated).sum()) < MIN_ZONES:
        raise InputError("fewer than 5 treated or 5 control zones left")
    n_pre = int((s.weeks < np.datetime64(post_start)).sum())
    n_post = s.n_weeks - n_pre
    if min(n_pre, n_post) < MIN_WEEKS_EACH_SIDE:
        raise InputError("fewer than 13 weeks on one side of the start date")
    return did.did(s, post_start, ref=ref)


def _row(name: str, label: str, c: Case, r: did.DidResult) -> dict[str, object]:
    return {"id": name, "label": label, "case": {k: (v.isoformat() if isinstance(v, date) else v)
            for k, v in asdict(c).items()}, **asdict(r)}  # fmt: skip


SPEC_DEFS: list[tuple[str, str, Case]] = [
    ("main", "Main (pre-registered)", Case()),
    ("control_a", "Control A only", Case(control="A")),
    ("control_b", "Control B only", Case(control="B")),
    ("boundary_treated", "Boundary zones kept as treated", Case(drop_boundary=False)),
    ("pickups", "Outcome = pickups", Case(outcome="pickups")),
    ("yellow", "Yellow only ($0.75)", Case(trip_type="yellow")),
    ("fhvhv", "fhvhv only ($1.50)", Case(trip_type="fhvhv")),
    ("weighted", "Weighted by 2024 zone volume (WLS)", Case(weighted=True)),
]


def run_specs(panel: pd.DataFrame, g: groups.Groups) -> list[dict[str, object]]:
    return [_row(n, label, c, run_case(panel, g, c)) for n, label, c in SPEC_DEFS]


def write(panel: pd.DataFrame, g: groups.Groups) -> list[dict[str, object]]:
    rows = run_specs(panel, g)
    out = {"specs": rows, **stamp("python -m congestion.specs")}
    (RESULTS / "specs.json").write_text(json.dumps(out, indent=1, default=float))
    cols = ["id", "label", "beta", "se", "effect_pct", "ci_low_pct", "ci_high_pct", "n_treated",
            "n_control", "n_weeks", "n_obs", "dropped_zones"]  # fmt: skip
    df = pd.DataFrame([{c: r[c] for c in cols} for r in rows])
    df["dropped_zones"] = df["dropped_zones"].apply(lambda z: " ".join(map(str, z)))
    df.to_csv(RESULTS / "specs.csv", index=False)
    return rows


if __name__ == "__main__":
    write(groups.load_panel(), groups.load())
