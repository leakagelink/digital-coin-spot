
-- First, fix the handle_new_user function to ensure zero balance
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
  
  -- Create initial wallet with ZERO balance (not 12345.67)
  INSERT INTO public.wallets (user_id, balance, currency)
  VALUES (NEW.id, 0.00, 'INR');
  
  RETURN NEW;
END;
$$;

-- Create admin_settings table for storing payment method details
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on admin_settings
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage admin settings
CREATE POLICY "Only admins can manage admin settings" 
ON public.admin_settings 
FOR ALL 
USING (is_admin(auth.uid()));

-- Insert default payment method settings
INSERT INTO public.admin_settings (setting_key, setting_value) 
VALUES 
  ('upi_details', '{"upi_id": "admin@paytm", "qr_code": "", "instructions": "Pay to this UPI ID"}'),
  ('bank_details', '{"account_number": "1234567890", "ifsc": "SBIN0001234", "account_holder": "Company Name", "bank_name": "State Bank of India"}'),
  ('usdt_details', '{"wallet_address": "TXXXxxxXXXxxxXXX", "network": "TRC20", "instructions": "Send only USDT TRC20 to this address"}')
ON CONFLICT (setting_key) DO NOTHING;

-- Fix the admin_add_funds function to ensure it works properly
CREATE OR REPLACE FUNCTION public.admin_add_funds(target_user_id uuid, amount numeric, admin_id uuid, notes text DEFAULT 'Admin credit')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
  
  -- Update or create wallet (ensure wallet exists)
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
    'admin_credit',
    amount,
    amount,
    'completed',
    now()
  );
  
  RETURN TRUE;
END;
$$;

-- Update all existing wallets to have zero balance (if they have the incorrect 12345.67)
UPDATE public.wallets 
SET balance = 0.00, updated_at = now() 
WHERE balance = 12345.67;
