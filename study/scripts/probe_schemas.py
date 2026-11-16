"""Phase 0 probe: read Parquet footers over HTTP (range requests) and query one column at a time."""

import duckdb

BASE = "https://d37ci6vzurychx.cloudfront.net/trip-data/"
con = duckdb.connect()
con.execute("INSTALL httpfs; LOAD httpfs;")
for t in ["yellow", "green", "fhvhv"]:
    for ym in ["2023-01", "2024-01", "2025-01"]:
        url = f"{BASE}{t}_tripdata_{ym}.parquet"
        rows = con.execute(
            f"select name, type from parquet_schema('{url}') where name <> 'schema'"
        ).fetchall()
        n = con.execute(f"select num_rows from parquet_file_metadata('{url}')").fetchone()[0]
        print(f"### {t} {ym} rows={n}")
        print("; ".join(f"{a}:{b}" for a, b in rows))
for t in ["yellow", "green", "fhvhv"]:
    url = f"{BASE}{t}_tripdata_2025-01.parquet"
    print(f"### cbd_congestion_fee values {t} 2025-01")
    for r in con.execute(
        f"select cbd_congestion_fee, count(*) from read_parquet('{url}') group by 1 order by 2 desc limit 8"
    ).fetchall():
        print(r)
for t in ["yellow", "green", "fhvhv"]:
    url = f"{BASE}{t}_tripdata_2024-12.parquet"
    r = con.execute(
        f"select count(*) filter (where column_name='cbd_congestion_fee') from (describe select * from read_parquet('{url}'))"
    ).fetchone()
    print(f"{t} 2024-12 has cbd column: {r[0]}")
