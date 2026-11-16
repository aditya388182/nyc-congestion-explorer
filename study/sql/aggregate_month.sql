-- Aggregation of one file's `trips` table (see normalize.sql). Blocks run in order.
-- Exclusion rules (SPEC 5.4) are applied in this order and each row gets the FIRST match:
--   null_zone, unknown_zone, outside_month, bad_duration.
-- A NULL timestamp cannot satisfy "inside the month" or "1 minute to 4 hours", so it is
-- excluded as outside_month (NULL pickup) or bad_duration (NULL dropoff): this keeps the
-- four reasons a complete partition (see DECISIONS.md D7).

-- name: classify
-- params: month_start, next_month_start (timestamps)
CREATE OR REPLACE TEMP TABLE classified AS
SELECT pz, dz, pickup_ts, dropoff_ts, fee,
  CASE
    WHEN pz IS NULL OR dz IS NULL THEN 'null_zone'
    WHEN pz IN (264, 265) OR dz IN (264, 265) THEN 'unknown_zone'
    WHEN pickup_ts IS NULL OR pickup_ts < CAST(? AS TIMESTAMP)
         OR pickup_ts >= CAST(? AS TIMESTAMP) THEN 'outside_month'
    WHEN dropoff_ts IS NULL
         OR epoch(dropoff_ts) - epoch(pickup_ts) < 60
         OR epoch(dropoff_ts) - epoch(pickup_ts) > 14400 THEN 'bad_duration'
    ELSE NULL
  END AS reason
FROM trips;

-- name: reconcile
SELECT COALESCE(reason, 'kept') AS reason, COUNT(*) AS n
FROM classified GROUP BY 1;

-- name: daily
-- params: trip_type
SELECT ? AS trip_type, CAST(dropoff_ts AS DATE) AS date, dz AS zone, 'dropoff' AS direction,
       COUNT(*) AS trips,
       COUNT(*) FILTER (WHERE fee > 0) AS trips_with_fee,
       COALESCE(SUM(fee), 0.0) AS fee_sum
FROM classified WHERE reason IS NULL GROUP BY ALL
UNION ALL
SELECT ?, CAST(pickup_ts AS DATE), pz, 'pickup',
       COUNT(*), COUNT(*) FILTER (WHERE fee > 0), COALESCE(SUM(fee), 0.0)
FROM classified WHERE reason IS NULL GROUP BY ALL
ORDER BY 4, 2, 3;

-- name: intra
-- params: trip_type, month (first day of month)
SELECT ? AS trip_type, CAST(? AS DATE) AS month, pz AS zone,
       COUNT(*) AS trips, COUNT(*) FILTER (WHERE fee > 0) AS trips_with_fee
FROM classified WHERE reason IS NULL AND pz = dz GROUP BY ALL ORDER BY 3;
