
-- Add mobile number to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS mobile_number TEXT;

-- Create KYC documents table
CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  aadhar_front_url TEXT,
  aadhar_back_url TEXT,
  pan_card_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on KYC documents
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

-- KYC policies
CREATE POLICY "Users can view own KYC documents" 
ON public.kyc_documents FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own KYC documents" 
ON public.kyc_documents FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own KYC documents" 
ON public.kyc_documents FOR UPDATE 
USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all KYC documents" 
ON public.kyc_documents FOR SELECT 
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update KYC documents" 
ON public.kyc_documents FOR UPDATE 
USING (is_admin(auth.uid()));

-- Create storage bucket for KYC documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for KYC documents
CREATE POLICY "Users can upload own KYC documents" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'kyc-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own KYC documents" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'kyc-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all KYC documents" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'kyc-documents' 
  AND is_admin(auth.uid())
);

-- Update handle_new_user function to include full_name and mobile_number
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public 
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, full_name, mobile_number)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'mobile_number'
  );
  
  INSERT INTO public.wallets (user_id, balance, currency)
  VALUES (NEW.id, 0.00, 'INR');
  
  RETURN NEW;
END;
$$;
