
-- 1) किसी भी null user_id वॉलेट को हटा दें (RLS/logic के लिए बेकार rows)
DELETE FROM public.wallets
WHERE user_id IS NULL;

-- 2) डुप्लिकेट wallets को मर्ज करें: एक user के लिए एक ही वॉलेट रखेंगे
WITH dups AS (
  SELECT 
    user_id,
    MIN(id) AS keep_id,               -- रखने वाला row
    SUM(balance) AS total_balance,    -- सभी balances का योग
    COUNT(*) AS cnt
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

-- 3) currency null हो तो 'INR' कर दें
UPDATE public.wallets
SET currency = 'INR'
WHERE currency IS NULL;

-- 4) user_id को unique बनाएं (ON CONFLICT (user_id) के लिए ज़रूरी)
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

-- 5) user_id को NOT NULL करें (डेटा पहले ही साफ कर दिया गया है)
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
