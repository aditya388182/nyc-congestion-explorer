"""`make study`: zones -> panel -> planted-effect simulation -> real estimates -> exploratory."""

import json

from . import estimates, exploratory, groups, panel, planted, zones
from .paths import RESULTS


def main() -> None:
    zones.run()
    panel.main()
    res = planted.run()  # Phase 3 gate: runs (and is saved) before any real estimate
    (RESULTS / "planted.json").write_text(json.dumps(res, indent=1, default=float))
    if not (res["pass_bias"] and res["pass_coverage"] and res["pass_trend_power"]):
        print("WARNING: planted-effect criteria not met; see results/planted.json")
    g, p = groups.load(), groups.load_panel()
    out = estimates.run(p, g)
    exploratory.run(p, g)
    print(
        json.dumps(
            {k: out[k] for k in ("main_estimate_pct", "ci_low_pct", "ci_high_pct", "pretrend_p")}
        )
    )


if __name__ == "__main__":
    main()
