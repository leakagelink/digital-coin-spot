
-- First, let's create a function to check if a user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND role = 'admin'
  );
$$;

-- Create admin panel views table
CREATE TABLE IF NOT EXISTS admin_panel_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id),
  view_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on admin panel views
ALTER TABLE admin_panel_views ENABLE ROW LEVEL SECURITY;

-- Policy for admin panel views
CREATE POLICY "Only admins can access admin panel views"
ON admin_panel_views
FOR ALL
USING (is_admin(auth.uid()));

-- Update deposit_requests table to handle approval workflow
ALTER TABLE deposit_requests 
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS wallet_updated BOOLEAN DEFAULT FALSE;

-- Update withdrawal_requests table to handle approval workflow  
ALTER TABLE withdrawal_requests
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS wallet_updated BOOLEAN DEFAULT FALSE;

-- Create function to process deposit approval
CREATE OR REPLACE FUNCTION process_deposit_approval(
  deposit_id UUID,
  admin_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deposit_record RECORD;
  wallet_record RECORD;
BEGIN
  -- Check if admin
  IF NOT is_admin(admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can approve deposits';
  END IF;

  -- Get deposit record
  SELECT * INTO deposit_record 
  FROM deposit_requests 
  WHERE id = deposit_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deposit request not found or already processed';
  END IF;

  -- Update deposit request
  UPDATE deposit_requests 
  SET 
    status = 'approved',
    approved_by = admin_id,
    processed_at = now(),
    wallet_updated = TRUE,
    updated_at = now()
  WHERE id = deposit_id;

  -- Update or create wallet
  INSERT INTO wallets (user_id, balance, currency, updated_at)
  VALUES (deposit_record.user_id, deposit_record.amount, 'INR', now())
  ON CONFLICT (user_id)
  DO UPDATE SET 
    balance = wallets.balance + deposit_record.amount,
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
    deposit_record.user_id,
    'deposit',
    deposit_record.amount,
    deposit_record.amount,
    'completed',
    now()
  );

  RETURN TRUE;
END;
$$;

-- Create function to process withdrawal approval
CREATE OR REPLACE FUNCTION process_withdrawal_approval(
  withdrawal_id UUID,
  admin_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  withdrawal_record RECORD;
  current_balance NUMERIC;
BEGIN
  -- Check if admin
  IF NOT is_admin(admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can approve withdrawals';
  END IF;

  -- Get withdrawal record
  SELECT * INTO withdrawal_record 
  FROM withdrawal_requests 
  WHERE id = withdrawal_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal request not found or already processed';
  END IF;

  -- Check current balance
  SELECT balance INTO current_balance 
  FROM wallets 
  WHERE user_id = withdrawal_record.user_id;
  
  IF current_balance < withdrawal_record.amount THEN
    -- Update withdrawal as rejected
    UPDATE withdrawal_requests 
    SET 
      status = 'rejected',
      admin_notes = 'Insufficient balance',
      approved_by = admin_id,
      processed_at = now(),
      updated_at = now()
    WHERE id = withdrawal_id;
    
    RAISE EXCEPTION 'Insufficient balance for withdrawal';
  END IF;

  -- Update withdrawal request
  UPDATE withdrawal_requests 
  SET 
    status = 'approved',
    approved_by = admin_id,
    processed_at = now(),
    wallet_updated = TRUE,
    updated_at = now()
  WHERE id = withdrawal_id;

  -- Update wallet balance
  UPDATE wallets 
  SET 
    balance = balance - withdrawal_record.amount,
    updated_at = now()
  WHERE user_id = withdrawal_record.user_id;

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
    withdrawal_record.user_id,
    'withdrawal',
    withdrawal_record.amount,
    withdrawal_record.amount,
    'completed',
    now()
  );

  RETURN TRUE;
END;
$$;

-- Create an admin user (you'll need to sign up with this email first)
-- The admin credentials will be:
-- Email: admin@cryptoexchange.com
-- Password: Admin123!@#
-- After signup, we'll update their role to admin

-- Note: You need to manually sign up with admin@cryptoexchange.com first, 
-- then we'll update the role in the next step
