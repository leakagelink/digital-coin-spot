-- Add RLS policy for admins to read bank accounts for withdrawal processing
CREATE POLICY "Admins can view bank accounts for withdrawals" 
ON public.bank_accounts 
FOR SELECT 
USING (public.is_admin(auth.uid()));