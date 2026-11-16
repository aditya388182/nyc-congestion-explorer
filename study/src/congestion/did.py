"""Two-way fixed-effects difference-in-differences with zone-clustered standard errors.

`twfe_statsmodels` is the REFERENCE implementation (SPEC 7.1): OLS with explicit zone and week
dummies, `cov_type="cluster"` with statsmodels' default small-sample correction.
`twfe_demeaned` is the algorithm the TypeScript port uses (alternating projections); tests check
that both agree to numerical precision.
"""

from dataclasses import dataclass, field
from datetime import date

import numpy as np
import pandas as pd
import statsmodels.api as sm
from scipy import stats

Z975 = float(stats.norm.ppf(0.975))  # 1.959963984540054: statsmodels uses normal CIs (use_t False)


@dataclass
class Sample:
    """Long-format panel. `zone` and `week` are integer codes; `zone_ids` / `weeks` decode them."""

    zone: np.ndarray  # int codes 0..Z-1
    week: np.ndarray  # int codes 0..W-1
    y: np.ndarray  # log(trips)
    treated: np.ndarray  # 1.0 for treated zones, else 0.0 (per observation)
    zone_ids: np.ndarray  # original zone ids, by code
    weeks: np.ndarray  # datetime64[D], by code
    zone_treated: np.ndarray  # bool per zone code
    dropped: list[int] = field(default_factory=list)  # zones removed by balancing
    weight: np.ndarray | None = None  # per observation (WLS), else None

    @property
    def n_zones(self) -> int:
        return len(self.zone_ids)

    @property
    def n_weeks(self) -> int:
        return len(self.weeks)


@dataclass
class Fit:
    names: list[str]
    beta: np.ndarray
    cov: np.ndarray
    n_obs: int
    n_clusters: int
    n_params: int  # K in the small-sample correction

    def se(self, name: str) -> float:
        i = self.names.index(name)
        return float(np.sqrt(self.cov[i, i]))

    def b(self, name: str) -> float:
        return float(self.beta[self.names.index(name)])


@dataclass
class DidResult:
    beta: float
    se: float
    effect_pct: float
    ci_low_pct: float
    ci_high_pct: float
    n_treated: int
    n_control: int
    n_weeks: int
    n_obs: int
    dropped_zones: list[int]


def restrict_weeks(s: Sample, keep_week: np.ndarray) -> Sample:
    """Sub-sample to the week codes where `keep_week` (bool per week code) is True; recode weeks."""
    new_code = np.cumsum(keep_week) - 1
    m = keep_week[s.week]
    return Sample(
        zone=s.zone[m], week=new_code[s.week[m]], y=s.y[m], treated=s.treated[m],
        zone_ids=s.zone_ids, weeks=s.weeks[keep_week], zone_treated=s.zone_treated,
        dropped=s.dropped, weight=None if s.weight is None else s.weight[m],
    )  # fmt: skip


def pct(beta: float) -> float:
    return 100.0 * (float(np.exp(beta)) - 1.0)


def build_sample(
    panel: pd.DataFrame,
    trip_type: str,
    outcome: str,
    treated_ids: set[int] | list[int],
    control_ids: set[int] | list[int],
    start: date | None = None,
    end: date | None = None,
    exclude: set[int] | list[int] = (),  # type: ignore[assignment]
) -> Sample:
    """Balanced panel of log(trips) for the given zone sets and week window.

    A zone is kept only if it has trips > 0 in EVERY week of the window (SPEC 6.3); the others
    are listed in `dropped`. Excluded zones are removed before balancing.
    """
    p = panel[(panel["trip_type"] == trip_type) & (panel["outcome"] == outcome)]
    if start is not None:
        p = p[p["week_start"] >= pd.Timestamp(start)]
    if end is not None:
        p = p[p["week_start"] <= pd.Timestamp(end)]
    wanted = (set(treated_ids) | set(control_ids)) - set(exclude)
    p = p[p["zone"].isin(wanted)]
    weeks = np.sort(p["week_start"].unique())
    pos = p[p["trips"] > 0].groupby("zone").size()
    good = set(pos[pos == len(weeks)].index)
    dropped = sorted(int(z) for z in wanted if z not in good)
    p = p[p["zone"].isin(good)].sort_values(["zone", "week_start"])
    zone_ids = np.array(sorted(good), dtype=np.int64)
    zcode = np.searchsorted(zone_ids, p["zone"].to_numpy())
    wcode = np.searchsorted(weeks, p["week_start"].to_numpy())
    zt = np.isin(zone_ids, list(set(treated_ids)))
    return Sample(
        zone=zcode.astype(np.int64),
        week=wcode.astype(np.int64),
        y=np.log(p["trips"].to_numpy(dtype=np.float64)),
        treated=zt[zcode].astype(np.float64),
        zone_ids=zone_ids,
        weeks=weeks.astype("datetime64[D]"),
        zone_treated=zt,
        dropped=dropped,
    )


def _dummies(codes: np.ndarray, n: int) -> np.ndarray:
    d = np.zeros((len(codes), n - 1))
    m = codes > 0
    d[np.nonzero(m)[0], codes[m] - 1] = 1.0  # first level omitted
    return d


def twfe_statsmodels(s: Sample, X: np.ndarray, names: list[str]) -> Fit:
    """Reference: y ~ X + const + zone dummies + week dummies, clustered by zone."""
    design = np.column_stack(
        [X, np.ones(len(s.y)), _dummies(s.zone, s.n_zones), _dummies(s.week, s.n_weeks)]
    )
    if s.weight is None:
        res = sm.OLS(s.y, design).fit(cov_type="cluster", cov_kwds={"groups": s.zone})
    else:
        res = sm.WLS(s.y, design, weights=s.weight).fit(
            cov_type="cluster", cov_kwds={"groups": s.zone}
        )
    k = X.shape[1]
    return Fit(names, np.asarray(res.params)[:k], np.asarray(res.cov_params())[:k, :k],
               len(s.y), s.n_zones, design.shape[1])  # fmt: skip


def demean(a: np.ndarray, zone: np.ndarray, week: np.ndarray, nz: int, nw: int,
           tol: float = 1e-12, max_iter: int = 100000) -> np.ndarray:  # fmt: skip
    """Alternating-projection removal of zone and week means (exact for unbalanced panels)."""
    out = a.astype(np.float64).copy()
    if out.ndim == 1:
        out = out[:, None]
    zc = np.bincount(zone, minlength=nz).astype(np.float64)
    wc = np.bincount(week, minlength=nw).astype(np.float64)
    for _ in range(max_iter):
        delta = 0.0
        for k in range(out.shape[1]):
            col = out[:, k]
            zm = np.bincount(zone, weights=col, minlength=nz) / zc
            col -= zm[zone]
            wm = np.bincount(week, weights=col, minlength=nw) / wc
            col -= wm[week]
            delta = max(delta, float(np.max(np.abs(wm))), float(np.max(np.abs(zm))))
        if delta < tol:
            break
    return out


def twfe_demeaned(s: Sample, X: np.ndarray, names: list[str]) -> Fit:
    """Demean y and X by zone and week, OLS, cluster-robust variance with the statsmodels factor."""
    nz, nw = s.n_zones, s.n_weeks
    yd = demean(s.y, s.zone, s.week, nz, nw)[:, 0]
    xd = demean(X, s.zone, s.week, nz, nw)
    xtx = xd.T @ xd
    beta = np.linalg.solve(xtx, xd.T @ yd)
    u = yd - xd @ beta
    scores = np.zeros((nz, X.shape[1]))
    np.add.at(scores, s.zone, xd * u[:, None])
    meat = scores.T @ scores
    n = len(s.y)
    # K counts the intercept, every zone and week dummy (first level omitted) and the regressors,
    # exactly as the explicit-dummy reference does.
    k = X.shape[1] + 1 + (nz - 1) + (nw - 1)
    c = nz / (nz - 1.0) * (n - 1.0) / (n - k)
    inv = np.linalg.inv(xtx)
    return Fit(names, beta, c * inv @ meat @ inv, n, nz, k)


def did(s: Sample, post_start: date, ref: bool = True) -> DidResult:
    """Treated x post effect. `post` = weeks starting on or after `post_start`."""
    post = (s.weeks[s.week] >= np.datetime64(post_start)).astype(np.float64)
    X = (s.treated * post)[:, None]
    fit = (twfe_statsmodels if ref else twfe_demeaned)(s, X, ["treated_post"])
    b, se = fit.b("treated_post"), fit.se("treated_post")
    return DidResult(
        beta=b, se=se, effect_pct=pct(b), ci_low_pct=pct(b - Z975 * se), ci_high_pct=pct(b + Z975 * se),
        n_treated=int(s.zone_treated.sum()), n_control=int((~s.zone_treated).sum()),
        n_weeks=s.n_weeks, n_obs=len(s.y), dropped_zones=list(s.dropped),
    )  # fmt: skip
