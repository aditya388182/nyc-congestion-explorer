"""Download TLC files (at most 2 at a time), aggregate each, reconcile, delete the raw file.

Run: `python -m congestion.download [--only yellow 2025-01] [--max-files N]`.
URLs come from the TLC trip record page; file names are never guessed.
"""

import argparse
import hashlib
import json
import re
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from pathlib import Path

import httpx
import pandas as pd

from . import aggregate, manifest, sources
from .logs import get_logger
from .paths import AGG, FIRST_MONTH, PARTS, RAW, RESULTS, TLC_PAGE, TRIP_TYPES

log = get_logger("download")
USER_AGENT = "Mozilla/5.0 (compatible; trip-data-research-client)"
LINK_RE = re.compile(
    r"https://d37ci6vzurychx\.cloudfront\.net/trip-data/"
    r"(yellow|green|fhvhv)_tripdata_(\d{4}-\d{2})\.parquet"
)
MAX_PARALLEL = 2
RETRIES = 5


def list_links() -> dict[tuple[str, str], str]:
    """Every in-scope (trip_type, month) -> URL as listed on the TLC page."""
    r = httpx.get(TLC_PAGE, headers={"User-Agent": USER_AGENT}, follow_redirects=True, timeout=60)
    r.raise_for_status()
    links: dict[tuple[str, str], str] = {}
    for m in LINK_RE.finditer(r.text):
        t, month = m.group(1), m.group(2)
        if month >= FIRST_MONTH:
            links[(t, month)] = m.group(0)
    return links


def fetch(url: str, dest: Path) -> tuple[int, str]:
    """Stream to dest with retry and exponential backoff. Returns (bytes, sha256)."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    last: Exception | None = None
    for attempt in range(RETRIES):
        try:
            h = hashlib.sha256()
            n = 0
            with httpx.stream("GET", url, headers={"User-Agent": USER_AGENT}, timeout=120,
                              follow_redirects=True) as r:  # fmt: skip
                r.raise_for_status()
                with dest.open("wb") as fh:
                    for chunk in r.iter_bytes(1 << 20):
                        fh.write(chunk)
                        h.update(chunk)
                        n += len(chunk)
            return n, h.hexdigest()
        except (httpx.HTTPError, OSError) as e:
            last = e
            wait = 2**attempt
            log.warning("retry", extra={"fields": {"url": url, "attempt": attempt, "wait": wait,
                                                   "error": str(e)}})  # fmt: skip
            time.sleep(wait)
    raise RuntimeError(f"download failed after {RETRIES} attempts: {url}: {last}")


def part_path(trip_type: str, month: str, kind: str) -> Path:
    return PARTS / f"{kind}_{trip_type}_{month}.parquet"


def process(trip_type: str, month: str, url: str) -> dict[str, str]:
    row = {"url": url, "trip_type": trip_type, "month": month, "status": "failed"}
    dest = RAW / f"{trip_type}_tripdata_{month}.parquet"
    t0 = time.time()
    try:
        nbytes, sha = fetch(url, dest)
        con = aggregate.new_connection()
        res = aggregate.aggregate_file(con, dest, trip_type, month)
        con.close()
        PARTS.mkdir(parents=True, exist_ok=True)
        assert res.daily is not None and res.intra is not None
        res.daily.to_parquet(part_path(trip_type, month, "daily"), index=False)
        res.intra.to_parquet(part_path(trip_type, month, "intra"), index=False)
        row.update(
            bytes=str(nbytes), sha256=sha, parquet_rows=str(res.parquet_rows),
            rows_counted=str(res.rows_counted), kept=str(res.kept),
            dropped_null_zone=str(res.dropped["null_zone"]),
            dropped_unknown_zone=str(res.dropped["unknown_zone"]),
            dropped_outside_month=str(res.dropped["outside_month"]),
            dropped_bad_duration=str(res.dropped["bad_duration"]),
            unexplained=str(res.unexplained), has_fee_column=str(res.has_fee_column),
            aggregated_at=datetime.now(UTC).isoformat(timespec="seconds"),
            status="done" if res.unexplained == 0 and res.parquet_rows == res.rows_counted
            else "reconciliation_failed",
            error="",
        )  # fmt: skip
        log.info("file done", extra={"fields": {"type": trip_type, "month": month,
                 "seconds": round(time.time() - t0, 1), **{k: row[k] for k in ("kept", "unexplained")}}})  # fmt: skip
    except Exception as e:  # noqa: BLE001  recorded in the manifest, never swallowed silently
        row["error"] = str(e)[:300]
        log.error(
            "file failed", extra={"fields": {"type": trip_type, "month": month, "error": str(e)}}
        )
    finally:
        if dest.exists():
            dest.unlink()  # the pipeline deletes the raw file after aggregation (one explicit path)
    manifest.update(row)
    return row


def combine() -> None:
    """Append all per-file parts into data/agg/daily_counts.parquet and intra_zone.parquet."""
    for kind, out in (("daily", "daily_counts.parquet"), ("intra", "intra_zone.parquet")):
        parts = sorted(PARTS.glob(f"{kind}_*.parquet"))
        if not parts:
            continue
        df = pd.concat([pd.read_parquet(p) for p in parts], ignore_index=True)
        df.to_parquet(AGG / out, index=False, compression="zstd")
        log.info("combined", extra={"fields": {"kind": kind, "files": len(parts), "rows": len(df)}})


def write_reconciliation() -> dict[str, object]:
    rows = manifest.read()
    done = [r for r in rows.values() if r["status"] == "done"]
    reasons = ["null_zone", "unknown_zone", "outside_month", "bad_duration"]
    tot = {
        "n_files_done": len(done),
        "n_files_not_done": len(rows) - len(done),
        "total_trips_raw": sum(int(r["parquet_rows"]) for r in done),
        "total_trips_kept": sum(int(r["kept"]) for r in done),
        "dropped_by_reason": {k: sum(int(r[f"dropped_{k}"]) for r in done) for k in reasons},
        "unexplained": sum(int(r["unexplained"]) for r in done),
    }
    files = [
        {
            "trip_type": r["trip_type"], "month": r["month"], "raw": int(r["parquet_rows"]),
            "kept": int(r["kept"]),
            **{k: int(r[f"dropped_{k}"]) for k in reasons},
            "unexplained": int(r["unexplained"]),
        }
        for r in sorted(done, key=lambda r: (r["trip_type"], r["month"]))
    ]  # fmt: skip
    from .results import stamp

    out = {"totals": tot, "files": files, **stamp("python -m congestion.download")}
    RESULTS.mkdir(exist_ok=True)
    (RESULTS / "reconciliation.json").write_text(json.dumps(out, indent=1))
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs=2, metavar=("TYPE", "MONTH"))
    ap.add_argument("--max-files", type=int)
    ap.add_argument("--offline-list", action="store_true", help="print the plan and exit")
    args = ap.parse_args()

    links = list_links()
    missing = [
        (t, m) for t in TRIP_TYPES for m in sorted({m for (_, m) in links}) if (t, m) not in links
    ]
    if missing:
        log.warning("months missing on TLC page", extra={"fields": {"missing": missing}})
    plan = sorted(links)
    if args.only:
        plan = [k for k in plan if k == (args.only[0], args.only[1])]
    done = manifest.read()
    todo = [k for k in plan if done.get(k, {}).get("status") != "done"]
    if args.max_files:
        todo = todo[: args.max_files]
    log.info("plan", extra={"fields": {"in_scope": len(links), "todo": len(todo)}})
    if args.offline_list:
        return
    with ThreadPoolExecutor(max_workers=MAX_PARALLEL) as pool:
        list(pool.map(lambda k: process(k[0], k[1], links[k]), todo))
    combine()
    write_reconciliation()
    sources.main()


if __name__ == "__main__":
    main()
