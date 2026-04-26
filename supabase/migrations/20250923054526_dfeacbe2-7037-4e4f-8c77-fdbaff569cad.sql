-- Ensure derived fields on portfolio_positions are always consistent
-- Add BEFORE INSERT/UPDATE triggers to call update_portfolio_positions_derived()

-- Drop existing triggers if they exist to avoid duplicates
DROP TRIGGER IF EXISTS trg_portfolio_positions_derived_ins ON public.portfolio_positions;
DROP TRIGGER IF EXISTS trg_portfolio_positions_derived_upd ON public.portfolio_positions;

-- Create triggers
CREATE TRIGGER trg_portfolio_positions_derived_ins
BEFORE INSERT ON public.portfolio_positions
FOR EACH ROW
EXECUTE FUNCTION public.update_portfolio_positions_derived();

CREATE TRIGGER trg_portfolio_positions_derived_upd
BEFORE UPDATE ON public.portfolio_positions
FOR EACH ROW
EXECUTE FUNCTION public.update_portfolio_positions_derived();