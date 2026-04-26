
-- Update portfolio_positions table to include more trading details
ALTER TABLE public.portfolio_positions 
ADD COLUMN IF NOT EXISTS open_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS trade_type TEXT DEFAULT 'buy',
ADD COLUMN IF NOT EXISTS total_investment NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_value NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS pnl NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS pnl_percentage NUMERIC DEFAULT 0;

-- Create trades table for tracking individual trades
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  coin_name TEXT NOT NULL,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell')),
  quantity NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on trades table
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for trades table
CREATE POLICY "Users can view own trades" 
  ON public.trades 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades" 
  ON public.trades 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all trades" 
  ON public.trades 
  FOR SELECT 
  USING (is_admin(auth.uid()));
