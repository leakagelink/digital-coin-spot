-- Create uploads bucket for storing payment QR codes and other uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('uploads', 'uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for authenticated users to upload files
CREATE POLICY "Admins can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads' AND
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create policy for public access to view files
CREATE POLICY "Public can view uploaded files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'uploads');

-- Create policy for admins to update files
CREATE POLICY "Admins can update files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'uploads' AND
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Create policy for admins to delete files
CREATE POLICY "Admins can delete files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'uploads' AND
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);