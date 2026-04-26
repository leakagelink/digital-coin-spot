
-- 1) Null user_id wallets hatao (constraints todti hain)
DELETE FROM public.wallets
WHERE user_id IS NULL;

-- 2) Duplicate wallets ko merge karo: har user ke liye sirf 1 row rahe (balance sum karke)
WITH ranked AS (
  SELECT 
    w.*,
    ROW_NUMBER() OVER (
      PARTITION BY user_id 
      ORDER BY COALESCE(updated_at, created_at) DESC NULLS LAST, id
    ) AS rn,
    SUM(balance) OVER (PARTITION BY user_id) AS total_balance
  FROM public.wallets w
  WHERE user_id IS NOT NULL
),
upd AS (
  -- Jinke duplicates hain unke "keep" row me total_balance set karo
  UPDATE public.wallets w
  SET 
    balance = r.total_balance,
    currency = COALESCE(w.currency, 'INR'),
    updated_at = now()
  FROM ranked r
  WHERE w.id = r.id 
    AND r.rn = 1 
    AND EXISTS (SELECT 1 FROM ranked r2 WHERE r2.user_id = r.user_id AND r2.rn > 1)
  RETURNING w.id
)
-- Baaki duplicate rows delete
DELETE FROM public.wallets w
USING ranked r
WHERE w.id = r.id
  AND r.rn > 1;

-- 3) Jahan currency NULL ho, INR set karo (consistency)
UPDATE public.wallets
SET currency = 'INR'
WHERE currency IS NULL;

-- 4) wallets.user_id par UNIQUE constraint add karo (ON CONFLICT ke liye zaroori)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint
    WHERE conrelid = 'public.wallets'::regclass
      AND conname = 'wallets_user_id_unique'
  ) THEN
    ALTER TABLE public.wallets
      ADD CONSTRAINT wallets_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- 5) wallets.user_id ko NOT NULL enforce karo
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wallets'
      AND column_name = 'user_id'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE public.wallets
      ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- 6) admin_add_funds ko ON CONFLICT ON CONSTRAINT use karne ke liye recreate karo
CREATE OR REPLACE FUNCTION public.admin_add_funds(
  target_user_id uuid,
  amount numeric,
  admin_id uuid,
  notes text DEFAULT 'Admin credit'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin(admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: User is not an admin';
  END IF;
  
  IF amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;
  
  INSERT INTO public.wallets (user_id, balance, currency, updated_at)
  VALUES (target_user_id, amount, 'INR', now())
  ON CONFLICT ON CONSTRAINT wallets_user_id_unique
  DO UPDATE SET 
    balance = public.wallets.balance + EXCLUDED.balance,
    updated_at = now();
  
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
$function$;

-- 7) process_deposit_approval bhi same tareeke se update karo
CREATE OR REPLACE FUNCTION public.process_deposit_approval(deposit_id uuid, admin_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deposit_record RECORD;
BEGIN
  IF NOT is_admin(admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can approve deposits';
  END IF;

  SELECT * INTO deposit_record 
  FROM deposit_requests 
  WHERE id = deposit_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deposit request not found or already processed';
  END IF;

  UPDATE deposit_requests 
  SET 
    status = 'approved',
    approved_by = admin_id,
    processed_at = now(),
    wallet_updated = TRUE,
    updated_at = now()
  WHERE id = deposit_id;

  INSERT INTO wallets (user_id, balance, currency, updated_at)
  VALUES (deposit_record.user_id, deposit_record.amount, 'INR', now())
  ON CONFLICT ON CONSTRAINT wallets_user_id_unique
  DO UPDATE SET 
    balance = wallets.balance + EXCLUDED.balance,
    updated_at = now();

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
$function$;

-- 8) Sanity checks
-- a) Har user ke liye ek hi wallet?
SELECT 
  COUNT(*) AS total_wallet_rows, 
  COUNT(DISTINCT user_id) AS distinct_users
FROM public.wallets;

-- b) Koi null currency baaki to nahi?
SELECT COUNT(*) AS null_currency_rows
FROM public.wallets
WHERE currency IS NULL;

-- c) Constraint confirm
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'public.wallets'::regclass
  AND conname = 'wallets_user_id_unique';
