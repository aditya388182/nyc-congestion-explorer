"""DiD on a tiny hand-computed panel, and reference (statsmodels) vs alternating projections."""

from datetime import date

import numpy as np
import pandas as pd
import pytest

from congestion import did


def make_sample(y: np.ndarray, nz: int, nw: int, treated_zones: list[int], keep=None) -> did.Sample:
    zone, week = np.meshgrid(np.arange(nz), np.arange(nw), indexing="ij")
    zone, week = zone.ravel(), week.ravel()
    if keep is not None:
        zone, week, y = zone[keep], week[keep], y[keep]
    zt = np.isin(np.arange(nz), treated_zones)
    weeks = (np.datetime64("2025-01-05") + 7 * (np.arange(nw) - nw // 2)).astype("datetime64[D]")
    return did.Sample(zone=zone, week=week, y=y, treated=zt[zone].astype(float),
                      zone_ids=np.arange(nz) + 100, weeks=weeks, zone_treated=zt)  # fmt: skip


def test_two_by_two_hand_computed() -> None:
    # zones 0,1 treated; zones 2,3 control; 2 weeks (week 1 = post, starting 2025-01-05)
    #            pre   post
    y = np.array([1.0, 2.0,   # z0
                  3.0, 5.0,   # z1
                  2.0, 2.5,   # z2
                  4.0, 4.5])  # z3  # fmt: skip
    s = make_sample(y, 4, 2, [0, 1])
    r = did.did(s, date(2025, 1, 5))
    # treated change: mean(2-1, 5-3) = 1.5 ; control change: mean(0.5, 0.5) = 0.5 -> beta = 1.0
    assert r.beta == pytest.approx(1.0, abs=1e-12)
    assert (r.n_treated, r.n_control, r.n_weeks, r.n_obs) == (2, 2, 2, 8)
    assert r.effect_pct == pytest.approx(100 * (np.exp(1.0) - 1))


def test_noise_free_planted_effect_is_recovered_exactly() -> None:
    rng = np.random.default_rng(1)
    nz, nw = 12, 30
    a = rng.normal(size=nz)[:, None]
    g = rng.normal(size=nw)[None, :]
    post = (np.arange(nw) >= nw // 2)[None, :]
    tz = [0, 1, 2, 3]
    y = a + g + 0.123 * (np.isin(np.arange(nz), tz)[:, None] & post)
    s = make_sample(y.ravel(), nz, nw, tz)
    for ref in (True, False):
        r = did.did(s, date(2025, 1, 5), ref=ref)
        assert r.beta == pytest.approx(0.123, abs=1e-10)


@pytest.mark.parametrize("unbalanced", [False, True])
def test_statsmodels_and_demeaned_agree(unbalanced: bool) -> None:
    rng = np.random.default_rng(7)
    nz, nw = 25, 40
    y = rng.normal(size=nz * nw) + np.repeat(rng.normal(size=nz), nw) * 2
    keep = None
    if unbalanced:
        keep = rng.random(nz * nw) > 0.1
    s = make_sample(y, nz, nw, list(range(8)), keep)
    a = did.did(s, date(2025, 1, 5), ref=True)
    b = did.did(s, date(2025, 1, 5), ref=False)
    assert b.beta == pytest.approx(a.beta, rel=1e-8)
    assert b.se == pytest.approx(a.se, rel=1e-8)


def test_build_sample_balances_and_lists_dropped_zones() -> None:
    weeks = pd.date_range("2025-01-05", periods=4, freq="7D")
    rows = []
    for z, trips in {1: [5, 5, 5, 5], 2: [3, 0, 3, 3], 3: [7, 7, 7, 7], 4: [2, 2, 2, 2]}.items():
        for w, t in zip(weeks, trips, strict=True):
            rows.append(("all", "dropoffs", z, w, t))
    panel = pd.DataFrame(rows, columns=["trip_type", "outcome", "zone", "week_start", "trips"])
    s = did.build_sample(panel, "all", "dropoffs", {1, 2}, {3, 4}, exclude={4})
    assert s.dropped == [2]  # zone 2 has a zero week
    assert list(s.zone_ids) == [1, 3]
    assert len(s.y) == 8 and s.zone_treated.tolist() == [True, False]
    assert np.allclose(s.y[:4], np.log(5))
