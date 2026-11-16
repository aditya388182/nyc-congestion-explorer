-- Each block loads one raw Parquet file into a narrow TEMP table `trips` with the same
-- column names for every trip type. Columns are read by name with explicit casts, never by
-- position (PROBE.md section 3: integer widths differ by year). The `_nofee` variants exist
-- because cbd_congestion_fee is absent from files before January 2025 (PROBE.md section 4).
-- The single parameter is the file path.

-- name: yellow_fee
CREATE OR REPLACE TEMP TABLE trips AS
SELECT CAST(PULocationID AS INTEGER) AS pz, CAST(DOLocationID AS INTEGER) AS dz,
       CAST(tpep_pickup_datetime AS TIMESTAMP) AS pickup_ts,
       CAST(tpep_dropoff_datetime AS TIMESTAMP) AS dropoff_ts,
       CAST(cbd_congestion_fee AS DOUBLE) AS fee
FROM read_parquet(?);

-- name: yellow_nofee
CREATE OR REPLACE TEMP TABLE trips AS
SELECT CAST(PULocationID AS INTEGER) AS pz, CAST(DOLocationID AS INTEGER) AS dz,
       CAST(tpep_pickup_datetime AS TIMESTAMP) AS pickup_ts,
       CAST(tpep_dropoff_datetime AS TIMESTAMP) AS dropoff_ts,
       CAST(NULL AS DOUBLE) AS fee
FROM read_parquet(?);

-- name: green_fee
CREATE OR REPLACE TEMP TABLE trips AS
SELECT CAST(PULocationID AS INTEGER) AS pz, CAST(DOLocationID AS INTEGER) AS dz,
       CAST(lpep_pickup_datetime AS TIMESTAMP) AS pickup_ts,
       CAST(lpep_dropoff_datetime AS TIMESTAMP) AS dropoff_ts,
       CAST(cbd_congestion_fee AS DOUBLE) AS fee
FROM read_parquet(?);

-- name: green_nofee
CREATE OR REPLACE TEMP TABLE trips AS
SELECT CAST(PULocationID AS INTEGER) AS pz, CAST(DOLocationID AS INTEGER) AS dz,
       CAST(lpep_pickup_datetime AS TIMESTAMP) AS pickup_ts,
       CAST(lpep_dropoff_datetime AS TIMESTAMP) AS dropoff_ts,
       CAST(NULL AS DOUBLE) AS fee
FROM read_parquet(?);

-- name: fhvhv_fee
CREATE OR REPLACE TEMP TABLE trips AS
SELECT CAST(PULocationID AS INTEGER) AS pz, CAST(DOLocationID AS INTEGER) AS dz,
       CAST(pickup_datetime AS TIMESTAMP) AS pickup_ts,
       CAST(dropoff_datetime AS TIMESTAMP) AS dropoff_ts,
       CAST(cbd_congestion_fee AS DOUBLE) AS fee
FROM read_parquet(?);

-- name: fhvhv_nofee
CREATE OR REPLACE TEMP TABLE trips AS
SELECT CAST(PULocationID AS INTEGER) AS pz, CAST(DOLocationID AS INTEGER) AS dz,
       CAST(pickup_datetime AS TIMESTAMP) AS pickup_ts,
       CAST(dropoff_datetime AS TIMESTAMP) AS dropoff_ts,
       CAST(NULL AS DOUBLE) AS fee
FROM read_parquet(?);
