"""Committed results agree with each other and with the aggregates (no hand-typed numbers)."""

import hashlib
import json

import pandas as pd

from congestion.paths import AGG, REPO, RESULTS

API = REPO / "api" / "data"


def load(name: str) -> dict:
    return json.loads((RESULTS / f"{name}.json").read_text())


def test_panel_bin_matches_panel_and_hash() -> None:
    meta = json.loads((API / "panel.meta.json").read_text())
    blob = (API / "panel.bin").read_bytes()
    assert hashlib.sha256(blob).hexdigest() == meta["sha256"] and len(blob) == meta["bytes"]
    panel = pd.read_parquet(AGG / "panel.parquet")
    for t in meta["totals"]:
        s = panel[(panel.trip_type == t["tripType"]) & (panel.outcome == t["outcome"])].trips.sum()
        assert int(s) == t["sum"]


def test_reference_has_61_cases_and_main_matches_specs() -> None:
    ref = load("estimator_reference")
    assert ref["n_cases"] == 61 == len(ref["cases"])
    kinds = [c["kind"] for c in ref["cases"]]
    assert (kinds.count("combo"), kinds.count("exclude"), kinds.count("placebo")) == (36, 20, 5)
    main = next(
        c for c in ref["cases"]
        if c["kind"] == "combo" and c["input"] == {"tripType": "ALL", "control": "AB", "dropBoundary": True,
                                                   "outcome": "DROPOFFS", "excludeZones": [], "placeboStart": None}
    )  # fmt: skip
    assert abs(main["expected"]["beta"] - load("headline")["main_beta"]) < 1e-12


def test_headline_agrees_with_specs_and_reconciliation() -> None:
    h, sp, rec = load("headline"), load("specs"), load("reconciliation")
    assert h["n_specs"] == len(sp["specs"]) == 8
    assert h["spec_min_pct"] == min(r["effect_pct"] for r in sp["specs"])
    assert h["total_trips_raw"] == rec["totals"]["total_trips_raw"]
    t = rec["totals"]
    assert t["unexplained"] == 0
    assert t["total_trips_raw"] == t["total_trips_kept"] + sum(t["dropped_by_reason"].values())
    assert all(f["unexplained"] == 0 for f in rec["files"])
