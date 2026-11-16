"""Zone classification from intra-zone fee shares, groups, spillover ring, GeoJSON, figures.

Treated zones come from the data (SPEC 6.1): the share of intra-zone 2025 trips that paid
`cbd_congestion_fee > 0`. Nothing here looks at an outcome estimate.
"""

import json
from pathlib import Path
from typing import Any

import duckdb
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
from matplotlib.collections import PatchCollection
from matplotlib.patches import Polygon as MplPolygon

from . import sqlfiles
from .paths import AGG, DATA, REPO, RESULTS
from .results import stamp

TREATED_MIN = 0.95  # pre-registered thresholds (SPEC 6.1); never changed after seeing estimates
OUTSIDE_MAX = 0.05
MIN_TRIPS = 200
CLASSIFY_FROM = "2025-02-01"
AIRPORTS = (1, 132, 138)
N_CONTROL_B = 60
SHAPEFILE = f"/vsizip/{DATA / 'zones' / 'taxi_zones.zip'}/taxi_zones/taxi_zones.shp"
FIG = REPO / "reports" / "figures"


def classify(intra: pd.DataFrame, lookup: pd.DataFrame) -> pd.DataFrame:
    """One row per zone with the 2025 intra-zone fee share and class."""
    # Feb-Dec 2025: January 2025 includes 4 pre-toll days (1-4 Jan) and the intra-zone aggregate is
    # monthly, so January would bias every share down (DECISIONS.md D9).
    y = intra[(intra["month"] >= CLASSIFY_FROM) & (intra["month"] < "2026-01-01")]
    s = y.groupby("zone")[["trips", "trips_with_fee"]].sum().rename(
        columns={"trips": "intra_trips", "trips_with_fee": "intra_fee"}
    )  # fmt: skip
    z = lookup.rename(columns={"LocationID": "id", "Borough": "borough", "Zone": "name"})
    z = z.merge(s, how="left", left_on="id", right_index=True)
    z[["intra_trips", "intra_fee"]] = z[["intra_trips", "intra_fee"]].fillna(0)
    z["intra_trips"] = z["intra_trips"].astype(int)
    z["intra_fee"] = z["intra_fee"].astype(int)
    z["share"] = z["intra_fee"] / z["intra_trips"].where(z["intra_trips"] > 0)

    def cls(r: pd.Series) -> str:
        if r["intra_trips"] < MIN_TRIPS:
            return "too_few"
        if r["share"] >= TREATED_MIN:
            return "treated"
        if r["share"] <= OUTSIDE_MAX:
            return "outside"
        return "boundary"

    z["cls"] = z.apply(cls, axis=1)
    return z


def control_b(daily: pd.DataFrame, z: pd.DataFrame) -> list[int]:
    """The 60 busiest non-Manhattan zones by 2024 dropoffs (all types), no airports.

    Only zones classified `outside` qualify: boundary and too-few zones are left out of every group.
    """
    d = daily[(daily["direction"] == "dropoff")]
    d = d[(d["date"] >= "2024-01-01") & (d["date"] < "2025-01-01")]
    tot = d.groupby("zone")["trips"].sum()
    ok = z[(z["borough"] != "Manhattan") & (z["cls"] == "outside") & ~z["id"].isin(AIRPORTS)]
    ranked = tot.reindex(ok["id"]).dropna().sort_values(ascending=False, kind="stable")
    return [int(i) for i in ranked.index[:N_CONTROL_B]]


def assign_groups(z: pd.DataFrame, b_ids: list[int], ring: set[int]) -> pd.DataFrame:
    def grp(r: pd.Series) -> str:
        if r["cls"] == "treated":
            return "TREATED"
        if r["cls"] == "boundary":
            return "BOUNDARY"
        if r["cls"] == "too_few":
            return "UNCLASSIFIED"
        if r["borough"] == "Manhattan":
            return "CONTROL_A"
        return "CONTROL_B" if r["id"] in b_ids else "OTHER"

    z = z.copy()
    z["group"] = z.apply(grp, axis=1)
    z["ring"] = z["id"].isin(ring) & (z["group"] != "TREATED")
    return z


def spatial(treated: set[int]) -> dict[str, Any]:
    """CRS check, ring from shared borders, GeoJSON features (needs a `zone_attrs` table later)."""
    con = duckdb.connect()
    con.execute("INSTALL spatial; LOAD spatial;")
    q = sqlfiles.load("zones.sql")
    con.execute(q["load_shapes"], [SHAPEFILE])
    crs = con.execute(q["crs_check"]).fetchone()
    touches = {tuple(r) for r in con.execute(q["touches"]).fetchall()}
    near = {tuple(r) for r in con.execute(q["near"]).fetchall()}

    def ring_of(pairs: set[tuple[int, int]]) -> set[int]:
        out: set[int] = set()
        for a, b in pairs:
            if a in treated and b not in treated:
                out.add(b)
            if b in treated and a not in treated:
                out.add(a)
        return out

    return {
        "con": con,
        "touch_pairs": sorted(touches),
        "crs_check": {"id": crs[0], "name": crs[1], "lon": crs[2], "lat": crs[3]},
        "ring_touches": sorted(ring_of(touches)),
        "ring_near_1ft": sorted(ring_of(near)),
        "n_touch_pairs": len(touches),
        "n_near_pairs": len(near),
    }


def _round(coords: Any, nd: int = 5) -> Any:
    if isinstance(coords, float):
        return round(coords, nd)
    return [_round(c, nd) for c in coords]


def geojson(con: duckdb.DuckDBPyConnection, z: pd.DataFrame) -> dict[str, Any]:
    attrs = z[["id", "group", "share", "ring"]].rename(columns={"group": "grp"})
    con.register("zone_attrs", attrs)
    rows = con.execute(sqlfiles.load("zones.sql")["geojson"]).fetchall()
    feats = []
    for zid, name, borough, grp, share, ring, geom in rows:
        feats.append(
            {
                "type": "Feature",
                "id": zid,
                "properties": {
                    "id": zid,
                    "name": name,
                    "borough": borough,
                    "group": grp,
                    "share": None if share is None or pd.isna(share) else round(float(share), 4),
                    "ring": bool(ring),
                },
                "geometry": {**(g := json.loads(geom)), "coordinates": _round(g["coordinates"])},
            }
        )
    return {"type": "FeatureCollection", "features": feats}


def fee_jump(daily: pd.DataFrame, treated: set[int]) -> dict[str, Any]:
    """Share of dropoffs with a fee > 0 by day, 15 Dec 2024 to 20 Jan 2025; save the plot."""
    d = daily[(daily["direction"] == "dropoff")].copy()
    d["date"] = pd.to_datetime(d["date"])
    d = d[(d["date"] >= "2024-12-15") & (d["date"] <= "2025-01-20")]
    allz = d.groupby("date")[["trips", "trips_with_fee"]].sum()
    tz = d[d["zone"].isin(treated)].groupby("date")[["trips", "trips_with_fee"]].sum()
    share_all = (allz["trips_with_fee"] / allz["trips"]).rename("all_zones")
    share_t = (tz["trips_with_fee"] / tz["trips"]).rename("treated_zones")
    s = pd.concat([share_all, share_t], axis=1)
    FIG.mkdir(parents=True, exist_ok=True)
    fig, ax = plt.subplots(figsize=(8, 4))
    ax.plot(s.index, s["all_zones"], marker="o", ms=3, label="all dropoff zones")
    ax.plot(s.index, s["treated_zones"], marker="o", ms=3, label="treated zones only")
    ax.axvline(pd.Timestamp("2025-01-05"), color="k", ls="--", lw=1)
    ax.text(pd.Timestamp("2025-01-05"), 0.02, " 5 Jan 2025", va="bottom")
    ax.set_ylabel("share of dropoffs with cbd_congestion_fee > 0")
    ax.set_title("Fee share by day (yellow + green + fhvhv)")
    ax.legend()
    fig.autofmt_xdate()
    fig.tight_layout()
    fig.savefig(FIG / "fee_jump.png", dpi=130)
    plt.close(fig)
    first_day = s.index[(s["treated_zones"] > 0.2)].min()
    return {
        "first_day_treated_share_over_20pct": str(first_day.date()),
        "share_treated_2025_01_04": float(s.loc["2025-01-04", "treated_zones"]),
        "share_treated_2025_01_05": float(s.loc["2025-01-05", "treated_zones"]),
        "max_share_treated_before_toll": float(s.loc[:"2025-01-04", "treated_zones"].max()),
        "series": {str(k.date()): [float(v["all_zones"]), float(v["treated_zones"])]
                   for k, v in s.iterrows()},
    }  # fmt: skip


COLORS = {
    "TREATED": "#d95f02", "BOUNDARY": "#e6ab02", "CONTROL_A": "#1b9e77",
    "CONTROL_B": "#7570b3", "OTHER": "#e0e0e0", "UNCLASSIFIED": "#9e9e9e",
}  # fmt: skip


def plot_groups(gj: dict[str, Any], path: Path) -> None:
    fig, ax = plt.subplots(figsize=(9, 9))
    by_group: dict[str, list[MplPolygon]] = {}
    ring_patches: list[MplPolygon] = []
    for f in gj["features"]:
        g = f["geometry"]
        polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        for poly in polys:
            patch = MplPolygon(poly[0], closed=True)
            by_group.setdefault(f["properties"]["group"], []).append(patch)
            if f["properties"]["ring"]:
                ring_patches.append(MplPolygon(poly[0], closed=True))
    for grp, patches in by_group.items():
        ax.add_collection(PatchCollection(patches, facecolor=COLORS[grp], edgecolor="white",
                                          linewidth=0.3, label=grp))  # fmt: skip
    ax.add_collection(PatchCollection(ring_patches, facecolor="none", edgecolor="black",
                                      linewidth=1.2, hatch="///", label="RING (spillover)"))  # fmt: skip
    ax.set_xlim(-74.27, -73.68)
    ax.set_ylim(40.48, 40.93)
    ax.set_aspect(1 / 0.76)
    ax.legend(loc="lower right")
    ax.set_title("Zone groups (treated zones from intra-zone fee share)")
    ax.set_xlabel("longitude")
    ax.set_ylabel("latitude")
    fig.tight_layout()
    fig.savefig(path, dpi=130)
    plt.close(fig)


def table_md(z: pd.DataFrame) -> str:
    lines = ["# Zone table (generated by congestion.zones; do not edit)", ""]
    cols = ["id", "name", "borough", "intra_trips", "share"]

    def block(title: str, df: pd.DataFrame) -> None:
        lines.append(f"## {title} ({len(df)})\n")
        lines.append("| " + " | ".join(cols) + " |")
        lines.append("|" + "---|" * len(cols))
        for _, r in df.sort_values("id").iterrows():
            share = "" if pd.isna(r["share"]) else f"{r['share']:.4f}"
            lines.append(
                f"| {r['id']} | {r['name']} | {r['borough']} | {r['intra_trips']} | {share} |"
            )
        lines.append("")

    block("Treated (share >= 0.95)", z[z["group"] == "TREATED"])
    block("Boundary (0.05 < share < 0.95)", z[z["group"] == "BOUNDARY"])
    block("Too few intra-zone 2025 trips to classify (< 200)", z[z["group"] == "UNCLASSIFIED"])
    block("Control A (Manhattan, outside)", z[z["group"] == "CONTROL_A"])
    block("Control B (60 busiest non-Manhattan, no airports)", z[z["group"] == "CONTROL_B"])
    block("Spillover ring (touch a treated zone, not treated)", z[z["ring"]])
    return "\n".join(lines)


def run() -> pd.DataFrame:
    intra = pd.read_parquet(AGG / "intra_zone.parquet")
    intra["month"] = pd.to_datetime(intra["month"])
    daily = pd.read_parquet(AGG / "daily_counts.parquet")
    daily["date"] = pd.to_datetime(daily["date"])
    lookup = pd.read_csv(DATA / "zones" / "taxi_zone_lookup.csv", keep_default_na=False)
    z = classify(intra, lookup)
    treated = set(z.loc[z["cls"] == "treated", "id"])
    bad = z[(z["cls"] == "treated") & (z["borough"] != "Manhattan")]
    if len(bad):
        raise RuntimeError(f"treated zone(s) outside Manhattan: {bad[['id', 'name']].values}")
    sp = spatial(treated)
    # Which adjacency definition? ST_Touches is the definition in the spec; the 1-ft tolerance
    # version is computed too and any difference is recorded (DECISIONS.md D9).
    ring = set(sp["ring_touches"])
    b_ids = control_b(daily, z)
    z = assign_groups(z, b_ids, ring)
    # Outer ring (DECISIONS.md D10): control-A zones that touch a ring zone.
    ring2: set[int] = set()
    ctrl_a = set(z.loc[z["group"] == "CONTROL_A", "id"])
    for a, b in sp["touch_pairs"]:
        if a in ring and b in ctrl_a:
            ring2.add(b)
        if b in ring and a in ctrl_a:
            ring2.add(a)
    z["ring2"] = z["id"].isin(ring2)
    gj = geojson(sp["con"], z)
    AGG.mkdir(exist_ok=True)
    (AGG / "zones.geojson").write_text(json.dumps(gj, separators=(",", ":")))
    plot_groups(gj, FIG / "zone_groups.png")
    jump = fee_jump(daily, treated)
    RESULTS.mkdir(exist_ok=True)
    counts = z["group"].value_counts().to_dict()
    out = {
        "thresholds": {"treated_min": TREATED_MIN, "outside_max": OUTSIDE_MAX, "min_trips": MIN_TRIPS,
                       "classify_months": "2025-02 to 2025-12"},
        "counts": counts,
        "n_ring": int(z["ring"].sum()),
        "ring_touches": sp["ring_touches"],
        "ring_near_1ft": sp["ring_near_1ft"],
        "ring_definition": "ST_Touches",
        "ring_touches_equals_near_1ft": sp["ring_touches"] == sp["ring_near_1ft"],
        "n_ring2": int(z["ring2"].sum()),
        "crs_check": sp["crs_check"],
        "fee_jump": jump,
        "control_b_ids": b_ids,
        "zones": [
            {
                "id": int(r["id"]), "name": r["name"], "borough": r["borough"],
                "group": r["group"], "ring": bool(r["ring"]), "ring2": bool(r["ring2"]),
                "share": None if pd.isna(r["share"]) else float(r["share"]),
                "intra_trips": int(r["intra_trips"]),
                "intra_fee": int(r["intra_fee"]),
            }
            for _, r in z.sort_values("id").iterrows()
        ],
        **stamp("python -m congestion.zones"),
    }  # fmt: skip
    (RESULTS / "zones.json").write_text(json.dumps(out, indent=1, allow_nan=False))
    (REPO / "reports" / "zone_table.md").write_text(table_md(z))
    return z


if __name__ == "__main__":
    zz = run()
    print(zz["group"].value_counts())
