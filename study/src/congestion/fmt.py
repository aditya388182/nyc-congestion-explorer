"""Number formatting shared by the memo, README, bullets and DONE.md (all values come from results)."""

MINUS = "−"


def pct(v: float, d: int = 2) -> str:
    return f"{v:.{d}f}%".replace("-", MINUS)


def num(v: float, d: int = 2) -> str:
    return f"{v:.{d}f}".replace("-", MINUS)


def count(v: float) -> str:
    return f"{int(v):,}"


def pval(p: float) -> str:
    if p == 0:
        return "< 1e-300"
    return f"{p:.1e}" if p < 0.001 else f"{p:.3f}"


def sci(v: float, d: int = 2) -> str:
    return f"{v:.{d}e}"
