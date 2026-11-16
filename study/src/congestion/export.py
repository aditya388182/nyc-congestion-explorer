"""Export for the API: panel.bin, panel.meta.json, zones.geojson, results JSON, and the 61-case
estimator reference (statsmodels) used by the TypeScript equivalence test."""

import hashlib
import itertools
import json
import shutil
from datetime import date

import numpy as np
import pandas as pd

from . import groups, specs
from .paths import AGG, REPO, RESULTS
from .results import stamp

API_DATA = REPO / "api" / "data"
TYPES = ["yellow", "green", "fhvhv", "all"]
OUTCOMES = ["dropoffs", "pickups"]
PLACEBO_STARTS = [
    date(2023, 7, 2),
    date(2023, 10, 1),
    date(2024, 1, 7),
    date(2024, 4, 7),
    date(2024, 8, 4),
]
RESULT_FILES = ["headline", "specs", "placebos", "spillover", "event_study", "reconciliation", "planted",
                "exploratory", "zones"]  # fmt: skip


def write_panel(panel: pd.DataFrame, change: pd.DataFrame) -> dict[str, object]:
    zones = sorted(int(z) for z in panel["zone"].unique())
    weeks = sorted(panel["week_start"].unique())
    zi = {z: i for i, z in enumerate(zones)}
    wi = {pd.Timestamp(w): i for i, w in enumerate(weeks)}
    Z, W = len(zones), len(weeks)
    keys = [(t, o) for t in TYPES for o in OUTCOMES]
    # Float64 block first (8-byte aligned): change % per (type, outcome, zone), NaN when undefined
    ch = np.full((len(keys), Z), np.nan)
    for k, (t, o) in enumerate(keys):
        c = change[(change.trip_type == t) & (change.outcome == o)]
        for z, v in zip(c["zone"], c["change_pct"], strict=True):
            if not pd.isna(v):
                ch[k, zi[int(z)]] = v
    parts = [ch.astype("<f8").tobytes()]
    pos = len(parts[0])
    blocks = []
    cells: dict[tuple[str, str], np.ndarray] = {}
    for t, o in keys:
        p = panel[(panel.trip_type == t) & (panel.outcome == o)]
        arr = np.zeros((Z, W), dtype="<i4")
        arr[
            p["zone"].map(zi).to_numpy(),
            p["week_start"].map(lambda x: wi[pd.Timestamp(x)]).to_numpy(),
        ] = p["trips"].to_numpy()
        cells[(t, o)] = arr
        raw = arr.tobytes()
        parts.append(raw)
        blocks.append(
            {"tripType": t, "outcome": o, "offset": pos, "zones": Z, "weeks": W, "dtype": "int32"}
        )
        pos += len(raw)
    blob = b"".join(parts)
    API_DATA.mkdir(parents=True, exist_ok=True)
    (API_DATA / "panel.bin").write_bytes(blob)
    rng = np.random.default_rng(0)
    sample = []
    for _ in range(1000):
        b = int(rng.integers(len(blocks)))
        z, w = int(rng.integers(Z)), int(rng.integers(W))
        sample.append([b, z, w, int(cells[keys[b]][z, w])])
    meta = {
        "zoneIds": zones, "weekStarts": [str(pd.Timestamp(w).date()) for w in weeks],
        "tripTypes": TYPES, "outcomes": OUTCOMES, "blocks": blocks,
        "change": {"offset": 0, "rows": len(keys), "cols": Z, "dtype": "float64",
                   "order": [{"tripType": t, "outcome": o} for t, o in keys]},
        "bytes": len(blob), "sha256": hashlib.sha256(blob).hexdigest(),
        "totals": [{"tripType": t, "outcome": o, "sum": int(cells[(t, o)].astype(np.int64).sum())} for t, o in keys],
        "sample": sample,  # [block index, zone index, week index, value] written by Python
        **stamp("python -m congestion.export"),
    }  # fmt: skip
    (API_DATA / "panel.meta.json").write_text(json.dumps(meta, indent=1))
    return meta


def reference_cases(panel: pd.DataFrame, g: groups.Groups) -> list[dict[str, object]]:
    api_t = {"yellow": "YELLOW", "fhvhv": "FHVHV", "all": "ALL"}
    cases: list[tuple[str, specs.Case]] = []
    for t, c, db, o in itertools.product(
        ["yellow", "fhvhv", "all"], ["A", "B", "AB"], [True, False], ["dropoffs", "pickups"]
    ):
        cases.append(("combo", specs.Case(trip_type=t, control=c, drop_boundary=db, outcome=o)))
    universe = sorted(g.treated | g.boundary | g.control_a | g.control_b)
    for seed in range(20):
        rng = np.random.default_rng(1000 + seed)
        while True:
            k = int(rng.integers(1, 11))
            ex = tuple(sorted(int(z) for z in rng.choice(universe, size=k, replace=False)))
            try:
                specs.run_case(panel, g, specs.Case(exclude=ex), ref=False)
                break
            except specs.InputError:
                continue
        cases.append(("exclude", specs.Case(exclude=ex)))
    for d in PLACEBO_STARTS:
        cases.append(("placebo", specs.Case(placebo_start=d)))
    out = []
    for kind, c in cases:
        r = specs.run_case(panel, g, c, ref=True)  # statsmodels reference
        out.append({
            "kind": kind,
            "input": {"tripType": api_t[c.trip_type], "control": c.control, "dropBoundary": c.drop_boundary,
                      "outcome": c.outcome.upper(), "excludeZones": list(c.exclude),
                      "placeboStart": c.placebo_start.isoformat() if c.placebo_start else None},
            "expected": {"beta": r.beta, "se": r.se, "effectPct": r.effect_pct, "ciLowPct": r.ci_low_pct,
                         "ciHighPct": r.ci_high_pct, "nTreated": r.n_treated, "nControl": r.n_control,
                         "nWeeks": r.n_weeks, "nObs": r.n_obs, "droppedZones": r.dropped_zones},
        })  # fmt: skip
    return out


def main() -> None:
    g = groups.load()
    panel = groups.load_panel()
    change = pd.read_parquet(AGG / "change.parquet")
    meta = write_panel(panel, change)
    cases = reference_cases(panel, g)
    (RESULTS / "estimator_reference.json").write_text(
        json.dumps({"n_cases": len(cases), "cases": cases, "reference": "statsmodels OLS, explicit zone and week dummies, cov_type=cluster",
                    **stamp("python -m congestion.export")}, indent=1)
    )  # fmt: skip
    shutil.copy(AGG / "zones.geojson", API_DATA / "zones.geojson")
    (API_DATA / "results").mkdir(exist_ok=True)
    for name in RESULT_FILES + ["estimator_reference"]:
        src = RESULTS / f"{name}.json"
        if src.exists():
            shutil.copy(src, API_DATA / "results" / f"{name}.json")
    print(f"panel.bin {meta['bytes']} bytes, {len(cases)} reference cases")


if __name__ == "__main__":
    main()
