-- Add payment_method column to withdrawal_requests table
ALTER TABLE public.withdrawal_requests 
ADD COLUMN payment_method text;

-- Add additional fields for different payment methods
ALTER TABLE public.withdrawal_requests 
ADD COLUMN upi_id text,
ADD COLUMN usdt_address text;