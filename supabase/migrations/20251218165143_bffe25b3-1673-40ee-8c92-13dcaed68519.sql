-- Add missing columns to portfolio_positions
ALTER TABLE public.portfolio_positions 
ADD COLUMN IF NOT EXISTS position_type text DEFAULT 'long',
ADD COLUMN IF NOT EXISTS status text DEFAULT 'open';

-- Create admin_delete_user function
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id uuid, admin_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin has admin role
  IF NOT public.has_role(admin_id, 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin role required');
  END IF;

  -- Prevent self-deletion
  IF target_user_id = admin_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot delete yourself');
  END IF;

  -- Delete in order respecting foreign key constraints
  DELETE FROM public.watchlist WHERE user_id = target_user_id;
  DELETE FROM public.portfolio_positions WHERE user_id = target_user_id;
  DELETE FROM public.trades WHERE user_id = target_user_id;
  DELETE FROM public.transactions WHERE user_id = target_user_id;
  DELETE FROM public.withdrawal_requests WHERE user_id = target_user_id;
  DELETE FROM public.deposit_requests WHERE user_id = target_user_id;
  DELETE FROM public.bank_accounts WHERE user_id = target_user_id;
  DELETE FROM public.kyc_documents WHERE user_id = target_user_id;
  DELETE FROM public.wallets WHERE user_id = target_user_id;
  DELETE FROM public.user_roles WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Create reject_request function
CREATE OR REPLACE FUNCTION public.reject_request(
  request_id uuid,
  request_type text,
  admin_id uuid,
  notes text DEFAULT 'Rejected by admin'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin has admin role
  IF NOT public.has_role(admin_id, 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin role required');
  END IF;

  IF request_type = 'withdrawal' THEN
    UPDATE public.withdrawal_requests
    SET status = 'rejected',
        admin_notes = notes,
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = request_id AND status = 'pending';
  ELSIF request_type = 'deposit' THEN
    UPDATE public.deposit_requests
    SET status = 'rejected',
        admin_notes = notes,
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = request_id AND status = 'pending';
  ELSE
    RETURN json_build_object('success', false, 'error', 'Invalid request type');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

-- Create get_public_admin_settings function
CREATE OR REPLACE FUNCTION public.get_public_admin_settings()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'upi_details', (SELECT setting_value FROM admin_settings WHERE setting_key = 'upi_details'),
    'bank_details', (SELECT setting_value FROM admin_settings WHERE setting_key = 'bank_details'),
    'usdt_details', (SELECT setting_value FROM admin_settings WHERE setting_key = 'usdt_details')
  );
$$;

-- Add admin delete policy for positions (admins can delete any position)
DROP POLICY IF EXISTS "Admins can delete all positions" ON public.portfolio_positions;
CREATE POLICY "Admins can delete all positions" 
ON public.portfolio_positions 
FOR DELETE 
USING (is_admin());

-- Add admin delete policies for other tables needed for user deletion
DROP POLICY IF EXISTS "Admins can delete trades" ON public.trades;
CREATE POLICY "Admins can delete trades" 
ON public.trades 
FOR DELETE 
USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete transactions" ON public.transactions;
CREATE POLICY "Admins can delete transactions" 
ON public.transactions 
FOR DELETE 
USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete deposits" ON public.deposit_requests;
CREATE POLICY "Admins can delete deposits" 
ON public.deposit_requests 
FOR DELETE 
USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete withdrawals" ON public.withdrawal_requests;
CREATE POLICY "Admins can delete withdrawals" 
ON public.withdrawal_requests 
FOR DELETE 
USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete kyc" ON public.kyc_documents;
CREATE POLICY "Admins can delete kyc" 
ON public.kyc_documents 
FOR DELETE 
USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete wallets" ON public.wallets;
CREATE POLICY "Admins can delete wallets" 
ON public.wallets 
FOR DELETE 
USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete bank accounts" ON public.bank_accounts;
CREATE POLICY "Admins can delete bank accounts" 
ON public.bank_accounts 
FOR DELETE 
USING (is_admin());