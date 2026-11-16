"""Write data/SOURCE.md from the manifest and the zone files (never typed by hand)."""

import hashlib
from datetime import UTC, datetime

from . import manifest
from .paths import DATA, TLC_PAGE

HEADER = f"""# data/SOURCE.md

All data comes from the official NYC TLC trip record page ({TLC_PAGE}); files are served from
`https://d37ci6vzurychx.cloudfront.net/`. No third-party mirror is used.

**Terms note (from the TLC page):** "Trip data is published monthly on this website, typically
with a two-month delay to allow time for full vendor submissions." The data is public, needs no
account, and is released by the TLC; see the nyc.gov "Terms of use" linked on the page. Trip files
are aggregated and then deleted from this repo's working tree; only daily counts are committed.
Please be advised (TLC): "there may be minor changes in the near future to standardize the
parquet schema across all years and datasets", so a re-download may differ from what is recorded
here: the sha256 column identifies the exact bytes used.
"""


def main() -> None:
    rows = manifest.read()
    lines = [HEADER, "## Zone files\n", "| file | bytes | sha256 |", "|---|---|---|"]
    for name in ("taxi_zones.zip", "taxi_zone_lookup.csv"):
        p = DATA / "zones" / name
        if p.exists():
            lines.append(
                f"| https://d37ci6vzurychx.cloudfront.net/misc/{name} | {p.stat().st_size} | "
                f"{hashlib.sha256(p.read_bytes()).hexdigest()} |"
            )
    lines += [
        "",
        f"## Trip files ({len(rows)}; table generated {datetime.now(UTC).date()})\n",
        "| URL | aggregated (UTC) | bytes | sha256 | rows |",
        "|---|---|---|---|---|",
    ]
    for key in sorted(rows):
        r = rows[key]
        lines.append(
            f"| {r['url']} | {r['aggregated_at'][:10]} | {r['bytes']} | {r['sha256']} | "
            f"{r['parquet_rows']} |"
        )
    (DATA / "SOURCE.md").write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
