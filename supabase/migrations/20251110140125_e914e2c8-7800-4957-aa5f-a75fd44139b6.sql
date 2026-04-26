-- Create a secure function to delete a user and all their related data
-- This function must be called by an admin only
CREATE OR REPLACE FUNCTION public.admin_delete_user(
  target_user_id uuid,
  admin_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF NOT public.is_admin(admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can delete users';
  END IF;
  
  -- Prevent admin from deleting themselves
  IF target_user_id = admin_id THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;
  
  -- Check if target user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  -- Delete related records (in order to avoid foreign key constraints)
  -- These will cascade delete in most cases, but we'll be explicit
  DELETE FROM public.watchlist WHERE user_id = target_user_id;
  DELETE FROM public.portfolio_positions WHERE user_id = target_user_id;
  DELETE FROM public.trades WHERE user_id = target_user_id;
  DELETE FROM public.transactions WHERE user_id = target_user_id;
  DELETE FROM public.withdrawal_requests WHERE user_id = target_user_id;
  DELETE FROM public.deposit_requests WHERE user_id = target_user_id;
  DELETE FROM public.bank_accounts WHERE user_id = target_user_id;
  DELETE FROM public.kyc_documents WHERE user_id = target_user_id;
  DELETE FROM public.wallets WHERE user_id = target_user_id;
  DELETE FROM public.profiles WHERE id = target_user_id;
  
  -- Delete from auth.users (this is the main user record)
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RETURN TRUE;
END;
$$;