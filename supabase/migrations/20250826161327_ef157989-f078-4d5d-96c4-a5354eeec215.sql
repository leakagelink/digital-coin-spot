
-- Relax admin_settings RLS: allow all authenticated users to SELECT; only admins can modify

-- Drop the overly restrictive policy that applied to ALL commands
DROP POLICY IF EXISTS "Only admins can manage admin settings" ON public.admin_settings;

-- Allow everyone who's authenticated to read settings (needed for deposit UI)
CREATE POLICY "Anyone authenticated can read admin settings"
ON public.admin_settings
FOR SELECT
TO authenticated
USING (true);

-- Only admins can INSERT
CREATE POLICY "Admins can insert admin settings"
ON public.admin_settings
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

-- Only admins can UPDATE
CREATE POLICY "Admins can update admin settings"
ON public.admin_settings
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Only admins can DELETE
CREATE POLICY "Admins can delete admin settings"
ON public.admin_settings
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));
