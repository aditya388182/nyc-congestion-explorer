"""Exclusion rules and reconciliation on small hand-built fixture files."""

from pathlib import Path

import pandas as pd
import pytest

from congestion import aggregate


def write(path: Path, trip_type: str, rows: list[dict], fee: bool) -> Path:
    cols = {
        "yellow": ("tpep_pickup_datetime", "tpep_dropoff_datetime"),
        "green": ("lpep_pickup_datetime", "lpep_dropoff_datetime"),
        "fhvhv": ("pickup_datetime", "dropoff_datetime"),
    }[trip_type]
    df = pd.DataFrame(
        {
            "PULocationID": pd.array([r["pu"] for r in rows], dtype="Int32"),
            "DOLocationID": pd.array([r["do"] for r in rows], dtype="Int64"),  # widths differ
            cols[0]: pd.to_datetime([r["pickup"] for r in rows], format="ISO8601"),
            cols[1]: pd.to_datetime([r["dropoff"] for r in rows], format="ISO8601"),
        }
    )
    if fee:
        df["cbd_congestion_fee"] = [r.get("fee") for r in rows]
    df.to_parquet(path, index=False)
    return path


ROWS = [
    # kept: inside month, 10 minutes, fee 0.75 -> trips_with_fee
    dict(pu=161, do=162, pickup="2025-01-10 08:00", dropoff="2025-01-10 08:10", fee=0.75),
    # kept: intra-zone, refund fee -0.75 does NOT count as a fee
    dict(pu=161, do=161, pickup="2025-01-31 23:55", dropoff="2025-02-01 00:05", fee=-0.75),
    # kept: intra-zone, NULL fee
    dict(pu=5, do=5, pickup="2025-01-02 01:00", dropoff="2025-01-02 01:30", fee=None),
    # null_zone (also unknown pickup would be 264, but null wins by order)
    dict(pu=None, do=264, pickup="2025-01-05 10:00", dropoff="2025-01-05 10:10"),
    # unknown_zone (also outside month: first reason wins)
    dict(pu=265, do=10, pickup="2024-12-31 10:00", dropoff="2024-12-31 10:10"),
    # outside_month (also a bad duration: first reason wins)
    dict(pu=10, do=11, pickup="2025-02-01 00:00", dropoff="2025-02-01 00:00"),
    # bad_duration: 59 seconds (just under a minute), exactly 60 s is kept, > 4 h dropped
    dict(pu=10, do=11, pickup="2025-01-03 10:00:00", dropoff="2025-01-03 10:00:59"),
    dict(pu=10, do=11, pickup="2025-01-03 11:00:00", dropoff="2025-01-03 11:01:00"),
    dict(pu=10, do=11, pickup="2025-01-03 12:00:00", dropoff="2025-01-03 16:00:01"),
    dict(pu=10, do=11, pickup="2025-01-03 17:00:00", dropoff="2025-01-03 16:00:00"),  # negative
    dict(pu=10, do=11, pickup="2025-01-03 18:00:00", dropoff="2025-01-03 22:00:00"),  # = 4 h kept
]


@pytest.mark.parametrize("trip_type", ["yellow", "green", "fhvhv"])
def test_exclusion_order_and_reconciliation(tmp_path: Path, trip_type: str) -> None:
    f = write(tmp_path / f"{trip_type}.parquet", trip_type, ROWS, fee=True)
    res = aggregate.aggregate_file(aggregate.new_connection(1, "1GB"), f, trip_type, "2025-01")
    assert res.parquet_rows == res.rows_counted == len(ROWS)
    assert res.dropped == {
        "null_zone": 1,
        "unknown_zone": 1,
        "outside_month": 1,
        "bad_duration": 3,
    }
    assert res.kept == 5
    assert res.unexplained == 0
    assert res.has_fee_column


def test_daily_and_intra_counts(tmp_path: Path) -> None:
    f = write(tmp_path / "y.parquet", "yellow", ROWS, fee=True)
    res = aggregate.aggregate_file(aggregate.new_connection(1, "1GB"), f, "yellow", "2025-01")
    assert res.daily is not None and res.intra is not None
    d = res.daily
    # dropoff of the Jan-31 trip lands on 2025-02-01 (dropoff date), pickup on 2025-01-31
    drop = d[(d.direction == "dropoff") & (d.zone == 161)]
    assert sorted(str(x.date()) for x in drop.date) == ["2025-02-01"]
    pick = d[(d.direction == "pickup") & (d.zone == 161)].set_index("date")
    assert pick.loc[pd.Timestamp("2025-01-10"), "trips_with_fee"] == 1
    assert pick.loc[pd.Timestamp("2025-01-31"), "trips_with_fee"] == 0
    assert pick.loc[pd.Timestamp("2025-01-31"), "fee_sum"] == pytest.approx(-0.75)
    # dropoff and pickup totals both equal the kept rows
    assert d.groupby("direction").trips.sum().to_dict() == {"dropoff": 5, "pickup": 5}
    # intra-zone: zone 161 has 1 trip (refund, no fee), zone 5 has 1 (NULL fee)
    i = res.intra.set_index("zone")
    assert i.loc[161, "trips"] == 1 and i.loc[161, "trips_with_fee"] == 0
    assert i.loc[5, "trips"] == 1 and i.loc[5, "trips_with_fee"] == 0
    assert str(i["month"].iloc[0].date()) == "2025-01-01"


def test_file_without_fee_column(tmp_path: Path) -> None:
    f = write(tmp_path / "old.parquet", "fhvhv", ROWS, fee=False)
    res = aggregate.aggregate_file(aggregate.new_connection(1, "1GB"), f, "fhvhv", "2025-01")
    assert not res.has_fee_column
    assert res.unexplained == 0
    assert res.daily is not None
    assert res.daily["trips_with_fee"].sum() == 0
    assert (res.daily["fee_sum"] == 0).all()


def test_month_bounds_december() -> None:
    from datetime import date

    assert aggregate.month_bounds("2024-12") == (date(2024, 12, 1), date(2025, 1, 1))
