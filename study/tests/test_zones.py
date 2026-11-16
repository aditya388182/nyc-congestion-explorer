"""Zone classification and control group selection on a fixture."""

import pandas as pd

from congestion import zones


def lookup() -> pd.DataFrame:
    ids = [1, 2, 3, 4, 5, 6, 7, 8, 9]
    boro = [
        "EWR",
        "Manhattan",
        "Manhattan",
        "Manhattan",
        "Manhattan",
        "Queens",
        "Queens",
        "Bronx",
        "Bronx",
    ]
    return pd.DataFrame({"LocationID": ids, "Borough": boro, "Zone": [f"z{i}" for i in ids],
                         "service_zone": "x"})  # fmt: skip


def intra() -> pd.DataFrame:
    rows = []

    def add(z: int, month: str, trips: int, fee: int) -> None:
        rows.append(("yellow", pd.Timestamp(month), z, trips, fee))

    add(2, "2025-02-01", 1000, 950)  # exactly 0.95 -> treated (>=)
    add(3, "2025-02-01", 1000, 949)  # just under -> boundary
    add(4, "2025-02-01", 1000, 50)  # exactly 0.05 -> outside (<=)
    add(5, "2025-02-01", 199, 199)  # 199 trips: too few to classify, whatever the share
    add(2, "2025-01-01", 100000, 0)  # January 2025 is ignored (pre-toll days)
    add(6, "2025-03-01", 500, 0)  # Queens, outside
    add(7, "2025-03-01", 500, 0)
    add(8, "2025-03-01", 500, 0)
    add(9, "2025-03-01", 500, 500)  # Bronx zone with a fee share of 1.0: classification only
    return pd.DataFrame(rows, columns=["trip_type", "month", "zone", "trips", "trips_with_fee"])


def test_thresholds_and_january_exclusion() -> None:
    z = zones.classify(intra(), lookup()).set_index("id")
    assert z.loc[2, "cls"] == "treated" and abs(z.loc[2, "share"] - 0.95) < 1e-12
    assert z.loc[3, "cls"] == "boundary"
    assert z.loc[4, "cls"] == "outside"
    assert z.loc[5, "cls"] == "too_few"
    assert z.loc[1, "cls"] == "too_few"  # no trips at all


def test_control_b_ranking_excludes_airports_manhattan_and_unclassified() -> None:
    z = zones.classify(intra(), lookup())
    daily = pd.DataFrame(
        {
            "direction": "dropoff",
            "date": pd.Timestamp("2024-06-01"),
            "zone": [1, 2, 6, 7, 8, 9],
            "trips": [900, 800, 30, 70, 50, 10],
        }
    )
    # zone 1 = airport (and EWR), 2 = Manhattan, 9 = non-Manhattan but boundary/treated-looking
    b = zones.control_b(daily, z)
    assert b == [7, 8, 6]
    z = zones.assign_groups(z, b, ring={3})
    g = z.set_index("id")["group"].to_dict()
    assert g[2] == "TREATED" and g[3] == "BOUNDARY" and g[4] == "CONTROL_A"
    assert (
        g[5] == "UNCLASSIFIED" and g[6] == "CONTROL_B" and g[9] == "TREATED"
    )  # run() raises for a non-Manhattan treated zone
    assert z.set_index("id").loc[3, "ring"]
