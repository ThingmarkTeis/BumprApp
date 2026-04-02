-- Switch Villa feature: add bumping status and auto-bump columns to bookings

-- Add new columns to bookings table for switch villa feature
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS auto_bump_scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_bump_triggered_by varchar,
  ADD COLUMN IF NOT EXISTS bumped_at timestamptz,
  ADD COLUMN IF NOT EXISTS switched_to_booking_id uuid REFERENCES bookings(id),
  ADD COLUMN IF NOT EXISTS switched_from_booking_id uuid REFERENCES bookings(id);

-- Add check constraint for auto_bump_triggered_by values
ALTER TABLE bookings
  ADD CONSTRAINT bookings_auto_bump_triggered_by_check
  CHECK (auto_bump_triggered_by IS NULL OR auto_bump_triggered_by IN ('switch', 'owner'));

-- Index for cron job: find bookings with scheduled auto-bumps that need to fire
CREATE INDEX IF NOT EXISTS idx_bookings_auto_bump_scheduled
  ON bookings (auto_bump_scheduled_at)
  WHERE auto_bump_scheduled_at IS NOT NULL AND status = 'confirmed';

-- Index for cron job: find bumping bookings past their 18h window
CREATE INDEX IF NOT EXISTS idx_bookings_bumping_status
  ON bookings (bumped_at)
  WHERE status = 'bumping';

-- Note: The 'bumping' status is added to the application-level BookingStatus type.
-- Since the database uses a text column (not a pg enum), no ALTER TYPE is needed.
-- The status column accepts any text value and validation happens at the application layer.
