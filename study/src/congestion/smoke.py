"""Live smoke test (Phase 9, for the repository owner only): `make smoke URL=https://<id>.cloudfront.net`.

Sends 20 `estimate` requests through the CloudFront URL and writes results/deploy_smoke.json.
Never run by the autopilot build: it needs the deployed stack.
"""

import itertools
import json
import statistics
import sys
import time

import httpx

from .paths import RESULTS
from .results import stamp

QUERY = "query($i: EstimateInput!){ estimate(input:$i){ effectPct cached computeMs } }"
N_REQUESTS = 20


def inputs() -> list[dict[str, object]]:
    """20 distinct standard combinations, so most requests miss the Lambda's cache."""
    combos = itertools.product(
        ["YELLOW", "FHVHV", "ALL"], ["A", "B", "AB"], [True, False], ["DROPOFFS", "PICKUPS"]
    )
    return [
        {"tripType": t, "control": c, "dropBoundary": d, "outcome": o}
        for t, c, d, o in itertools.islice(combos, N_REQUESTS)
    ]


def percentile(xs: list[float], p: float) -> float:
    s = sorted(xs)
    return s[min(len(s) - 1, max(0, -(-int(p * len(s)) // 100) - 1))]


def run(base_url: str, client: httpx.Client | None = None) -> dict[str, object]:
    url = base_url.rstrip("/") + "/graphql"
    own = client is None
    client = client or httpx.Client(timeout=30)
    latencies: list[float] = []
    codes: list[int] = []
    cached: list[bool] = []
    try:
        for inp in inputs():
            t0 = time.perf_counter()
            r = client.post(url, json={"query": QUERY, "variables": {"i": inp}})
            latencies.append((time.perf_counter() - t0) * 1000)
            codes.append(r.status_code)
            body = r.json() if r.status_code == 200 else {}
            cached.append(bool(body.get("data", {}).get("estimate", {}).get("cached", False)))
    finally:
        if own:
            client.close()
    return {
        "url": base_url, "n": len(latencies), "status_codes": codes, "all_ok": all(c == 200 for c in codes),
        "first_request_ms": latencies[0], "p50_ms": statistics.median(latencies),
        "p95_ms": percentile(latencies, 95), "max_ms": max(latencies), "cached_responses": sum(cached),
        **stamp("make smoke URL=" + base_url),
    }  # fmt: skip


def main() -> None:
    if len(sys.argv) != 2 or not sys.argv[1].startswith("https://"):
        sys.exit("usage: python -m congestion.smoke https://<id>.cloudfront.net")
    out = run(sys.argv[1])
    RESULTS.mkdir(exist_ok=True)
    (RESULTS / "deploy_smoke.json").write_text(json.dumps(out, indent=1))
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
