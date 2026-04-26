
-- Create admin_add_funds function for admins to directly add funds to user accounts
CREATE OR REPLACE FUNCTION public.admin_add_funds(
  target_user_id uuid,
  amount numeric,
  admin_id uuid,
  notes text DEFAULT 'Admin credit'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Check if user is admin
  IF NOT public.is_admin(admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: User is not an admin';
  END IF;
  
  -- Validate amount
  IF amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  
  -- Check if target user exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;
  
  -- Update or create wallet
  INSERT INTO public.wallets (user_id, balance, currency, updated_at)
  VALUES (target_user_id, amount, 'INR', now())
  ON CONFLICT (user_id)
  DO UPDATE SET 
    balance = wallets.balance + amount,
    updated_at = now();
  
  -- Create transaction record
  INSERT INTO public.transactions (
    user_id, 
    transaction_type, 
    amount, 
    total_value,
    status,
    created_at
  ) VALUES (
    target_user_id,
    'deposit',
    amount,
    amount,
    'completed',
    now()
  );
  
  RETURN TRUE;
END;
$function$;
