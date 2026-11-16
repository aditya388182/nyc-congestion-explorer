"""Load named statements from a .sql file (blocks start with `-- name: <id>`)."""

from functools import cache
from pathlib import Path

from .paths import SQL_DIR


@cache
def load(filename: str) -> dict[str, str]:
    return parse((SQL_DIR / filename).read_text())


def parse(text: str) -> dict[str, str]:
    blocks: dict[str, list[str]] = {}
    current: str | None = None
    for line in text.splitlines():
        if line.startswith("-- name:"):
            current = line.split(":", 1)[1].strip()
            blocks[current] = []
        elif current is not None:
            blocks[current].append(line)
    return {k: "\n".join(v).strip() for k, v in blocks.items()}


def read(path: Path) -> str:
    return path.read_text()
