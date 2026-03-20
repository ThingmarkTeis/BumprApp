-- ============================================================
-- BUMPR v1 — Database Functions (Layer 2)
-- Run this in Supabase SQL Editor after migration.sql
-- ============================================================

-- Get villas within a bounding box (for map viewport queries)
CREATE OR REPLACE FUNCTION get_villas_in_viewport(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision
)
RETURNS SETOF villas AS $$
  SELECT * FROM villas
  WHERE status = 'active'
  AND location IS NOT NULL
  AND ST_Within(
    location::geometry,
    ST_MakeEnvelope(min_lng, min_lat, max_lng, max_lat, 4326)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Count active bookings for a renter (for max 3 rule)
CREATE OR REPLACE FUNCTION count_active_bookings(renter_uuid uuid)
RETURNS integer AS $$
  SELECT COUNT(*)::integer FROM bookings
  WHERE renter_id = renter_uuid
  AND status IN ('requested', 'approved', 'confirmed', 'active');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Check availability: returns conflicting bookings for a villa and date range
CREATE OR REPLACE FUNCTION check_villa_availability(
  villa_uuid uuid,
  desired_check_in date,
  desired_check_out date
)
RETURNS TABLE(
  conflict_source text,
  conflict_start date,
  conflict_end date
) AS $$
  -- Check internal Bumpr bookings
  SELECT
    'bumpr' as conflict_source,
    check_in as conflict_start,
    check_out as conflict_end
  FROM bookings
  WHERE villa_id = villa_uuid
  AND status IN ('confirmed', 'active')
  AND check_in < desired_check_out
  AND check_out > desired_check_in

  UNION ALL

  -- Check external availability (iCal)
  SELECT
    source as conflict_source,
    blocked_start as conflict_start,
    blocked_end as conflict_end
  FROM external_availability
  WHERE villa_id = villa_uuid
  AND blocked_start < desired_check_out
  AND blocked_end > desired_check_in;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
