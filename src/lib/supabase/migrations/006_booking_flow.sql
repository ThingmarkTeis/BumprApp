-- Booking flow: add missing columns to villas and bookings

-- Villa: check-out time and house rules
ALTER TABLE villas
  ADD COLUMN IF NOT EXISTS check_out_time time DEFAULT '11:00',
  ADD COLUMN IF NOT EXISTS house_rules text;

-- Bookings: arrival time, house rules acceptance, payment method
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS arrival_time time,
  ADD COLUMN IF NOT EXISTS house_rules_accepted boolean,
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash_on_arrival';

-- Index for booking lookups
CREATE INDEX IF NOT EXISTS idx_bookings_villa_status ON bookings (villa_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_renter_status ON bookings (renter_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_check_in ON bookings (check_in);
