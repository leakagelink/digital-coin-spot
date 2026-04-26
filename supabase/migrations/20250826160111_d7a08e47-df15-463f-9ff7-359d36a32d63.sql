
-- Update the handle_new_user function to set zero balance instead of 100000
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email)
  );
  
  -- Create initial wallet with zero balance
  INSERT INTO public.wallets (user_id, balance)
  VALUES (NEW.id, 0.00); -- Changed from 100000.00 to 0.00
  
  RETURN NEW;
END;
$function$;
