"""The per-file manifest (data/manifest.csv): restartable bookkeeping for `make data`."""

import csv
import threading
from pathlib import Path

from .paths import MANIFEST

COLUMNS = [
    "url", "trip_type", "month", "bytes", "sha256", "parquet_rows", "rows_counted", "kept",
    "dropped_null_zone", "dropped_unknown_zone", "dropped_outside_month", "dropped_bad_duration",
    "unexplained", "has_fee_column", "aggregated_at", "status", "error",
]  # fmt: skip

_lock = threading.Lock()


def read(path: Path = MANIFEST) -> dict[tuple[str, str], dict[str, str]]:
    if not path.exists():
        return {}
    with path.open(newline="") as fh:
        return {(r["trip_type"], r["month"]): r for r in csv.DictReader(fh)}


def write(rows: dict[tuple[str, str], dict[str, str]], path: Path = MANIFEST) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".csv.tmp")
    with tmp.open("w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=COLUMNS)
        w.writeheader()
        for key in sorted(rows, key=lambda k: (k[0], k[1])):
            w.writerow({c: rows[key].get(c, "") for c in COLUMNS})
    tmp.replace(path)


def update(row: dict[str, str], path: Path = MANIFEST) -> None:
    """Thread-safe upsert of one row; the file is rewritten atomically."""
    with _lock:
        rows = read(path)
        rows[(row["trip_type"], row["month"])] = row
        write(rows, path)
