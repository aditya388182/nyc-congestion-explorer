"""`make test`: run every suite and write results/tests.json from the runners' own JSON output."""

import json
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

from .paths import REPO, RESULTS
from .results import stamp


def run(cmd: list[str], cwd: Path) -> int:
    print("$", " ".join(cmd), flush=True)
    return subprocess.run(cmd, cwd=cwd, check=False).returncode


def pytest_counts(tmp: Path) -> dict[str, int]:
    xml = tmp / "pytest.xml"
    code = run(["uv", "run", "pytest", "-q", f"--junitxml={xml}"], REPO / "study")
    root = ET.parse(xml).getroot()
    suite = root if root.tag == "testsuite" else root[0]
    total = int(suite.get("tests", 0))
    bad = int(suite.get("failures", 0)) + int(suite.get("errors", 0))
    return {
        "total": total,
        "passed": total - bad - int(suite.get("skipped", 0)),
        "failed": bad,
        "exit": code,
    }


def vitest_counts(workspace: str, tmp: Path) -> dict[str, int]:
    out = tmp / f"vitest-{workspace}.json"
    code = run(
        ["npx", "vitest", "run", "--root", workspace, "--reporter=json", f"--outputFile={out}"],
        REPO,
    )
    j = json.loads(out.read_text())
    return {
        "total": j["numTotalTests"],
        "passed": j["numPassedTests"],
        "failed": j["numFailedTests"],
        "exit": code,
    }


def playwright_counts() -> dict[str, int]:
    code = run(["npx", "playwright", "test", "-c", "web/playwright.config.ts"], REPO)
    j = json.loads((REPO / "web" / "test-results" / "e2e.json").read_text())
    s = j["stats"]
    return {"total": s["expected"] + s["unexpected"] + s["flaky"] + s["skipped"], "passed": s["expected"],
            "failed": s["unexpected"], "skipped": s["skipped"], "exit": code}  # fmt: skip


def main() -> None:
    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)
        out = {
            "pytest": pytest_counts(tmp),
            "vitest_api": vitest_counts("api", tmp),
            "vitest_web": vitest_counts("web", tmp),
            "vitest_infra": vitest_counts("infra", tmp),
            "playwright": playwright_counts(),
        }
    out["vitest_total"] = sum(out[k]["total"] for k in ("vitest_api", "vitest_web", "vitest_infra"))  # type: ignore[index]
    out["vitest_passed"] = sum(
        out[k]["passed"] for k in ("vitest_api", "vitest_web", "vitest_infra")
    )  # type: ignore[index]
    out.update(stamp("python -m congestion.test_report"))
    RESULTS.mkdir(exist_ok=True)
    (RESULTS / "tests.json").write_text(json.dumps(out, indent=1))
    print(
        json.dumps(
            {
                k: v
                for k, v in out.items()
                if k not in ("commit", "dirty", "generated_at_utc", "command")
            },
            indent=1,
        )
    )
    failed = any(
        out[k]["failed"] or out[k]["exit"]
        for k in ("pytest", "vitest_api", "vitest_web", "vitest_infra", "playwright")
    )  # type: ignore[index]
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
