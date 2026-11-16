-- Zone geometry work in DuckDB spatial. Source CRS is EPSG:2263 (NY State Plane, US feet).

-- name: load_shapes
-- param: path to the taxi_zones shapefile (GDAL path, e.g. /vsizip/.../taxi_zones.zip/taxi_zones/taxi_zones.shp)
CREATE OR REPLACE TEMP TABLE shapes AS
SELECT CAST(LocationID AS INTEGER) AS id, zone AS name, borough, geom
FROM st_read(?);

-- name: crs_check
-- Known zone: 230 (Times Square/Theatre District) must land near lon -73.985, lat 40.758.
-- The WRONG axis order would give lon ~ 40.7 and lat ~ -73.9.
SELECT id, name,
       ST_X(ST_Centroid(ST_Transform(geom, 'EPSG:2263', 'EPSG:4326', always_xy := true))) AS lon,
       ST_Y(ST_Centroid(ST_Transform(geom, 'EPSG:2263', 'EPSG:4326', always_xy := true))) AS lat
FROM shapes WHERE id = 230;

-- name: touches
-- Pairs (a, b) of different zones sharing a border (boundary contact, interiors disjoint).
SELECT a.id AS a, b.id AS b FROM shapes a JOIN shapes b ON a.id < b.id AND ST_Touches(a.geom, b.geom);

-- name: near
-- Same pairs using a tolerance: geometries within 1 US survey foot of each other
-- (catches hairline gaps in the shapefile that ST_Touches would miss).
SELECT a.id AS a, b.id AS b FROM shapes a JOIN shapes b ON a.id < b.id AND ST_DWithin(a.geom, b.geom, 1.0);

-- name: geojson
-- Registered pandas table `zone_attrs` (id, grp, share, ring) supplies the properties.
-- Geometry is simplified in projected feet (tolerance 15 ft), then transformed to WGS84.
SELECT s.id, s.name, s.borough, z.grp, z.share, z.ring,
       ST_AsGeoJSON(ST_Transform(ST_SimplifyPreserveTopology(s.geom, 15.0),
                                 'EPSG:2263', 'EPSG:4326', always_xy := true)) AS geometry
FROM shapes s JOIN zone_attrs z ON z.id = s.id ORDER BY s.id;
