"""Shared stamping for results/*.json: commit, dirty, generated_at_utc, command."""

import subprocess
from datetime import UTC, datetime

from .paths import REPO


def _git(*args: str) -> str:
    return subprocess.run(
        ["git", *args], check=False, cwd=REPO, capture_output=True, text=True
    ).stdout.strip()


def stamp(command: str) -> dict[str, object]:
    return {
        "commit": _git("rev-parse", "--short", "HEAD"),
        "dirty": bool(_git("status", "--porcelain", "--", ".", ":!results", ":!data")),
        "generated_at_utc": datetime.now(UTC).isoformat(timespec="seconds"),
        "command": command,
    }
