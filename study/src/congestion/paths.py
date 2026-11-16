"""Repository paths and shared constants."""

from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
SQL_DIR = REPO / "study" / "sql"
DATA = REPO / "data"
RAW = DATA / "raw"
AGG = DATA / "agg"
PARTS = AGG / "parts"
MANIFEST = DATA / "manifest.csv"
RESULTS = REPO / "results"
TLC_PAGE = "https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page"
TRIP_TYPES = ("yellow", "green", "fhvhv")
FIRST_MONTH = "2023-01"
