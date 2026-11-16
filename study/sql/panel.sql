-- Weekly zone panel. Weeks start on SUNDAY (the toll began Sunday 2025-01-05):
--   week_start = date_trunc('week', d + INTERVAL 1 DAY) - INTERVAL 1 DAY
-- Input: registered table `daily` (trip_type, date, zone, direction, trips, trips_with_fee, fee_sum).
-- Only complete weeks inside [first_day, last_day] are kept.

-- name: weekly
-- params: first_day, last_day, first_day, last_day  (DATE)
CREATE OR REPLACE TEMP TABLE weekly AS
WITH bounds AS (
  SELECT
    -- first Sunday on or after first_day
    CAST(date_trunc('week', CAST(? AS DATE) + INTERVAL 1 DAY) - INTERVAL 1 DAY AS DATE) AS w0,
    CAST(? AS DATE) AS last_day
), first_week AS (
  SELECT CASE WHEN w0 < CAST(? AS DATE) THEN w0 + 7 ELSE w0 END AS w_first, last_day FROM bounds
), weeks AS (
  SELECT CAST(w AS DATE) AS week_start
  FROM first_week, generate_series(CAST(w_first AS TIMESTAMP),
                                   CAST(last_day AS TIMESTAMP), INTERVAL 7 DAY) AS t(w)
  WHERE CAST(w AS DATE) + 6 <= last_day
), per_type AS (
  SELECT trip_type, CASE direction WHEN 'dropoff' THEN 'dropoffs' ELSE 'pickups' END AS outcome,
         zone,
         CAST(date_trunc('week', CAST(date AS DATE) + INTERVAL 1 DAY) - INTERVAL 1 DAY AS DATE) AS week_start,
         trips, trips_with_fee, fee_sum
  FROM daily
), with_all AS (
  SELECT * FROM per_type
  UNION ALL
  SELECT 'all', outcome, zone, week_start, trips, trips_with_fee, fee_sum FROM per_type
), summed AS (
  SELECT trip_type, outcome, zone, week_start, SUM(trips) AS trips,
         SUM(trips_with_fee) AS trips_with_fee, SUM(fee_sum) AS fee_sum
  FROM with_all GROUP BY ALL
), grid AS (
  -- dense grid so that LAG(52) means "52 weeks ago", not "52 rows ago"
  SELECT t.trip_type, o.outcome, z.zone, w.week_start
  FROM (SELECT DISTINCT trip_type FROM with_all) t
  CROSS JOIN (SELECT DISTINCT outcome FROM per_type) o
  CROSS JOIN (SELECT DISTINCT zone FROM per_type) z
  CROSS JOIN weeks w
)
SELECT g.trip_type, g.outcome, g.zone, g.week_start,
       COALESCE(s.trips, 0) AS trips,
       COALESCE(s.trips_with_fee, 0) AS trips_with_fee,
       COALESCE(s.fee_sum, 0.0) AS fee_sum
FROM grid g LEFT JOIN summed s USING (trip_type, outcome, zone, week_start);

-- name: panel
-- params: pre_end (DATE: first post week; "pre period" = week_start < pre_end)
CREATE OR REPLACE TEMP TABLE panel AS
WITH base AS (
  SELECT *,
    LAG(trips, 52) OVER w AS lag52,
    CASE WHEN COUNT(*) OVER w4 = 4 THEN AVG(trips) OVER w4 END AS roll4
  FROM weekly
  WINDOW w AS (PARTITION BY trip_type, outcome, zone ORDER BY week_start),
         w4 AS (PARTITION BY trip_type, outcome, zone ORDER BY week_start
                ROWS BETWEEN 3 PRECEDING AND CURRENT ROW)
), pre AS (
  SELECT trip_type, outcome, zone, AVG(trips) AS pre_mean
  FROM weekly WHERE week_start < CAST(? AS DATE) GROUP BY ALL
), ranked AS (
  SELECT *, RANK() OVER (PARTITION BY trip_type, outcome ORDER BY pre_mean DESC, zone) AS pre_rank
  FROM pre
)
SELECT b.*, r.pre_mean, r.pre_rank
FROM base b LEFT JOIN ranked r USING (trip_type, outcome, zone);

-- name: change
-- Mean weekly trips in the first 52 post weeks vs the same 52 weeks a year earlier (uses lag52).
-- params: post_start (DATE)
SELECT trip_type, outcome, zone,
       SUM(trips) / 52.0 AS post_mean, SUM(lag52) / 52.0 AS year_ago_mean,
       CASE WHEN SUM(lag52) > 0 THEN 100.0 * (SUM(trips) / SUM(lag52) - 1) END AS change_pct
FROM panel
WHERE week_start >= CAST(? AS DATE) AND week_start < CAST(? AS DATE) + 364
GROUP BY ALL;
