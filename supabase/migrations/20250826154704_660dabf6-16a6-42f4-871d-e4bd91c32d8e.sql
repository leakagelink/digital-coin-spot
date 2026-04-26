
-- Fix the new user wallet creation to start with 0 balance instead of 100000
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  
  -- Create initial wallet with 0 balance (not 100000)
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0.00);
  
  RETURN NEW;
END;
$$;

-- Create a view for admin to see all users data
CREATE OR REPLACE VIEW admin_users_overview AS
SELECT 
  p.id,
  p.email,
  p.display_name,
  p.role,
  p.created_at as registered_at,
  COALESCE(w.balance, 0) as wallet_balance,
  w.currency,
  w.updated_at as wallet_last_updated
FROM profiles p
LEFT JOIN wallets w ON p.id = w.user_id
ORDER BY p.created_at DESC;

-- Grant access to admin users only
GRANT SELECT ON admin_users_overview TO authenticated;

-- Create RLS policy for the view
CREATE POLICY "Admins can view all users overview" 
ON admin_users_overview 
FOR SELECT 
TO authenticated
USING (is_admin(auth.uid()));

-- Create function to add funds to any user (admin only)
CREATE OR REPLACE FUNCTION public.admin_add_funds(
  target_user_id uuid,
  amount numeric,
  admin_id uuid,
  notes text DEFAULT 'Admin credit'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin
  IF NOT public.is_admin(admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can add funds';
  END IF;

  -- Check if amount is positive
  IF amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Update or create wallet
  INSERT INTO wallets (user_id, balance, currency, updated_at)
  VALUES (target_user_id, amount, 'INR', now())
  ON CONFLICT (user_id)
  DO UPDATE SET 
    balance = wallets.balance + amount,
    updated_at = now();

  -- Create transaction record
  INSERT INTO transactions (
    user_id, 
    transaction_type, 
    amount, 
    total_value, 
    status, 
    created_at
  )
  VALUES (
    target_user_id,
    'admin_credit',
    amount,
    amount,
    'completed',
    now()
  );

  RETURN TRUE;
END;
$$;
