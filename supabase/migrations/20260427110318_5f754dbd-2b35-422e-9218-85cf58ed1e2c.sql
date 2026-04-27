CREATE OR REPLACE FUNCTION public.admin_add_funds(
  target_user_id uuid,
  amount numeric,
  admin_id uuid,
  notes text DEFAULT 'Admin credit'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance numeric;
BEGIN
  -- Verify caller is admin
  IF NOT public.has_role(admin_id, 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'Unauthorized: Admin role required');
  END IF;

  -- Validate amount
  IF amount IS NULL OR amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid amount');
  END IF;

  -- Ensure wallet exists for target user
  INSERT INTO public.wallets (user_id, balance)
  VALUES (target_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  -- Update wallet balance
  UPDATE public.wallets
  SET balance = COALESCE(balance, 0) + amount,
      updated_at = NOW()
  WHERE user_id = target_user_id
  RETURNING balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Wallet update failed');
  END IF;

  -- Insert transaction record
  INSERT INTO public.transactions (user_id, transaction_type, amount, description, status)
  VALUES (target_user_id, 'admin_credit', amount, COALESCE(notes, 'Admin credit'), 'completed');

  RETURN json_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;

-- Ensure wallets.user_id has a unique constraint for ON CONFLICT to work
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'wallets_user_id_key' AND conrelid = 'public.wallets'::regclass
  ) THEN
    BEGIN
      ALTER TABLE public.wallets ADD CONSTRAINT wallets_user_id_key UNIQUE (user_id);
    EXCEPTION WHEN duplicate_table OR duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;