-- Ensure server-side, consistent P&L calculations using the existing function
-- 1) Attach BEFORE INSERT/UPDATE triggers to portfolio_positions
-- 2) Backfill existing rows to recalculate derived fields once

-- Safety: drop if exist to avoid duplicates
DROP TRIGGER IF EXISTS trg_portfolio_positions_derived_ins ON public.portfolio_positions;
DROP TRIGGER IF EXISTS trg_portfolio_positions_derived_upd ON public.portfolio_positions;

-- Create BEFORE INSERT trigger
CREATE TRIGGER trg_portfolio_positions_derived_ins
BEFORE INSERT ON public.portfolio_positions
FOR EACH ROW
EXECUTE FUNCTION public.update_portfolio_positions_derived();

-- Create BEFORE UPDATE trigger
CREATE TRIGGER trg_portfolio_positions_derived_upd
BEFORE UPDATE ON public.portfolio_positions
FOR EACH ROW
EXECUTE FUNCTION public.update_portfolio_positions_derived();

-- Optional: immediately normalize existing data so old users' trades are correct
UPDATE public.portfolio_positions
SET updated_at = now();