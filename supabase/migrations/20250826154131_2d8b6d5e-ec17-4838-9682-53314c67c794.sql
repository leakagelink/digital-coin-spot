
-- Promote the given email to admin
UPDATE public.profiles
SET role = 'admin', updated_at = now()
WHERE email = 'admin@cryptoexchange.com';
