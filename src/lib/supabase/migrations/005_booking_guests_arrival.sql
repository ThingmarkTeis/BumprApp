-- Add guest count and arrival preference to bookings
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS guests integer,
  ADD COLUMN IF NOT EXISTS arrival_today boolean;
