
-- 1) Harden all SECURITY DEFINER functions by setting search_path to public

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND role = 'admin'
  );
$function$;

-- Approve deposit request
CREATE OR REPLACE FUNCTION public.approve_deposit_request(request_id uuid, admin_id uuid, notes text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  request_record RECORD;
BEGIN
  IF NOT public.is_admin(admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: User is not an admin';
  END IF;
  
  SELECT * INTO request_record 
  FROM public.deposit_requests 
  WHERE id = request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deposit request not found or already processed';
  END IF;
  
  UPDATE public.deposit_requests 
  SET 
    status = 'approved',
    approved_by = admin_id,
    admin_notes = notes,
    updated_at = now()
  WHERE id = request_id;
  
  UPDATE public.wallets 
  SET 
    balance = balance + request_record.amount,
    updated_at = now()
  WHERE user_id = request_record.user_id;
  
  INSERT INTO public.transactions (
    user_id, 
    transaction_type, 
    amount, 
    total_value,
    status
  ) VALUES (
    request_record.user_id,
    'deposit',
    request_record.amount,
    request_record.amount,
    'completed'
  );
  
  RETURN TRUE;
END;
$function$;

-- Approve withdrawal request
CREATE OR REPLACE FUNCTION public.approve_withdrawal_request(request_id uuid, admin_id uuid, notes text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  request_record RECORD;
  user_balance NUMERIC;
BEGIN
  IF NOT public.is_admin(admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: User is not an admin';
  END IF;
  
  SELECT * INTO request_record 
  FROM public.withdrawal_requests 
  WHERE id = request_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal request not found or already processed';
  END IF;
  
  SELECT balance INTO user_balance 
  FROM public.wallets 
  WHERE user_id = request_record.user_id;
  
  IF user_balance < request_record.amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  
  UPDATE public.withdrawal_requests 
  SET 
    status = 'approved',
    approved_by = admin_id,
    admin_notes = notes,
    updated_at = now()
  WHERE id = request_id;
  
  UPDATE public.wallets 
  SET 
    balance = balance - request_record.amount,
    updated_at = now()
  WHERE user_id = request_record.user_id;
  
  INSERT INTO public.transactions (
    user_id, 
    transaction_type, 
    amount, 
    total_value, 
    status
  ) VALUES (
    request_record.user_id,
    'withdrawal',
    request_record.amount,
    request_record.amount,
    'completed'
  );
  
  RETURN TRUE;
END;
$function$;

-- Reject request (deposit/withdrawal)
CREATE OR REPLACE FUNCTION public.reject_request(request_id uuid, request_type text, admin_id uuid, notes text DEFAULT NULL::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT public.is_admin(admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: User is not an admin';
  END IF;
  
  IF request_type = 'deposit' THEN
    UPDATE public.deposit_requests 
    SET 
      status = 'rejected',
      approved_by = admin_id,
      admin_notes = notes,
      updated_at = now()
    WHERE id = request_id AND status = 'pending';
  ELSIF request_type = 'withdrawal' THEN
    UPDATE public.withdrawal_requests 
    SET 
      status = 'rejected',
      approved_by = admin_id,
      admin_notes = notes,
      updated_at = now()
    WHERE id = request_id AND status = 'pending';
  ELSE
    RAISE EXCEPTION 'Invalid request type';
  END IF;
  
  RETURN TRUE;
END;
$function$;

-- Process deposit approval
CREATE OR REPLACE FUNCTION public.process_deposit_approval(deposit_id uuid, admin_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  ON CONFLICT (user_id)
  DO UPDATE SET 
    balance = wallets.balance + deposit_record.amount,
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

-- Process withdrawal approval
CREATE OR REPLACE FUNCTION public.process_withdrawal_approval(withdrawal_id uuid, admin_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  withdrawal_record RECORD;
  current_balance NUMERIC;
BEGIN
  IF NOT is_admin(admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can approve withdrawals';
  END IF;

  SELECT * INTO withdrawal_record 
  FROM withdrawal_requests 
  WHERE id = withdrawal_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal request not found or already processed';
  END IF;

  SELECT balance INTO current_balance 
  FROM wallets 
  WHERE user_id = withdrawal_record.user_id;
  
  IF current_balance < withdrawal_record.amount THEN
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

  UPDATE withdrawal_requests 
  SET 
    status = 'approved',
    approved_by = admin_id,
    processed_at = now(),
    wallet_updated = TRUE,
    updated_at = now()
  WHERE id = withdrawal_id;

  UPDATE wallets 
  SET 
    balance = balance - withdrawal_record.amount,
    updated_at = now()
  WHERE user_id = withdrawal_record.user_id;

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
$function$;

-- Admin add funds
CREATE OR REPLACE FUNCTION public.admin_add_funds(target_user_id uuid, amount numeric, admin_id uuid, notes text DEFAULT 'Admin credit'::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  ON CONFLICT (user_id)
  DO UPDATE SET 
    balance = wallets.balance + amount,
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

-- Handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  
  INSERT INTO public.wallets (user_id, balance, currency)
  VALUES (NEW.id, 0.00, 'INR');
  
  RETURN NEW;
END;
$function$;


-- 2) Restrict admin_settings SELECT to admins only, and provide a secure RPC for users

-- Remove broad read access
DROP POLICY IF EXISTS "Anyone authenticated can read admin settings" ON public.admin_settings;

-- Allow only admins to read the raw admin_settings table
CREATE POLICY "Admins can read admin settings"
  ON public.admin_settings
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- RPC that exposes only safe payment settings to all authenticated users
CREATE OR REPLACE FUNCTION public.get_public_admin_settings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  upi jsonb := '{}'::jsonb;
  bank jsonb := '{}'::jsonb;
  usdt jsonb := '{}'::jsonb;
  v jsonb;
BEGIN
  -- UPI details (safe for users)
  SELECT setting_value INTO v FROM admin_settings WHERE setting_key = 'upi_details' LIMIT 1;
  IF v IS NOT NULL THEN
    upi := jsonb_build_object(
      'upi_id', v->>'upi_id',
      'qr_code', v->>'qr_code',
      'instructions', COALESCE(v->'instructions', '[]'::jsonb)
    );
  END IF;

  -- Bank details (safe for deposits)
  SELECT setting_value INTO v FROM admin_settings WHERE setting_key = 'bank_details' LIMIT 1;
  IF v IS NOT NULL THEN
    bank := jsonb_build_object(
      'account_holder', v->>'account_holder',
      'bank_name', v->>'bank_name',
      'account_number', v->>'account_number',
      'ifsc', v->>'ifsc',
      'instructions', COALESCE(v->'instructions', '[]'::jsonb)
    );
  END IF;

  -- USDT details (safe)
  SELECT setting_value INTO v FROM admin_settings WHERE setting_key = 'usdt_details' LIMIT 1;
  IF v IS NOT NULL THEN
    usdt := jsonb_build_object(
      'wallet_address', v->>'wallet_address',
      'network', v->>'network',
      'instructions', COALESCE(v->'instructions', '[]'::jsonb)
    );
  END IF;

  RETURN jsonb_build_object(
    'upi_details', upi,
    'bank_details', bank,
    'usdt_details', usdt
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_admin_settings() TO authenticated;


-- 3) Prevent privilege escalation: block role changes by non-admin and allow admins to update profiles

-- Extra policy so admins can update any profile
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND policyname = 'Admins can update any profile'
  ) THEN
    CREATE POLICY "Admins can update any profile"
      ON public.profiles
      FOR UPDATE
      USING (public.is_admin(auth.uid()))
      WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END;
$$;

-- Trigger to prevent non-admin role changes
CREATE OR REPLACE FUNCTION public.prevent_non_admin_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT public.is_admin(auth.uid()) THEN
      RAISE EXCEPTION 'Not authorized to change user role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_non_admin_role_change ON public.profiles;
CREATE TRIGGER trg_prevent_non_admin_role_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_non_admin_role_change();


-- 4) Enforce non-null user_id going forward via validation triggers (no risk to existing data)

CREATE OR REPLACE FUNCTION public.enforce_user_id_not_null()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $trigger$
BEGIN
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'user_id cannot be null';
  END IF;
  RETURN NEW;
END;
$trigger$;

-- Apply to key user-owned tables
DROP TRIGGER IF EXISTS trg_enforce_user_id_not_null_wallets ON public.wallets;
CREATE TRIGGER trg_enforce_user_id_not_null_wallets
BEFORE INSERT OR UPDATE ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_not_null();

DROP TRIGGER IF EXISTS trg_enforce_user_id_not_null_watchlist ON public.watchlist;
CREATE TRIGGER trg_enforce_user_id_not_null_watchlist
BEFORE INSERT OR UPDATE ON public.watchlist
FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_not_null();

DROP TRIGGER IF EXISTS trg_enforce_user_id_not_null_positions ON public.portfolio_positions;
CREATE TRIGGER trg_enforce_user_id_not_null_positions
BEFORE INSERT OR UPDATE ON public.portfolio_positions
FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_not_null();

DROP TRIGGER IF EXISTS trg_enforce_user_id_not_null_transactions ON public.transactions;
CREATE TRIGGER trg_enforce_user_id_not_null_transactions
BEFORE INSERT OR UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_not_null();
