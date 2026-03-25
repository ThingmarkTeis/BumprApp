-- ============================================================
-- BUMPR v1 — Villa Search Function + Indexes (Layer 2)
-- Run this in Supabase SQL Editor after 002_functions.sql
-- ============================================================

-- Ensure PostGIS is enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- INDEXES for search performance
-- ============================================================

-- GIST index on location (may already exist from initial migration)
CREATE INDEX IF NOT EXISTS idx_villas_location_gist
  ON villas USING GIST (location);

-- Composite index for status + common filters
CREATE INDEX IF NOT EXISTS idx_villas_status_rate
  ON villas (status, standby_rate_idr);

CREATE INDEX IF NOT EXISTS idx_villas_status_bedrooms
  ON villas (status, bedrooms);

CREATE INDEX IF NOT EXISTS idx_villas_status_max_guests
  ON villas (status, max_guests);

-- GIN index for amenities containment queries
CREATE INDEX IF NOT EXISTS idx_villas_amenities_gin
  ON villas USING GIN (amenities);

-- Index for availability checks (bookings overlap)
CREATE INDEX IF NOT EXISTS idx_bookings_villa_dates_status
  ON bookings (villa_id, status, check_in, check_out);

-- Index for external availability overlap
CREATE INDEX IF NOT EXISTS idx_external_availability_villa_dates
  ON external_availability (villa_id, blocked_start, blocked_end);

-- ============================================================
-- search_villas — core search function called via supabase.rpc()
-- ============================================================

CREATE OR REPLACE FUNCTION search_villas(
  search_lat double precision DEFAULT NULL,
  search_lng double precision DEFAULT NULL,
  search_radius_km int DEFAULT 15,
  bounds_sw_lat double precision DEFAULT NULL,
  bounds_sw_lng double precision DEFAULT NULL,
  bounds_ne_lat double precision DEFAULT NULL,
  bounds_ne_lng double precision DEFAULT NULL,
  filter_check_in date DEFAULT NULL,
  filter_check_out date DEFAULT NULL,
  filter_min_price bigint DEFAULT NULL,
  filter_max_price bigint DEFAULT NULL,
  filter_bedrooms int DEFAULT NULL,
  filter_guests int DEFAULT NULL,
  filter_amenities text[] DEFAULT NULL,
  sort_by text DEFAULT NULL,
  page_number int DEFAULT 1,
  page_limit int DEFAULT 20
)
RETURNS TABLE (
  villa_id uuid,
  villa_title text,
  villa_area text,
  standby_rate bigint,
  villa_bedrooms int,
  villa_bathrooms int,
  villa_max_guests int,
  lat double precision,
  lng double precision,
  villa_amenities jsonb,
  villa_owner_id uuid,
  owner_name text,
  owner_verified boolean,
  images jsonb,
  distance_meters double precision,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  search_point geography;
BEGIN
  -- Build geography point for distance calculations
  IF search_lat IS NOT NULL AND search_lng IS NOT NULL THEN
    search_point := ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography;
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT
      v.id,
      v.title,
      v.area,
      v.standby_rate_idr,
      v.bedrooms,
      COALESCE(v.bathrooms, 0) AS bathrooms,
      v.max_guests,
      ST_Y(v.location::geometry) AS villa_lat,
      ST_X(v.location::geometry) AS villa_lng,
      v.amenities,
      v.owner_id,
      v.created_at,
      CASE
        WHEN search_point IS NOT NULL AND v.location IS NOT NULL
        THEN ST_Distance(v.location, search_point)
        ELSE NULL
      END AS dist_m
    FROM villas v
    WHERE v.status = 'active'
      AND v.location IS NOT NULL
      -- Radius geo-filter (ST_DWithin uses meters)
      AND (
        search_point IS NULL
        OR ST_DWithin(v.location, search_point, search_radius_km * 1000)
      )
      -- Bounds geo-filter (map viewport)
      AND (
        bounds_sw_lat IS NULL
        OR ST_Within(
          v.location::geometry,
          ST_MakeEnvelope(bounds_sw_lng, bounds_sw_lat, bounds_ne_lng, bounds_ne_lat, 4326)
        )
      )
      -- Price range
      AND (filter_min_price IS NULL OR v.standby_rate_idr >= filter_min_price)
      AND (filter_max_price IS NULL OR v.standby_rate_idr <= filter_max_price)
      -- Minimum bedrooms
      AND (filter_bedrooms IS NULL OR v.bedrooms >= filter_bedrooms)
      -- Minimum guest capacity
      AND (filter_guests IS NULL OR v.max_guests >= filter_guests)
      -- Amenities: villa must have ALL requested amenities
      AND (
        filter_amenities IS NULL
        OR v.amenities @> to_jsonb(filter_amenities)
      )
      -- Availability: no conflicting external bookings (full-price iCal)
      AND (
        filter_check_in IS NULL OR filter_check_out IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM external_availability ea
          WHERE ea.villa_id = v.id
            AND ea.blocked_start < filter_check_out
            AND ea.blocked_end > filter_check_in
        )
      )
      -- Availability: no conflicting internal Bumpr bookings
      AND (
        filter_check_in IS NULL OR filter_check_out IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.villa_id = v.id
            AND b.status IN ('confirmed', 'active')
            AND b.check_in < filter_check_out
            AND b.check_out > filter_check_in
        )
      )
  )
  SELECT
    f.id,
    f.title,
    f.area,
    f.standby_rate_idr,
    f.bedrooms,
    f.bathrooms,
    f.max_guests,
    f.villa_lat,
    f.villa_lng,
    f.amenities,
    f.owner_id,
    p.full_name,
    COALESCE(op.verified, false),
    COALESCE(
      (
        SELECT json_agg(
          json_build_object('url', vp.url, 'alt', COALESCE(vp.caption, f.title))
          ORDER BY vp.sort_order
        )
        FROM villa_photos vp
        WHERE vp.villa_id = f.id
      ),
      '[]'::json
    )::jsonb,
    f.dist_m,
    COUNT(*) OVER ()
  FROM filtered f
  JOIN profiles p ON p.id = f.owner_id
  LEFT JOIN owner_profiles op ON op.id = f.owner_id
  ORDER BY
    CASE WHEN sort_by = 'price_asc' THEN f.standby_rate_idr END ASC NULLS LAST,
    CASE WHEN sort_by = 'price_desc' THEN f.standby_rate_idr END DESC NULLS LAST,
    CASE WHEN sort_by = 'newest' THEN extract(epoch from f.created_at) END DESC NULLS LAST,
    CASE
      WHEN sort_by = 'distance' THEN f.dist_m
      WHEN sort_by IS NULL AND search_point IS NOT NULL THEN f.dist_m
    END ASC NULLS LAST,
    f.created_at DESC
  LIMIT page_limit
  OFFSET (page_number - 1) * page_limit;
END;
$$;
