"""The memo's numbers all come from results/*.json: regenerate and compare, and check every number."""

import re

from congestion import memo
from congestion.paths import REPO
from congestion.results import collect

# Numbers that are design scope or dates, not measured results (CLAUDE.md "Honesty of results").
DESIGN_SCOPE = {
    "2023", "2024", "2025", "2026", "5", "4", "30", "19", "3", "06", "09", "24", "10", "2", "1",
    "0.75", "1.50", "95", "20", "23", "52", "200", "62",
}  # fmt: skip
NUMBER = re.compile(r"[\u2212-]?\d+(?:,\d{3})*(?:\.\d+)?(?:e[-+]?\d+)?")


def test_memo_md_is_exactly_the_rendering_of_the_results() -> None:
    text, _ = memo.render(collect())
    assert (REPO / "reports" / "memo.md").read_text() == text, (
        "memo.md was edited by hand or is stale: run make memo"
    )


def test_every_number_in_the_memo_is_from_results_or_design_scope() -> None:
    text, used = memo.render(collect())
    body = re.sub(r"!\[.*?\]\(.*?\)(\{:.*?\})?", "", text)  # drop the image markup
    allowed_tokens: set[str] = set(DESIGN_SCOPE)
    for u in used:
        allowed_tokens.update(NUMBER.findall(u))
    unexplained = []
    for tok in NUMBER.findall(body):
        t = tok.replace("−", "-").lstrip("-")
        if tok in allowed_tokens or t in allowed_tokens or tok.lstrip("−-") in allowed_tokens:
            continue
        unexplained.append(tok)
    assert unexplained == [], (
        f"numbers in the memo that are neither results nor design scope: {unexplained}"
    )


def test_memo_pdf_is_at_most_two_pages() -> None:
    from pypdf import PdfReader

    assert len(PdfReader(REPO / "reports" / "memo.pdf").pages) <= 2


def test_memo_states_the_honest_caveats() -> None:
    md = (REPO / "reports" / "memo.md").read_text()
    for phrase in (
        "should not be read as the effect of the toll",
        "post hoc",
        "over-sized",
        "dose check",
    ):
        assert phrase.lower() in md.lower(), phrase
