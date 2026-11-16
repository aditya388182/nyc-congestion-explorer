"""Spillover (SPEC 7.5, DECISIONS.md D10): ring zones vs control B, plus the outer ring."""

import json

import pandas as pd

from . import did, groups, specs
from .paths import RESULTS
from .results import stamp


def _vs_b(panel: pd.DataFrame, g: groups.Groups, ids: set[int], name: str) -> dict[str, object]:
    # the zones tested as "treated" are removed from control B; unclassified zones never enter
    ids = ids - g.unclassified
    s = did.build_sample(panel, "all", "dropoffs", ids, g.control_b - ids)
    r = did.did(s, specs.TOLL_START)
    return {"id": name, "n_zones_tested": len(ids), "zone_ids": sorted(int(z) for z in s.zone_ids[s.zone_treated]),
            **r.__dict__}  # fmt: skip


def write(panel: pd.DataFrame, g: groups.Groups) -> dict[str, object]:
    ring = _vs_b(panel, g, g.ring, "ring_vs_control_b")
    outer = _vs_b(panel, g, g.ring2, "outer_ring_vs_control_b")
    # robustness (declared in D10): main specification without the outer-ring zones in control A
    base = specs.Case()
    keep = g.control("AB") - g.ring2
    treated = specs.treated_ids(g, base)
    s = did.build_sample(panel, "all", "dropoffs", treated, keep - treated)
    main_wo = did.did(s, specs.TOLL_START)
    out = {
        "ring_vs_control_b": ring,
        "outer_ring_vs_control_b": outer,
        "main_without_outer_ring": {"id": "main_without_ring2", **main_wo.__dict__},
        "note": "Ring zones are all boundary zones (partly charged): the ring estimate mixes partial "
        "treatment with spillover. The outer ring (control-A zones touching the ring) is the clean test "
        "of contamination of control A.",
        **stamp("python -m congestion.spillover"),
    }
    (RESULTS / "spillover.json").write_text(json.dumps(out, indent=1, default=float))
    return out


if __name__ == "__main__":
    write(groups.load_panel(), groups.load())
