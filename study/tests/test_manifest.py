from pathlib import Path

from congestion import manifest


def test_manifest_roundtrip_and_upsert(tmp_path: Path) -> None:
    p = tmp_path / "m.csv"
    manifest.update({"trip_type": "yellow", "month": "2025-01", "status": "failed"}, p)
    manifest.update({"trip_type": "yellow", "month": "2025-01", "status": "done"}, p)
    manifest.update({"trip_type": "green", "month": "2025-01", "status": "done"}, p)
    rows = manifest.read(p)
    assert set(rows) == {("yellow", "2025-01"), ("green", "2025-01")}
    assert rows[("yellow", "2025-01")]["status"] == "done"
    assert p.read_text().splitlines()[0].startswith("url,trip_type,month")
