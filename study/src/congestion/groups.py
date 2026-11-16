"""Load zone groups from results/zones.json."""

import json
from dataclasses import dataclass

import pandas as pd

from .paths import AGG, RESULTS


@dataclass
class Groups:
    treated: set[int]
    boundary: set[int]
    control_a: set[int]
    control_b: set[int]
    ring: set[int]
    ring2: set[int]
    unclassified: set[int]
    names: dict[int, str]

    def control(self, which: str) -> set[int]:
        return {"A": self.control_a, "B": self.control_b, "AB": self.control_a | self.control_b}[
            which
        ]


def load() -> Groups:
    z = json.loads((RESULTS / "zones.json").read_text())["zones"]

    def ids(g: str) -> set[int]:
        return {r["id"] for r in z if r["group"] == g}

    return Groups(
        treated=ids("TREATED"), boundary=ids("BOUNDARY"), control_a=ids("CONTROL_A"),
        control_b=ids("CONTROL_B"), ring={r["id"] for r in z if r["ring"]},
        ring2={r["id"] for r in z if r.get("ring2")}, unclassified=ids("UNCLASSIFIED"),
        names={r["id"]: r["name"] for r in z},
    )  # fmt: skip


def load_panel() -> pd.DataFrame:
    return pd.read_parquet(AGG / "panel.parquet")
