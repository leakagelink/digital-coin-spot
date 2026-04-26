
-- Create Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.kyc_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.request_status AS ENUM ('pending', 'approved', 'rejected');

-- Profiles Table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  mobile_number TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User Roles Table (Security-critical)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Wallets Table
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  balance DECIMAL(20, 2) DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Portfolio Positions Table
CREATE TABLE public.portfolio_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  coin_name TEXT NOT NULL,
  amount DECIMAL(20, 8) NOT NULL,
  buy_price DECIMAL(20, 2) NOT NULL,
  current_price DECIMAL(20, 2),
  total_investment DECIMAL(20, 2),
  current_value DECIMAL(20, 2),
  pnl DECIMAL(20, 2) DEFAULT 0,
  pnl_percentage DECIMAL(10, 4) DEFAULT 0,
  admin_adjustment_pct DECIMAL(10, 4) DEFAULT 0,
  admin_price_override BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.portfolio_positions ENABLE ROW LEVEL SECURITY;

-- Trades Table
CREATE TABLE public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  coin_name TEXT,
  trade_type TEXT NOT NULL,
  quantity DECIMAL(20, 8) NOT NULL,
  price DECIMAL(20, 2) NOT NULL,
  total_amount DECIMAL(20, 2) NOT NULL,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Watchlist Table
CREATE TABLE public.watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  coin_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;

-- Transactions Table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  transaction_type TEXT NOT NULL,
  amount DECIMAL(20, 2) NOT NULL,
  description TEXT,
  reference_id TEXT,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Bank Accounts Table
CREATE TABLE public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  account_number TEXT NOT NULL,
  account_holder_name TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  ifsc_code TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- KYC Documents Table
CREATE TABLE public.kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  aadhar_front_url TEXT,
  aadhar_back_url TEXT,
  pan_card_url TEXT,
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

-- Deposit Requests Table
CREATE TABLE public.deposit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(20, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  transaction_reference TEXT,
  status TEXT DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  admin_notes TEXT,
  wallet_updated BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.deposit_requests ENABLE ROW LEVEL SECURITY;

-- Withdrawal Requests Table
CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(20, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  upi_id TEXT,
  usdt_address TEXT,
  status TEXT DEFAULT 'pending',
  approved_by UUID REFERENCES auth.users(id),
  admin_notes TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Admin Settings Table
CREATE TABLE public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Security Definer Function: has_role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Security Definer Function: is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Handle New User Trigger Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, mobile_number)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'display_name'),
    NEW.raw_user_meta_data->>'mobile_number'
  );
  
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0);
  
  RETURN NEW;
END;
$$;

-- Create Trigger for New Users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update Timestamp Function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add Update Triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON public.portfolio_positions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_kyc_updated_at BEFORE UPDATE ON public.kyc_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_deposit_updated_at BEFORE UPDATE ON public.deposit_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_withdrawal_updated_at BEFORE UPDATE ON public.withdrawal_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_admin_settings_updated_at BEFORE UPDATE ON public.admin_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies: Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.is_admin());

-- RLS Policies: User Roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.is_admin());

-- RLS Policies: Wallets
CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own wallet" ON public.wallets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all wallets" ON public.wallets FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can update all wallets" ON public.wallets FOR UPDATE USING (public.is_admin());

-- RLS Policies: Portfolio Positions
CREATE POLICY "Users can view own positions" ON public.portfolio_positions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own positions" ON public.portfolio_positions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own positions" ON public.portfolio_positions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own positions" ON public.portfolio_positions FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all positions" ON public.portfolio_positions FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can update all positions" ON public.portfolio_positions FOR UPDATE USING (public.is_admin());

-- RLS Policies: Trades
CREATE POLICY "Users can view own trades" ON public.trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trades" ON public.trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all trades" ON public.trades FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can insert trades" ON public.trades FOR INSERT WITH CHECK (public.is_admin());

-- RLS Policies: Watchlist
CREATE POLICY "Users can view own watchlist" ON public.watchlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own watchlist" ON public.watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own watchlist" ON public.watchlist FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: Transactions
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all transactions" ON public.transactions FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can insert transactions" ON public.transactions FOR INSERT WITH CHECK (public.is_admin());

-- RLS Policies: Bank Accounts
CREATE POLICY "Users can view own bank accounts" ON public.bank_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bank accounts" ON public.bank_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bank accounts" ON public.bank_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own bank accounts" ON public.bank_accounts FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies: KYC Documents
CREATE POLICY "Users can view own kyc" ON public.kyc_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own kyc" ON public.kyc_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own kyc" ON public.kyc_documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all kyc" ON public.kyc_documents FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can update all kyc" ON public.kyc_documents FOR UPDATE USING (public.is_admin());

-- RLS Policies: Deposit Requests
CREATE POLICY "Users can view own deposits" ON public.deposit_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own deposits" ON public.deposit_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all deposits" ON public.deposit_requests FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can update all deposits" ON public.deposit_requests FOR UPDATE USING (public.is_admin());

-- RLS Policies: Withdrawal Requests
CREATE POLICY "Users can view own withdrawals" ON public.withdrawal_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own withdrawals" ON public.withdrawal_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all withdrawals" ON public.withdrawal_requests FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can update all withdrawals" ON public.withdrawal_requests FOR UPDATE USING (public.is_admin());

-- RLS Policies: Admin Settings
CREATE POLICY "Anyone can view admin settings" ON public.admin_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage admin settings" ON public.admin_settings FOR ALL USING (public.is_admin());

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE portfolio_positions;
ALTER PUBLICATION supabase_realtime ADD TABLE trades;

-- Create KYC Documents Storage Bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false);

-- Storage Policies for KYC Documents
CREATE POLICY "Users can upload own kyc documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own kyc documents" ON storage.objects FOR SELECT USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins can view all kyc documents" ON storage.objects FOR SELECT USING (bucket_id = 'kyc-documents' AND public.is_admin());

-- Process Deposit Approval Function
CREATE OR REPLACE FUNCTION public.process_deposit_approval(deposit_id UUID, admin_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deposit RECORD;
  v_new_balance DECIMAL;
BEGIN
  SELECT * INTO v_deposit FROM deposit_requests WHERE id = deposit_id AND status = 'pending';
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Deposit not found or already processed');
  END IF;
  
  UPDATE wallets SET balance = balance + v_deposit.amount, updated_at = NOW()
  WHERE user_id = v_deposit.user_id
  RETURNING balance INTO v_new_balance;
  
  UPDATE deposit_requests SET 
    status = 'approved', 
    approved_by = admin_id, 
    wallet_updated = true, 
    processed_at = NOW(), 
    updated_at = NOW()
  WHERE id = deposit_id;
  
  INSERT INTO transactions (user_id, transaction_type, amount, description, reference_id)
  VALUES (v_deposit.user_id, 'deposit', v_deposit.amount, 'Deposit approved', deposit_id::text);
  
  RETURN json_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;

-- Process Withdrawal Approval Function
CREATE OR REPLACE FUNCTION public.process_withdrawal_approval(withdrawal_id UUID, admin_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_withdrawal RECORD;
  v_new_balance DECIMAL;
BEGIN
  SELECT * INTO v_withdrawal FROM withdrawal_requests WHERE id = withdrawal_id AND status = 'pending';
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Withdrawal not found or already processed');
  END IF;
  
  UPDATE wallets SET balance = balance - v_withdrawal.amount, updated_at = NOW()
  WHERE user_id = v_withdrawal.user_id
  RETURNING balance INTO v_new_balance;
  
  UPDATE withdrawal_requests SET 
    status = 'approved', 
    approved_by = admin_id, 
    processed_at = NOW(), 
    updated_at = NOW()
  WHERE id = withdrawal_id;
  
  INSERT INTO transactions (user_id, transaction_type, amount, description, reference_id)
  VALUES (v_withdrawal.user_id, 'withdrawal', v_withdrawal.amount, 'Withdrawal approved', withdrawal_id::text);
  
  RETURN json_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;
