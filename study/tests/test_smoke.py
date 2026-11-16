"""The smoke-test logic against a mock transport (the real one needs the deployed stack)."""

import httpx

from congestion import smoke


def test_smoke_collects_latency_and_status_codes() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/graphql" and request.method == "POST"
        return httpx.Response(
            200, json={"data": {"estimate": {"effectPct": -1.0, "cached": False, "computeMs": 3}}}
        )

    client = httpx.Client(transport=httpx.MockTransport(handler))
    out = smoke.run("https://example.test", client)
    assert out["n"] == 20 and out["all_ok"] is True and out["status_codes"] == [200] * 20
    assert {"first_request_ms", "p50_ms", "p95_ms", "commit", "generated_at_utc"} <= set(out)


def test_inputs_are_20_distinct_combinations() -> None:
    xs = smoke.inputs()
    assert len(xs) == 20 and len({str(x) for x in xs}) == 20


def test_percentile() -> None:
    assert smoke.percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95) == 10
    assert smoke.percentile([5.0], 95) == 5.0
