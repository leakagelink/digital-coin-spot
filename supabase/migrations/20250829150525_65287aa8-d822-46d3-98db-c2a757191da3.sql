
-- Enable email confirmations and create necessary policies
-- First, let's make sure we have proper triggers for user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only create profile if user is confirmed (has verified email)
  IF NEW.email_confirmed_at IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, display_name, full_name, mobile_number, created_at)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'mobile_number',
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      display_name = EXCLUDED.display_name,
      full_name = EXCLUDED.full_name,
      mobile_number = EXCLUDED.mobile_number,
      updated_at = NOW();
    
    -- Create wallet only after email confirmation
    INSERT INTO public.wallets (user_id, balance, currency, created_at)
    VALUES (NEW.id, 0.00, 'INR', NOW())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for email confirmation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update profiles table to handle pending verification states
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';

-- Create function to handle email verification completion
CREATE OR REPLACE FUNCTION public.handle_email_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- When email is confirmed, update profile verification status
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.profiles 
    SET 
      email_verified = TRUE,
      verification_status = 'verified',
      updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for email verification
DROP TRIGGER IF EXISTS on_email_verified ON auth.users;
CREATE TRIGGER on_email_verified
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_email_verification();
