
-- 1) Null user_id wallets hatao (ye rows bekaar hain aur constraints todti hain)
DELETE FROM public.wallets
WHERE user_id IS NULL;

-- 2) Duplicate wallets ko merge karo: har user ke liye sirf 1 row rahe
WITH dups AS (
  SELECT 
    user_id,
    MIN(id) AS keep_id,
    SUM(balance) AS total_balance
  FROM public.wallets
  WHERE user_id IS NOT NULL
  GROUP BY user_id
  HAVING COUNT(*) > 1
),
update_keep AS (
  UPDATE public.wallets w
  SET 
    balance = d.total_balance,
    currency = COALESCE(w.currency, 'INR'),
    updated_at = now()
  FROM dups d
  WHERE w.id = d.keep_id
  RETURNING w.id
)
DELETE FROM public.wallets w
USING dups d
WHERE w.user_id = d.user_id
  AND w.id <> d.keep_id;

-- 3) Jahan currency null ho, INR set karo (consistency)
UPDATE public.wallets
SET currency = 'INR'
WHERE currency IS NULL;

-- 4) wallets.user_id par UNIQUE constraint add karo (ON CONFLICT (user_id) ke liye zaroori)
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

-- 6) Sanity checks
-- a) Har user ke liye ek hi wallet bacha?
SELECT 
  COUNT(*) AS total_wallet_rows, 
  COUNT(DISTINCT user_id) AS distinct_users
FROM public.wallets;

-- b) Koi null currency baaki to nahi?
SELECT COUNT(*) AS null_currency_rows
FROM public.wallets
WHERE currency IS NULL;
