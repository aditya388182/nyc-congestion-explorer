"""Planted-effect simulation in fast mode (5 seeds; the full 20 seeds run in `make study`)."""

from congestion import planted


def test_planted_effect_fast_mode() -> None:
    res = planted.run(n_seeds=5)
    assert abs(res["bias_pp"]) < 1.0  # type: ignore[arg-type]
    assert res["coverage"] >= 4  # type: ignore[operator]
    assert res["trend_reject_F"] >= 4  # type: ignore[operator]
    ref = res["reference_check_seed0"]
    assert abs(ref["demeaned_beta"] - ref["statsmodels_beta"]) < 1e-9  # type: ignore[index]
