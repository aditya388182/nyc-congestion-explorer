"""Aggregate one raw TLC Parquet file into daily counts and intra-zone counts.

The raw file is read by DuckDB through SQL in study/sql/. This module only chooses which fixed
statement to run and binds parameters; no SQL is assembled from strings.
"""

from dataclasses import dataclass, field
from datetime import date
from pathlib import Path

import duckdb
import pandas as pd

from . import sqlfiles

REASONS = ("null_zone", "unknown_zone", "outside_month", "bad_duration")


@dataclass
class FileResult:
    parquet_rows: int
    rows_counted: int
    kept: int
    dropped: dict[str, int] = field(default_factory=dict)
    has_fee_column: bool = False
    daily: pd.DataFrame | None = None
    intra: pd.DataFrame | None = None

    @property
    def unexplained(self) -> int:
        return self.parquet_rows - self.kept - sum(self.dropped.values())


def month_bounds(month: str) -> tuple[date, date]:
    year, mon = (int(x) for x in month.split("-"))
    start = date(year, mon, 1)
    nxt = date(year + (mon == 12), mon % 12 + 1, 1)
    return start, nxt


def new_connection(threads: int = 2, memory_limit: str = "5GB") -> duckdb.DuckDBPyConnection:
    return duckdb.connect(config={"threads": threads, "memory_limit": memory_limit})


def aggregate_file(
    con: duckdb.DuckDBPyConnection, path: Path, trip_type: str, month: str
) -> FileResult:
    """Run the aggregation for one file. `rows_counted` is count(*) of the loaded table."""
    norm = sqlfiles.load("normalize.sql")
    agg = sqlfiles.load("aggregate_month.sql")
    src = str(path)

    parquet_rows = int(
        con.execute("SELECT SUM(num_rows) FROM parquet_file_metadata(?)", [src]).fetchone()[0]
    )
    has_fee = (
        con.execute(
            "SELECT COUNT(*) FROM parquet_schema(?) WHERE name = 'cbd_congestion_fee'", [src]
        ).fetchone()[0]
        > 0
    )
    con.execute(norm[f"{trip_type}_{'fee' if has_fee else 'nofee'}"], [src])
    rows_counted = int(con.execute("SELECT COUNT(*) FROM trips").fetchone()[0])

    start, nxt = month_bounds(month)
    con.execute(agg["classify"], [start.isoformat(), nxt.isoformat()])
    counts = {r: n for r, n in con.execute(agg["reconcile"]).fetchall()}
    kept = int(counts.pop("kept", 0))
    dropped = {r: int(counts.get(r, 0)) for r in REASONS}
    daily = con.execute(agg["daily"], [trip_type, trip_type]).df()
    intra = con.execute(agg["intra"], [trip_type, start.isoformat()]).df()
    con.execute("DROP TABLE trips")
    con.execute("DROP TABLE classified")
    return FileResult(parquet_rows, rows_counted, kept, dropped, has_fee, daily, intra)
