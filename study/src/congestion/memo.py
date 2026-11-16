"""`make memo`: fill reports/memo.md from results/summary.json and render reports/memo.pdf (2 pages max)."""

import re
import shutil
import subprocess
from pathlib import Path

import markdown

from . import fmt
from .paths import REPO
from .results import collect

REPORTS = REPO / "reports"
TEMPLATE = Path(__file__).with_name("memo_template.md")
PDF_SCRIPT = REPO / "scripts" / "html_to_pdf.mjs"

FORMATTERS = {
    "pct0": lambda v: fmt.pct(v, 0), "pct1": lambda v: fmt.pct(v, 1), "pct2": lambda v: fmt.pct(v, 2),
    "pct0f": lambda v: fmt.pct(100 * v, 0), "pct1f": lambda v: fmt.pct(100 * v, 1), "pct2f": lambda v: fmt.pct(100 * v, 2), "pct0f1": lambda v: fmt.pct(v, 1),
    "num1": lambda v: fmt.num(v, 1), "num2": lambda v: fmt.num(v, 2), "count": fmt.count,
    "pval": fmt.pval, "sci1": lambda v: fmt.sci(v, 1), "int": lambda v: str(int(v)), "raw": str,
}  # fmt: skip
TOKEN = re.compile(r"\{(\w+)(?:\|(\w+))?\}")


def render(summary: dict[str, object]) -> tuple[str, set[str]]:
    """Fill the template; returns the text and the set of substituted strings (for the number check)."""
    used: set[str] = set()

    def sub(m: re.Match[str]) -> str:
        key, f = m.group(1), m.group(2) or "raw"
        if key not in summary:
            raise KeyError(
                f"memo needs results key '{key}' which is missing (run make study/export/bench/test first)"
            )
        s = FORMATTERS[f](summary[key])  # type: ignore[arg-type]
        used.add(s)
        return s

    text = TOKEN.sub(sub, TEMPLATE.read_text())
    return text, used


def to_html(md_text: str) -> str:
    body = markdown.markdown(md_text, extensions=["attr_list", "sane_lists"])
    css = (
        "@page { size: Letter; margin: 0.5in 0.55in; } body { font: 8.9pt/1.28 'DejaVu Sans', Arial, sans-serif; color: #111; }"
        "h1 { font-size: 14pt; margin: 0 0 3pt; } h2 { font-size: 10.2pt; margin: 6pt 0 2pt; border-bottom: 1px solid #999; }"
        "p, li { margin: 2pt 0; } ul { padding-left: 14pt; margin: 2pt 0; } img { display: block; margin: 3pt auto; }"
        "em { color: #333; }"
    )
    return f"<!doctype html><html lang='en'><head><meta charset='utf-8'><title>Memo</title><style>{css}</style></head><body>{body}</body></html>"


def main() -> None:
    summary = collect()
    text, _ = render(summary)
    REPORTS.mkdir(exist_ok=True)
    (REPORTS / "memo.md").write_text(text)
    html = REPORTS / "memo.html"
    html.write_text(to_html(text))
    subprocess.run(
        ["node", str(PDF_SCRIPT), str(html), str(REPORTS / "memo.pdf")], check=True, cwd=REPO
    )
    html.unlink()  # build artefact (one explicit path)
    pub = REPO / "web" / "public"
    pub.mkdir(exist_ok=True)
    shutil.copy(REPORTS / "memo.pdf", pub / "memo.pdf")
    from pypdf import PdfReader

    print(f"memo.pdf: {len(PdfReader(REPORTS / 'memo.pdf').pages)} page(s)")


if __name__ == "__main__":
    main()
