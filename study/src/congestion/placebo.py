"""Placebo start dates on pre-2025 weeks only (SPEC 7.3)."""

import json
from datetime import date

import pandas as pd

from . import groups, specs
from .paths import RESULTS
from .results import stamp

PLACEBO_DATES = [date(2024, 1, 5), date(2024, 6, 30)]


def write(panel: pd.DataFrame, g: groups.Groups) -> list[dict[str, object]]:
    rows = []
    for d in PLACEBO_DATES:
        # weeks start on Sunday: the placebo "post" is weeks starting on or after the date
        c = specs.Case(placebo_start=d)
        r = specs.run_case(panel, g, c)
        rows.append(specs._row(f"placebo_{d.isoformat()}", f"Placebo start {d.isoformat()}", c, r))
    (RESULTS / "placebos.json").write_text(
        json.dumps(
            {"placebos": rows, **stamp("python -m congestion.placebo")}, indent=1, default=float
        )
    )
    return rows


if __name__ == "__main__":
    write(groups.load_panel(), groups.load())
