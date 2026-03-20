-- ============================================================
-- BUMPR v1 — Complete Database Migration
-- Run this in Supabase SQL Editor (or via CLI: supabase db push)
-- ============================================================

-- ────────────────────────────────────────────
-- EXTENSIONS
-- ────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ────────────────────────────────────────────
-- HELPER: updated_at trigger function
-- ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ────────────────────────────────────────────
-- TABLE 1: profiles
-- ────────────────────────────────────────────

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  avatar_url text,
  preferred_currency text NOT NULL DEFAULT 'USD',
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ────────────────────────────────────────────
-- TABLE 2: owner_profiles
-- ────────────────────────────────────────────

CREATE TABLE owner_profiles (
  id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  business_name text,
  bank_name text,
  bank_account_number text,
  bank_account_holder text,
  xendit_customer_id text,
  id_type text,
  id_number text,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER owner_profiles_updated_at
  BEFORE UPDATE ON owner_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ────────────────────────────────────────────
-- TABLE 3: villas
-- ────────────────────────────────────────────

CREATE TABLE villas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES owner_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  area text NOT NULL,
  location geography(Point, 4326),
  address text,
  bedrooms integer NOT NULL,
  bathrooms integer,
  max_guests integer NOT NULL,
  standby_rate_idr bigint NOT NULL,
  bump_notice_hours integer NOT NULL DEFAULT 18 CHECK (bump_notice_hours >= 18),
  check_in_by time,
  earliest_check_in time,
  amenities jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'delisted')),
  ical_url text,
  ical_last_synced_at timestamptz,
  ical_sync_status text NOT NULL DEFAULT 'pending' CHECK (ical_sync_status IN ('ok', 'pending', 'error')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER villas_updated_at
  BEFORE UPDATE ON villas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ────────────────────────────────────────────
-- TABLE 4: villa_photos
-- ────────────────────────────────────────────

CREATE TABLE villa_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  villa_id uuid NOT NULL REFERENCES villas(id) ON DELETE CASCADE,
  url text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────
-- TABLE 5: bookings
-- ────────────────────────────────────────────

CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  villa_id uuid NOT NULL REFERENCES villas(id) ON DELETE CASCADE,
  renter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  check_in date NOT NULL,
  check_out date NOT NULL,
  nights integer NOT NULL CHECK (nights > 0),
  nightly_rate_idr bigint NOT NULL,
  total_amount_idr bigint NOT NULL,
  service_fee_idr bigint NOT NULL,
  total_charged_idr bigint NOT NULL,
  fx_rate_to_renter numeric(12, 4),
  renter_currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'requested' CHECK (status IN (
    'requested', 'approved', 'confirmed', 'active', 'bumped',
    'completed', 'cancelled', 'expired', 'pre_checkin_cancelled'
  )),
  checked_in_at timestamptz,
  protection_ends_at timestamptz,
  is_rebook boolean NOT NULL DEFAULT false,
  original_booking_id uuid REFERENCES bookings(id),
  approved_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT check_dates CHECK (check_out > check_in)
);

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ────────────────────────────────────────────
-- TABLE 6: bumps
-- ────────────────────────────────────────────

CREATE TABLE bumps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  villa_id uuid NOT NULL REFERENCES villas(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  renter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  external_platform text,
  ical_verified boolean NOT NULL DEFAULT false,
  ical_verified_at timestamptz,
  deadline timestamptz NOT NULL,
  nights_stayed integer,
  nights_refunded integer,
  renter_response text CHECK (renter_response IN ('rebooking', 'accepted_deadline', 'left_early')),
  renter_responded_at timestamptz,
  replacement_booking_id uuid REFERENCES bookings(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'admin_review')),
  resolved_at timestamptz,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────
-- TABLE 7: payments
-- ────────────────────────────────────────────

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('charge', 'refund', 'payout')),
  amount_idr bigint NOT NULL,
  description text,
  xendit_payment_id text,
  xendit_status text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- ────────────────────────────────────────────
-- TABLE 8: payouts
-- ────────────────────────────────────────────

CREATE TABLE payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES owner_profiles(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  payment_id uuid REFERENCES payments(id),
  amount_idr bigint NOT NULL,
  nights_paid integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  xendit_disbursement_id text,
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────
-- TABLE 9: external_availability
-- ────────────────────────────────────────────

CREATE TABLE external_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  villa_id uuid NOT NULL REFERENCES villas(id) ON DELETE CASCADE,
  source text NOT NULL,
  blocked_start date NOT NULL,
  blocked_end date NOT NULL,
  summary text,
  synced_at timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────
-- TABLE 10: notifications
-- ────────────────────────────────────────────

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES bookings(id) ON DELETE CASCADE,
  bump_id uuid REFERENCES bumps(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('whatsapp', 'in_app', 'email')),
  template text NOT NULL,
  message_body text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  twilio_message_sid text,
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────
-- TABLE 11: exchange_rates
-- ────────────────────────────────────────────

CREATE TABLE exchange_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  currency_code text NOT NULL UNIQUE,
  rate_from_idr numeric(18, 8) NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  fetched_at timestamptz NOT NULL DEFAULT now()
);

-- Seed common currencies
INSERT INTO exchange_rates (currency_code, rate_from_idr, source) VALUES
  ('USD', 0.0000625, 'manual'),
  ('EUR', 0.0000575, 'manual'),
  ('GBP', 0.0000495, 'manual'),
  ('AUD', 0.0000965, 'manual'),
  ('SGD', 0.0000845, 'manual'),
  ('DKK', 0.0004290, 'manual');

-- ────────────────────────────────────────────
-- INDEXES
-- ────────────────────────────────────────────

-- Villas
CREATE INDEX idx_villas_area_status ON villas(area, status);
CREATE INDEX idx_villas_location ON villas USING GIST(location);
CREATE INDEX idx_villas_owner ON villas(owner_id);

-- Bookings
CREATE INDEX idx_bookings_villa_status ON bookings(villa_id, status);
CREATE INDEX idx_bookings_renter_status ON bookings(renter_id, status);
CREATE INDEX idx_bookings_villa_dates ON bookings(villa_id, check_in, check_out);
CREATE INDEX idx_bookings_active ON bookings(status) WHERE status = 'active';

-- Bumps
CREATE INDEX idx_bumps_booking ON bumps(booking_id);
CREATE INDEX idx_bumps_villa_status ON bumps(villa_id, status);

-- External availability
CREATE INDEX idx_ext_avail_villa_dates ON external_availability(villa_id, blocked_start, blocked_end);

-- Payments
CREATE INDEX idx_payments_booking_type ON payments(booking_id, type);

-- Payouts
CREATE INDEX idx_payouts_owner_status ON payouts(owner_id, status);

-- Notifications
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_bump ON notifications(bump_id);

-- Villa photos
CREATE INDEX idx_villa_photos_villa ON villa_photos(villa_id, sort_order);

-- ────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ────────────────────────────────────────────

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE villas ENABLE ROW LEVEL SECURITY;
ALTER TABLE villa_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bumps ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Helper function: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: check if current user owns a villa
CREATE OR REPLACE FUNCTION owns_villa(villa_uuid uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM villas WHERE id = villa_uuid AND owner_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── PROFILES ──

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid() OR is_admin());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ── OWNER_PROFILES ──

CREATE POLICY "Owners can read own owner profile"
  ON owner_profiles FOR SELECT
  USING (id = auth.uid() OR is_admin());

CREATE POLICY "Owners can update own owner profile"
  ON owner_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can insert owner profiles"
  ON owner_profiles FOR INSERT
  WITH CHECK (is_admin());

-- ── VILLAS ──

CREATE POLICY "Anyone can read active villas"
  ON villas FOR SELECT
  USING (status = 'active' OR owner_id = auth.uid() OR is_admin());

CREATE POLICY "Admins can insert villas"
  ON villas FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update villas"
  ON villas FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete villas"
  ON villas FOR DELETE
  USING (is_admin());

-- ── VILLA_PHOTOS ──

CREATE POLICY "Anyone can read photos of visible villas"
  ON villa_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM villas
      WHERE villas.id = villa_photos.villa_id
      AND (villas.status = 'active' OR villas.owner_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "Admins can manage photos"
  ON villa_photos FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ── BOOKINGS ──

CREATE POLICY "Renters can read own bookings"
  ON bookings FOR SELECT
  USING (
    renter_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM villas WHERE villas.id = bookings.villa_id AND villas.owner_id = auth.uid()
    )
    OR is_admin()
  );

CREATE POLICY "Renters can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (renter_id = auth.uid());

CREATE POLICY "Booking updates by owner, renter, or admin"
  ON bookings FOR UPDATE
  USING (
    renter_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM villas WHERE villas.id = bookings.villa_id AND villas.owner_id = auth.uid()
    )
    OR is_admin()
  );

-- ── BUMPS ──

CREATE POLICY "Read own bumps"
  ON bumps FOR SELECT
  USING (
    owner_id = auth.uid()
    OR renter_id = auth.uid()
    OR is_admin()
  );

CREATE POLICY "Owners can create bumps on their villas"
  ON bumps FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    OR is_admin()
  );

CREATE POLICY "Bump updates by admin or system"
  ON bumps FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR renter_id = auth.uid()
    OR is_admin()
  );

-- ── PAYMENTS ──

CREATE POLICY "Read payments for own bookings"
  ON payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings
      WHERE bookings.id = payments.booking_id
      AND (bookings.renter_id = auth.uid() OR EXISTS (
        SELECT 1 FROM villas WHERE villas.id = bookings.villa_id AND villas.owner_id = auth.uid()
      ))
    )
    OR is_admin()
  );

-- Payments are created by system (Edge Functions) via service role key
-- No INSERT policy for regular users

-- ── PAYOUTS ──

CREATE POLICY "Owners can read own payouts"
  ON payouts FOR SELECT
  USING (owner_id = auth.uid() OR is_admin());

-- Payouts created by system only

-- ── EXTERNAL_AVAILABILITY ──

CREATE POLICY "Owners can read own villa availability"
  ON external_availability FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM villas WHERE villas.id = external_availability.villa_id AND villas.owner_id = auth.uid()
    )
    OR is_admin()
  );

-- Sync job uses service role key — no INSERT/UPDATE/DELETE policies for users

-- ── NOTIFICATIONS ──

CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid() OR is_admin());

-- Notifications created by system only

-- ── EXCHANGE_RATES ──

CREATE POLICY "Anyone can read exchange rates"
  ON exchange_rates FOR SELECT
  USING (true);

-- Updated by system only

-- ────────────────────────────────────────────
-- STORAGE BUCKET
-- ────────────────────────────────────────────

-- Create storage bucket for villa photos (run separately if needed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('villa-photos', 'villa-photos', true);

-- ────────────────────────────────────────────
-- SEED DATA (development only)
-- ────────────────────────────────────────────

-- Note: Seed data should be inserted AFTER creating auth users.
-- Use Supabase dashboard to create test users first, then run:
--
-- 1. Create auth users via Supabase Auth dashboard:
--    - admin@bumpr.rent (set is_admin = true on profile after)
--    - owner@bumpr.rent
--    - renter@bumpr.rent
--
-- 2. Then run seed_data.sql with those user IDs

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================
