-- Saved Villas feature: allow renters to save/unsave villas

CREATE TABLE IF NOT EXISTS saved_villas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  villa_id UUID NOT NULL REFERENCES villas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, villa_id)
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_saved_villas_user_id ON saved_villas (user_id);

-- Index for checking if a specific villa is saved
CREATE INDEX IF NOT EXISTS idx_saved_villas_user_villa ON saved_villas (user_id, villa_id);

-- Enable RLS
ALTER TABLE saved_villas ENABLE ROW LEVEL SECURITY;

-- Users can only read their own saved villas
CREATE POLICY "Users can view own saved villas"
  ON saved_villas FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only save villas for themselves
CREATE POLICY "Users can save villas"
  ON saved_villas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only unsave their own saved villas
CREATE POLICY "Users can unsave own villas"
  ON saved_villas FOR DELETE
  USING (auth.uid() = user_id);
