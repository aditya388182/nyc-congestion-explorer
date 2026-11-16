"""Event study: treated x relative-month dummies (month -1 omitted), joint Wald test of the leads."""

from dataclasses import dataclass

import numpy as np
from scipy import stats

from . import did

TREAT_MONTH = (2025, 1)  # relative month 0 = January 2025 (week starts on or after 5 Jan 2025)
FIRST_LEAD = -24
REF_MONTH = -1


def rel_months(weeks: np.ndarray) -> np.ndarray:
    """Relative month of each week by the month its Sunday falls in (Jan 2025 = 0)."""
    d = weeks.astype("datetime64[M]")
    return (
        d.astype(int) - np.datetime64(f"{TREAT_MONTH[0]}-{TREAT_MONTH[1]:02d}", "M").astype(int)
    ).astype(int)


@dataclass
class EventStudy:
    months: list[int]
    coef: list[float]
    se: list[float]
    ci_low_pct: list[float]
    ci_high_pct: list[float]
    lead_chi2: float
    lead_df: int
    lead_p_chi2: float
    lead_F: float
    lead_p_F: float
    n_clusters: int
    n_obs: int


def joint_wald(
    beta: np.ndarray, cov: np.ndarray, n_clusters: int
) -> tuple[float, int, float, float, float]:
    """chi2 = b' V^-1 b ; F = chi2 / q with F(q, G-1) reference (cluster-robust inference)."""
    q = len(beta)
    chi2 = float(beta @ np.linalg.solve(cov, beta))
    f = chi2 / q
    return chi2, q, float(stats.chi2.sf(chi2, q)), f, float(stats.f.sf(f, q, n_clusters - 1))


def event_study(s: did.Sample, ref: bool = True) -> EventStudy:
    rm = rel_months(s.weeks)[s.week]
    months = [m for m in range(FIRST_LEAD, int(rm.max()) + 1) if m != REF_MONTH]
    X = np.column_stack([s.treated * (rm == m) for m in months]).astype(np.float64)
    names = [f"m{m}" for m in months]
    fit = (did.twfe_statsmodels if ref else did.twfe_demeaned)(s, X, names)
    se = np.sqrt(np.diag(fit.cov))
    lead_idx = [i for i, m in enumerate(months) if m <= -2]
    chi2, q, p_chi2, f, p_f = joint_wald(
        fit.beta[lead_idx], fit.cov[np.ix_(lead_idx, lead_idx)], fit.n_clusters
    )
    return EventStudy(
        months=months,
        coef=[float(b) for b in fit.beta],
        se=[float(x) for x in se],
        ci_low_pct=[did.pct(b - did.Z975 * x) for b, x in zip(fit.beta, se, strict=True)],
        ci_high_pct=[did.pct(b + did.Z975 * x) for b, x in zip(fit.beta, se, strict=True)],
        lead_chi2=chi2, lead_df=q, lead_p_chi2=p_chi2, lead_F=f, lead_p_F=p_f,
        n_clusters=fit.n_clusters, n_obs=fit.n_obs,
    )  # fmt: skip


@dataclass
class Slope:
    slope_per_month: float  # log points per month, treated relative to control
    se: float
    p: float
    n_obs: int


def pretrend_slope(s: did.Sample, start: np.datetime64, ref: bool = True) -> Slope:
    """Supplementary 1-df test (DECISIONS.md D13): treated x continuous month over pre weeks."""
    pre = did.restrict_weeks(s, s.weeks < start)
    months = (pre.weeks[pre.week] - start).astype("timedelta64[D]").astype(float) / 30.4375
    X = (pre.treated * months)[:, None]
    fit = (did.twfe_statsmodels if ref else did.twfe_demeaned)(pre, X, ["trend"])
    b, se = fit.b("trend"), fit.se("trend")
    return Slope(b, se, float(2 * stats.norm.sf(abs(b / se))), len(pre.y))
