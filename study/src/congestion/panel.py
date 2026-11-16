"""Weekly zone panel from daily counts (SQL in study/sql/panel.sql)."""

from dataclasses import dataclass
from datetime import date

import duckdb
import pandas as pd

from . import sqlfiles


@dataclass
class PanelResult:
    panel: pd.DataFrame
    change: pd.DataFrame


def build(daily: pd.DataFrame, first_day: date, last_day: date, post_start: date) -> PanelResult:
    """Dense weekly panel (zone x week x trip_type incl. `all` x outcome) with window columns.

    Only complete Sunday-start weeks inside [first_day, last_day] are kept. `post_start` is
    the first treated week (also the end of the "pre period" for the volume rank).
    """
    con = duckdb.connect()
    q = sqlfiles.load("panel.sql")
    con.register("daily", daily)
    con.execute(q["weekly"], [first_day.isoformat(), last_day.isoformat(), first_day.isoformat()])
    con.execute(q["panel"], [post_start.isoformat()])
    panel = con.execute("SELECT * FROM panel ORDER BY trip_type, outcome, zone, week_start").df()
    change = con.execute(q["change"], [post_start.isoformat(), post_start.isoformat()]).df()
    con.close()
    return PanelResult(panel, change)


def main() -> None:
    """Build the real panel from data/agg/daily_counts.parquet into data/agg/panel.parquet."""
    import calendar

    from . import manifest
    from .paths import AGG

    months = sorted({m for (_, m) in manifest.read()})
    y, m = (int(x) for x in months[-1].split("-"))
    last_day = date(y, m, calendar.monthrange(y, m)[1])
    first_day = date(int(months[0][:4]), int(months[0][5:7]), 1)
    daily = pd.read_parquet(AGG / "daily_counts.parquet")
    daily["date"] = pd.to_datetime(daily["date"])
    res = build(daily, first_day, last_day, date(2025, 1, 5))
    res.panel.to_parquet(AGG / "panel.parquet", index=False, compression="zstd")
    res.change.to_parquet(AGG / "change.parquet", index=False, compression="zstd")
    print(
        f"panel rows={len(res.panel)} weeks={res.panel.week_start.nunique()} "
        f"first={res.panel.week_start.min().date()} last={res.panel.week_start.max().date()}"
    )


if __name__ == "__main__":
    main()
