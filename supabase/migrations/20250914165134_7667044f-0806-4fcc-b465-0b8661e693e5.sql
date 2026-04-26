-- Add persistent admin adjustment percentage to positions
ALTER TABLE public.portfolio_positions
ADD COLUMN IF NOT EXISTS admin_adjustment_pct numeric NOT NULL DEFAULT 0;