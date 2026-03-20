INSERT INTO storage.buckets (id, name, public) VALUES ('villa-photos', 'villa-photos', true);

CREATE POLICY "Anyone can read villa photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'villa-photos');

CREATE POLICY "Admins can upload villa photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'villa-photos' AND (
    SELECT is_admin FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Admins can delete villa photos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'villa-photos' AND (
    SELECT is_admin FROM profiles WHERE id = auth.uid()
  ));
