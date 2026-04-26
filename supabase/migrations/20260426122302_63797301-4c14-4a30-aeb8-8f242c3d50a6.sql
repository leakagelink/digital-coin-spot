-- Create storage bucket for APK app downloads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'app-downloads',
  'app-downloads',
  true,
  104857600, -- 100MB
  ARRAY['application/vnd.android.package-archive', 'application/octet-stream']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['application/vnd.android.package-archive', 'application/octet-stream'];

-- Public read access (anyone can download the APK)
CREATE POLICY "Public can download APK"
ON storage.objects
FOR SELECT
USING (bucket_id = 'app-downloads');

-- Only admins can upload APK
CREATE POLICY "Admins can upload APK"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'app-downloads'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Only admins can update APK
CREATE POLICY "Admins can update APK"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'app-downloads'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

-- Only admins can delete APK
CREATE POLICY "Admins can delete APK"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'app-downloads'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);