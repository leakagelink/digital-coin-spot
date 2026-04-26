-- Create storage bucket for app downloads
INSERT INTO storage.buckets (id, name, public) VALUES ('app-downloads', 'app-downloads', false);

-- Create policy for admin uploads
CREATE POLICY "Admins can upload app files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'app-downloads' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Create policy for admin updates
CREATE POLICY "Admins can update app files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'app-downloads' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Create policy for admin deletions
CREATE POLICY "Admins can delete app files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'app-downloads' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

-- Create policy for authenticated users to download app files
CREATE POLICY "Authenticated users can download app files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'app-downloads' 
  AND auth.role() = 'authenticated'
);