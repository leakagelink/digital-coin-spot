-- Add locked_balance column to wallets table
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS locked_balance numeric DEFAULT 0;

-- Create quick_deposits table
CREATE TABLE public.quick_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'locked',
  created_at timestamp with time zone DEFAULT now(),
  approved_at timestamp with time zone,
  approved_by UUID,
  admin_notes text
);

-- Enable RLS
ALTER TABLE public.quick_deposits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quick_deposits
CREATE POLICY "Users can view own quick deposits" 
ON public.quick_deposits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quick deposits" 
ON public.quick_deposits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all quick deposits" 
ON public.quick_deposits 
FOR SELECT 
USING (is_admin());

CREATE POLICY "Admins can update all quick deposits" 
ON public.quick_deposits 
FOR UPDATE 
USING (is_admin());

CREATE POLICY "Admins can delete quick deposits" 
ON public.quick_deposits 
FOR DELETE 
USING (is_admin());

-- Create function to process quick deposit approval
CREATE OR REPLACE FUNCTION public.process_quick_deposit_approval(quick_deposit_id uuid, admin_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deposit RECORD;
  v_new_balance DECIMAL;
  v_new_locked DECIMAL;
BEGIN
  -- Get the quick deposit
  SELECT * INTO v_deposit FROM quick_deposits WHERE id = quick_deposit_id AND status = 'locked';
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Quick deposit not found or already processed');
  END IF;
  
  -- Move from locked to available balance
  UPDATE wallets 
  SET balance = balance + v_deposit.amount, 
      locked_balance = locked_balance - v_deposit.amount, 
      updated_at = NOW()
  WHERE user_id = v_deposit.user_id
  RETURNING balance, locked_balance INTO v_new_balance, v_new_locked;
  
  -- Update quick deposit status
  UPDATE quick_deposits SET 
    status = 'approved', 
    approved_by = admin_id, 
    approved_at = NOW()
  WHERE id = quick_deposit_id;
  
  -- Create transaction record
  INSERT INTO transactions (user_id, transaction_type, amount, description, reference_id)
  VALUES (v_deposit.user_id, 'quick_deposit', v_deposit.amount, 'Quick Deposit approved', quick_deposit_id::text);
  
  RETURN json_build_object('success', true, 'new_balance', v_new_balance, 'new_locked', v_new_locked);
END;
$$;

-- Create function to reject quick deposit
CREATE OR REPLACE FUNCTION public.reject_quick_deposit(quick_deposit_id uuid, admin_id uuid, notes text DEFAULT 'Rejected by admin')
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_deposit RECORD;
  v_new_locked DECIMAL;
BEGIN
  -- Get the quick deposit
  SELECT * INTO v_deposit FROM quick_deposits WHERE id = quick_deposit_id AND status = 'locked';
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Quick deposit not found or already processed');
  END IF;
  
  -- Remove locked balance
  UPDATE wallets 
  SET locked_balance = locked_balance - v_deposit.amount, 
      updated_at = NOW()
  WHERE user_id = v_deposit.user_id
  RETURNING locked_balance INTO v_new_locked;
  
  -- Update quick deposit status
  UPDATE quick_deposits SET 
    status = 'rejected', 
    approved_by = admin_id,
    approved_at = NOW(),
    admin_notes = notes
  WHERE id = quick_deposit_id;
  
  RETURN json_build_object('success', true, 'new_locked', v_new_locked);
END;
$$;