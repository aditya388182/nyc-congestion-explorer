"""`python -m congestion.done`: build DONE.md from docs/DONE.template.md and results/*.json."""

import json
import re
from typing import Any

from . import fmt, memo
from .paths import REPO, RESULTS
from .results import STAMP_KEYS, collect

memo.FORMATTERS.setdefault("sci2", lambda v: fmt.sci(v, 2))
SKIP_FILES = {"estimator_reference", "reconciliation", "event_study", "summary", "zones"}


def flatten(prefix: str, v: Any, out: list[tuple[str, str]]) -> None:
    if isinstance(v, dict):
        for k, x in v.items():
            flatten(f"{prefix}.{k}" if prefix else str(k), x, out)
    elif isinstance(v, list):
        if len(v) <= 12 and all(not isinstance(x, (dict, list)) for x in v):
            out.append((prefix, json.dumps(v)))
        elif all(isinstance(x, dict) for x in v) and len(v) <= 12:
            for i, x in enumerate(v):
                flatten(f"{prefix}[{i}]", x, out)
        else:
            out.append((prefix, f"list of {len(v)} items"))
    else:
        out.append((prefix, json.dumps(v) if isinstance(v, float) else str(v)))


def results_dump() -> str:
    lines = [
        "Every scalar in `results/*.json` (flattened by code; the long per-case, per-file and per-zone tables stay in their own files):",
        "",
    ]
    for p in sorted(RESULTS.glob("*.json")):
        name = p.stem
        data = json.loads(p.read_text())
        if name in SKIP_FILES:
            if name == "reconciliation":
                data = {"totals": data["totals"], **{k: data[k] for k in STAMP_KEYS if k in data}}
            elif name == "zones":
                data = {
                    "counts": data["counts"],
                    "n_ring": data["n_ring"],
                    "n_ring2": data["n_ring2"],
                    "ring_touches_equals_near_1ft": data["ring_touches_equals_near_1ft"],
                    "fee_jump": {k: v for k, v in data["fee_jump"].items() if k != "series"},
                    **{k: data[k] for k in STAMP_KEYS},
                }
            elif name == "event_study":
                data = {
                    f"{e['tripType']}_{e['control']}": {
                        k: e[k]
                        for k in (
                            "nTreated",
                            "nControl",
                            "nObs",
                            "lead_chi2",
                            "lead_df",
                            "lead_p_chi2",
                            "lead_F",
                            "lead_p_F",
                        )
                    }
                    | {"slope": e["slope"]}
                    for e in data["event_studies"]
                }
            else:
                continue
        rows: list[tuple[str, str]] = []
        flatten("", data, rows)
        lines += [f"### results/{name}.json", "", "| key | value |", "|---|---|"]
        lines += [f"| `{k}` | {v} |" for k, v in rows]
        lines.append("")
    return "\n".join(lines)


def blockers_steps() -> str:
    text = (REPO / "BLOCKERS.md").read_text()
    return "\n".join(re.findall(r"^### \d+\. .*$", text, flags=re.MULTILINE))


def main() -> None:
    tpl = (REPO / "docs" / "DONE.template.md").read_text()
    tpl = tpl.replace("{{results_dump}}", results_dump()).replace(
        "{{blockers_steps}}", blockers_steps()
    )
    summary = collect()

    def sub(m: re.Match[str]) -> str:
        key, f = m.group(1), m.group(2) or "raw"
        if key not in summary:
            raise KeyError(f"DONE.md needs results key '{key}'")
        return memo.FORMATTERS[f](summary[key])  # type: ignore[arg-type]

    (REPO / "DONE.md").write_text(memo.TOKEN.sub(sub, tpl))
    print("DONE.md written")


if __name__ == "__main__":
    main()
