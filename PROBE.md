# PROBE.md: Phase 0 evidence

Probe date: 2026-11-16 (box clock). Every answer below was obtained by running a command; the
commands and raw output are quoted. Scripts: `study/scripts/probe_schemas.py` (raw output saved as
`study/scripts/probe_schemas.out.txt`).

## 1. TLC page: months listed per type
Command: `curl -sL -A "Mozilla/5.0" https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page`
(HTTP 200, 145,385 bytes), then every `*_tripdata_YYYY-MM.parquet` link extracted from the HTML.

| Type | Links on page | Earliest | Latest |
|---|---|---|---|
| yellow | 213 | 2009-01 | **2026-09** |
| green | 158 | 2013-08 | **2026-09** |
| fhvhv | 92 | 2019-02 | **2026-09** |
| fhv (out of scope) | 140 | 2015-01 | 2026-08 |

Matches the spec ("latest month listed: September 2026"). In scope: 2023-01 to 2026-09 = 45 months x 3 types = 135 files.
Page excerpt: "Trip data is published monthly on this website, typically with a two-month delay to allow time for
full vendor submissions ... there may be minor changes in the near future to standardize the parquet schema across all years and datasets."

Head requests: `..._2026-09.parquet` returns 200 for all three types; `..._2026-10.parquet` returns 403 (not published).

## 2. Example URL
`https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2025-01.parquet`:
`HTTP/2 200`, `content-length: 59158238`, `server: AmazonS3`. Zone files:
`https://d37ci6vzurychx.cloudfront.net/misc/taxi_zones.zip` and `.../misc/taxi_zone_lookup.csv`, both listed on the page.

## 3. Schemas in January 2023, 2024 and 2025 (Parquet footers read over HTTP range requests)
Raw output is below (name:physical type). **Findings that change the pipeline:**
- Column names in section 5.2 are all present in all three years for all three types.
- Integer widths differ by year (zones `INT64` in 2023, `INT32` in 2024/2025; yellow/green `passenger_count` etc.
  change `DOUBLE`->`INT64`). So every column is read with an explicit cast and `union_by_name`, never by position.
- Yellow's airport column is `airport_fee` in 2023 and `Airport_fee` in 2024/2025 (not used by this study).
- **`cbd_congestion_fee` exists only from 2025-01 files on**; it is absent in 2023-01, 2024-01 and in the 2024-12 files
  (`has cbd column: 0` for all three types). The aggregation SQL must treat the column as missing (fee = 0/NULL) for older files.
- Timestamps are `INT64` Parquet timestamps (local New York time, no zone, as the spec says).

```
### yellow 2023-01 rows=3066766
VendorID:INT64; tpep_pickup_datetime:INT64; tpep_dropoff_datetime:INT64; passenger_count:DOUBLE; trip_distance:DOUBLE; RatecodeID:DOUBLE; store_and_fwd_flag:BYTE_ARRAY; PULocationID:INT64; DOLocationID:INT64; payment_type:INT64; fare_amount:DOUBLE; extra:DOUBLE; mta_tax:DOUBLE; tip_amount:DOUBLE; tolls_amount:DOUBLE; improvement_surcharge:DOUBLE; total_amount:DOUBLE; congestion_surcharge:DOUBLE; airport_fee:DOUBLE
### yellow 2024-01 rows=2964624
VendorID:INT32; tpep_pickup_datetime:INT64; tpep_dropoff_datetime:INT64; passenger_count:INT64; trip_distance:DOUBLE; RatecodeID:INT64; store_and_fwd_flag:BYTE_ARRAY; PULocationID:INT32; DOLocationID:INT32; payment_type:INT64; fare_amount:DOUBLE; extra:DOUBLE; mta_tax:DOUBLE; tip_amount:DOUBLE; tolls_amount:DOUBLE; improvement_surcharge:DOUBLE; total_amount:DOUBLE; congestion_surcharge:DOUBLE; Airport_fee:DOUBLE
### yellow 2025-01 rows=3475226
VendorID:INT32; tpep_pickup_datetime:INT64; tpep_dropoff_datetime:INT64; passenger_count:INT64; trip_distance:DOUBLE; RatecodeID:INT64; store_and_fwd_flag:BYTE_ARRAY; PULocationID:INT32; DOLocationID:INT32; payment_type:INT64; fare_amount:DOUBLE; extra:DOUBLE; mta_tax:DOUBLE; tip_amount:DOUBLE; tolls_amount:DOUBLE; improvement_surcharge:DOUBLE; total_amount:DOUBLE; congestion_surcharge:DOUBLE; Airport_fee:DOUBLE; cbd_congestion_fee:DOUBLE
### green 2023-01 rows=68211
VendorID:INT64; lpep_pickup_datetime:INT64; lpep_dropoff_datetime:INT64; store_and_fwd_flag:BYTE_ARRAY; RatecodeID:DOUBLE; PULocationID:INT64; DOLocationID:INT64; passenger_count:DOUBLE; trip_distance:DOUBLE; fare_amount:DOUBLE; extra:DOUBLE; mta_tax:DOUBLE; tip_amount:DOUBLE; tolls_amount:DOUBLE; ehail_fee:INT32; improvement_surcharge:DOUBLE; total_amount:DOUBLE; payment_type:DOUBLE; trip_type:DOUBLE; congestion_surcharge:DOUBLE
### green 2024-01 rows=56551
VendorID:INT32; lpep_pickup_datetime:INT64; lpep_dropoff_datetime:INT64; store_and_fwd_flag:BYTE_ARRAY; RatecodeID:INT64; PULocationID:INT32; DOLocationID:INT32; passenger_count:INT64; trip_distance:DOUBLE; fare_amount:DOUBLE; extra:DOUBLE; mta_tax:DOUBLE; tip_amount:DOUBLE; tolls_amount:DOUBLE; ehail_fee:DOUBLE; improvement_surcharge:DOUBLE; total_amount:DOUBLE; payment_type:INT64; trip_type:INT64; congestion_surcharge:DOUBLE
### green 2025-01 rows=48326
VendorID:INT32; lpep_pickup_datetime:INT64; lpep_dropoff_datetime:INT64; store_and_fwd_flag:BYTE_ARRAY; RatecodeID:INT64; PULocationID:INT32; DOLocationID:INT32; passenger_count:INT64; trip_distance:DOUBLE; fare_amount:DOUBLE; extra:DOUBLE; mta_tax:DOUBLE; tip_amount:DOUBLE; tolls_amount:DOUBLE; ehail_fee:DOUBLE; improvement_surcharge:DOUBLE; total_amount:DOUBLE; payment_type:INT64; trip_type:INT64; congestion_surcharge:DOUBLE; cbd_congestion_fee:DOUBLE
### fhvhv 2023-01 rows=18479031
hvfhs_license_num:BYTE_ARRAY; dispatching_base_num:BYTE_ARRAY; originating_base_num:BYTE_ARRAY; request_datetime:INT64; on_scene_datetime:INT64; pickup_datetime:INT64; dropoff_datetime:INT64; PULocationID:INT64; DOLocationID:INT64; trip_miles:DOUBLE; trip_time:INT64; base_passenger_fare:DOUBLE; tolls:DOUBLE; bcf:DOUBLE; sales_tax:DOUBLE; congestion_surcharge:DOUBLE; airport_fee:DOUBLE; tips:DOUBLE; driver_pay:DOUBLE; shared_request_flag:BYTE_ARRAY; shared_match_flag:BYTE_ARRAY; access_a_ride_flag:BYTE_ARRAY; wav_request_flag:BYTE_ARRAY; wav_match_flag:BYTE_ARRAY
### fhvhv 2024-01 rows=19663930
hvfhs_license_num:BYTE_ARRAY; dispatching_base_num:BYTE_ARRAY; originating_base_num:BYTE_ARRAY; request_datetime:INT64; on_scene_datetime:INT64; pickup_datetime:INT64; dropoff_datetime:INT64; PULocationID:INT32; DOLocationID:INT32; trip_miles:DOUBLE; trip_time:INT64; base_passenger_fare:DOUBLE; tolls:DOUBLE; bcf:DOUBLE; sales_tax:DOUBLE; congestion_surcharge:DOUBLE; airport_fee:DOUBLE; tips:DOUBLE; driver_pay:DOUBLE; shared_request_flag:BYTE_ARRAY; shared_match_flag:BYTE_ARRAY; access_a_ride_flag:BYTE_ARRAY; wav_request_flag:BYTE_ARRAY; wav_match_flag:BYTE_ARRAY
### fhvhv 2025-01 rows=20405666
hvfhs_license_num:BYTE_ARRAY; dispatching_base_num:BYTE_ARRAY; originating_base_num:BYTE_ARRAY; request_datetime:INT64; on_scene_datetime:INT64; pickup_datetime:INT64; dropoff_datetime:INT64; PULocationID:INT32; DOLocationID:INT32; trip_miles:DOUBLE; trip_time:INT64; base_passenger_fare:DOUBLE; tolls:DOUBLE; bcf:DOUBLE; sales_tax:DOUBLE; congestion_surcharge:DOUBLE; airport_fee:DOUBLE; tips:DOUBLE; driver_pay:DOUBLE; shared_request_flag:BYTE_ARRAY; shared_match_flag:BYTE_ARRAY; access_a_ride_flag:BYTE_ARRAY; wav_request_flag:BYTE_ARRAY; wav_match_flag:BYTE_ARRAY; cbd_congestion_fee:DOUBLE
### cbd_congestion_fee values yellow 2025-01
(0.75, 2246495)
(0.0, 1222178)
(-0.75, 6553)
### cbd_congestion_fee values green 2025-01
(0.0, 43183)
(0.75, 3307)
(None, 1836)
### cbd_congestion_fee values fhvhv 2025-01
(0.0, 14105454)
(1.5, 6300207)
(3.0, 5)
yellow 2024-12 has cbd column: 0
green 2024-12 has cbd column: 0
fhvhv 2024-12 has cbd column: 0
```

## 4. `cbd_congestion_fee` values, January 2025
Query: `select cbd_congestion_fee, count(*) from read_parquet(url) group by 1 order by 2 desc` (see raw output above).

| Type | value | rows |
|---|---|---|
| yellow | 0.75 | 2,246,495 |
| yellow | 0.00 | 1,222,178 |
| yellow | **-0.75** | 6,553 |
| green | 0.00 | 43,183 |
| green | 0.75 | 3,307 |
| green | **NULL** | 1,836 |
| fhvhv | 0.00 | 14,105,454 |
| fhvhv | 1.50 | 6,300,207 |
| fhvhv | **3.00** | 5 |

Expected 0.75 (yellow/green) and 1.50 (fhvhv): confirmed. Surprises, handled in the design: negative fees (refund rows) on yellow,
NULLs on green, and a handful of 3.00 on fhvhv. "Has a fee" is defined as `cbd_congestion_fee > 0`, so refunds and NULLs count as no fee.
(Decision in DECISIONS.md.) `fee_sum` is kept as the raw sum so the dose check can use it.

## 5. Shapefile
`taxi_zones.zip` sha256 `f6d711917bb4340f8f644d5366c51665489eb2d426dd1a4a55677721ae5adf17` (1,022,574 bytes);
`taxi_zone_lookup.csv` sha256 `1a99e105092230f8620f301edcca7f80d3080642ff404d28ed957d3fa222c8ed`.
DuckDB spatial `st_read_meta`: driver ESRI Shapefile, layer `taxi_zones`, **263 features, 263 distinct `LocationID`**, geometry type Polygon,
CRS **EPSG:2263** (NAD83 / New York Long Island, US survey feet), fields `OBJECTID, Shape_Leng, Shape_Area, zone, LocationID, borough`.
Note: the zip unpacks into a `taxi_zones/` subfolder, and 263 features means the shapefile has 263 of the 265 ids (the ids 264 and 265 have no polygon, as expected).

## 6. MTA toll amounts
- `https://congestionreliefzone.mta.info/tolling` and `https://www.mta.info/document/151326` return HTTP 403 to `curl` (bot block), so they could not be read directly.
- Web search (2026-11-16) results quote TLC industry notice 24-10 (https://nyc.gov/assets/tlc/downloads/pdf/industry-notices/industry_notice_24_10_english.pdf)
  and the MTA page https://www.mta.info/fares-tolls/tolls/congestion-relief-zone/about: trips dispatched by high-volume for-hire services
  (Uber, Lyft) are charged **$1.50 per trip**; taxis, street-hail liveries and trips from other FHV bases are charged **$0.75 per trip**; started 5 January 2025.
  Older $1.25/$2.50 figures were the 2024 proposal and were superseded.
- This agrees with the data: the modal positive fee values in section 4 are exactly 0.75 (yellow, green) and 1.50 (fhvhv). Search snippets only,
  not a page I could read in full; flagged as "confirmed by data, cited from search".

## 7. Placebo dates and the court timeline (from web search, snippets only)
- Original launch date **30 June 2024**: Planetizen, "NYC Congestion Pricing to Start June 30, MTA Announces" (https://www.planetizen.com/news/2024/04/128682-nyc-congestion-pricing-start-june-30-mta-announces).
- The June 2024 pause: a result confirms the Governor "indefinitely paused" the program; the exact day (5 June 2024) did **not** appear in the snippets I could see,
  so the memo says "paused in June 2024" and does not state a day.
- Actual start: Sunday **5 January 2025** (confirmed by the data in Phase 2, section 6.1 of the spec).
- Placebo dates used: 5 January 2024 and 30 June 2024, as in the spec.
- Federal timeline: US DOT Secretary Duffy's letter rescinding the Value Pricing Pilot Program approval dated **19 February 2025**; TRO then preliminary
  injunction by Judge Lewis Liman (sources disagree: 27 or 28 May 2025); on **3 March 2026** Liman ruled the federal actions unlawful and vacated the letters
  (a government appeal to the Second Circuit was still possible). Sources: courthousenews.com ("Judge rejects Trump attempt to eliminate NYC congestion pricing"), landline.media, amny.com, enr.com (search results 2026-11-16).
  The memo cites the month and says "late May 2025" for the injunction because the day differs between sources.

## 8. Environment
See VERSIONS.md. Note: the box is a 4 vCPU / 15 GB machine (`nproc` = 4, `free -g` = 15), not the 8 vCPU / 32 GB in the spec; recorded in DECISIONS.md.
