-- Add missing INSERT policy for admins on portfolio_positions
CREATE POLICY "Admins can insert positions" 
ON public.portfolio_positions 
FOR INSERT 
WITH CHECK (is_admin());