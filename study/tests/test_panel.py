"""Weekly panel on a hand-built 3-zone fixture with known answers for every column."""

from datetime import date

import pandas as pd
import pytest

from congestion import panel

D = pd.Timestamp


def rows() -> pd.DataFrame:
    r = []

    def add(t: str, d: str, z: int, direction: str, n: int, fee: int = 0) -> None:
        r.append((t, D(d), z, direction, n, fee, 0.75 * fee))

    # zone 1, yellow dropoffs: 10/day for 14 days starting Sunday 2024-01-07 (weeks W0, W1 = 70)
    for k in range(14):
        add("yellow", str(D("2024-01-07") + pd.Timedelta(days=k))[:10], 1, "dropoff", 10)
    add("yellow", "2024-01-03", 1, "dropoff", 99)  # before the first complete week: dropped
    # Saturday 2025-01-04 -> week 2024-12-29; Sunday 2025-01-05 and Saturday 2025-01-11 -> week 2025-01-05
    add("yellow", "2025-01-04", 1, "dropoff", 2)
    add("yellow", "2025-01-05", 1, "dropoff", 1, fee=1)
    add("yellow", "2025-01-11", 1, "dropoff", 4, fee=4)
    add("yellow", "2025-01-12", 1, "dropoff", 7, fee=7)  # Sunday: next week
    add("yellow", "2025-02-16", 1, "dropoff", 55)  # after the last complete week: dropped
    # zone 2: yellow 5 and green 3 dropoffs on the first Sunday -> `all` = 8
    add("yellow", "2024-01-07", 2, "dropoff", 5)
    add("green", "2024-01-07", 2, "dropoff", 3)
    # zone 3: only a pickup
    add("yellow", "2024-01-08", 3, "pickup", 9)
    return pd.DataFrame(
        r, columns=["trip_type", "date", "zone", "direction", "trips", "trips_with_fee", "fee_sum"]
    )


@pytest.fixture(scope="module")
def res() -> panel.PanelResult:
    return panel.build(rows(), date(2024, 1, 3), date(2025, 2, 15), date(2025, 1, 5))


def cell(p: pd.DataFrame, t: str, o: str, z: int, w: str, col: str) -> float:
    m = p[(p.trip_type == t) & (p.outcome == o) & (p.zone == z) & (p.week_start == D(w))]
    assert len(m) == 1, (t, o, z, w, len(m))
    return m[col].iloc[0]


def test_weeks_are_complete_sunday_weeks(res: panel.PanelResult) -> None:
    weeks = sorted(res.panel.week_start.unique())
    assert weeks[0] == D("2024-01-07")  # 2024-01-03 is a Wednesday: first complete week
    assert weeks[-1] == D("2025-02-09")  # week ending Saturday 2025-02-15
    assert len(weeks) == 58
    assert all(pd.Timestamp(w).day_of_week == 6 for w in weeks)  # Sunday
    # dense: every zone has every week for every (type, outcome)
    assert len(res.panel) == 3 * 2 * 3 * 58  # yellow, green, all (no fhvhv rows in fixture)


def test_sums_sunday_boundary_and_exclusions(res: panel.PanelResult) -> None:
    p = res.panel
    assert cell(p, "yellow", "dropoffs", 1, "2024-01-07", "trips") == 70
    assert cell(p, "yellow", "dropoffs", 1, "2024-01-14", "trips") == 70  # the 99 on 01-03 excluded
    assert cell(p, "yellow", "dropoffs", 1, "2024-12-29", "trips") == 2  # Saturday 01-04
    assert cell(p, "yellow", "dropoffs", 1, "2025-01-05", "trips") == 5  # Sun + Sat
    assert cell(p, "yellow", "dropoffs", 1, "2025-01-05", "trips_with_fee") == 5
    assert cell(p, "yellow", "dropoffs", 1, "2025-01-05", "fee_sum") == pytest.approx(3.75)
    assert cell(p, "yellow", "dropoffs", 1, "2025-01-12", "trips") == 7
    assert p[p.trips == 55].empty and p[p.trips == 99].empty


def test_all_type_is_sum_and_missing_weeks_are_zero(res: panel.PanelResult) -> None:
    p = res.panel
    assert cell(p, "all", "dropoffs", 2, "2024-01-07", "trips") == 8
    assert cell(p, "green", "dropoffs", 2, "2024-01-07", "trips") == 3
    assert cell(p, "yellow", "pickups", 3, "2024-01-07", "trips") == 9
    assert cell(p, "yellow", "dropoffs", 3, "2024-01-07", "trips") == 0


def test_lag52_across_the_year_gap(res: panel.PanelResult) -> None:
    p = res.panel
    # 2025-01-05 is exactly 52 weeks after 2024-01-07 even though 50 weeks in between are empty
    assert cell(p, "yellow", "dropoffs", 1, "2025-01-05", "lag52") == 70
    assert cell(p, "yellow", "dropoffs", 1, "2025-01-12", "lag52") == 70
    assert pd.isna(cell(p, "yellow", "dropoffs", 1, "2024-01-07", "lag52"))
    assert (
        cell(p, "yellow", "dropoffs", 1, "2025-02-09", "lag52") == 0
    )  # same week last year: empty


def test_rolling_mean_and_rank(res: panel.PanelResult) -> None:
    p = res.panel
    assert pd.isna(cell(p, "yellow", "dropoffs", 1, "2024-01-21", "roll4"))  # only 3 weeks so far
    assert cell(p, "yellow", "dropoffs", 1, "2024-01-28", "roll4") == pytest.approx(35.0)
    assert cell(p, "yellow", "dropoffs", 1, "2025-01-12", "roll4") == pytest.approx(3.5)
    ranks = {z: cell(p, "yellow", "dropoffs", z, "2024-01-07", "pre_rank") for z in (1, 2, 3)}
    assert ranks == {1: 1, 2: 2, 3: 3}


def test_change_column(res: panel.PanelResult) -> None:
    c = res.change
    m = c[(c.trip_type == "yellow") & (c.outcome == "dropoffs") & (c.zone == 1)].iloc[0]
    assert m.post_mean == pytest.approx(12 / 52)
    assert m.change_pct == pytest.approx(100 * (12 / 140 - 1))
    m3 = c[(c.trip_type == "yellow") & (c.outcome == "dropoffs") & (c.zone == 3)].iloc[0]
    assert pd.isna(m3.change_pct)  # no year-ago volume: undefined, not 0 or inf
