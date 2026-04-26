-- Ensure derived values and admin adjustments are always consistent on the server
CREATE OR REPLACE FUNCTION public.update_portfolio_positions_derived()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Normalize numeric fields
  NEW.amount := COALESCE(NEW.amount, 0);
  NEW.buy_price := COALESCE(NEW.buy_price, 0);
  NEW.current_price := COALESCE(NEW.current_price, 0);
  NEW.admin_adjustment_pct := COALESCE(NEW.admin_adjustment_pct, 0);

  -- Recalculate derived values in INR
  NEW.total_investment := NEW.amount * NEW.buy_price;
  NEW.current_value := NEW.amount * NEW.current_price;

  -- Base PnL and percentage
  IF NEW.total_investment > 0 THEN
    NEW.pnl := NEW.current_value - NEW.total_investment;
    NEW.pnl_percentage := (NEW.pnl / NEW.total_investment) * 100;
  ELSE
    NEW.pnl := 0;
    NEW.pnl_percentage := 0;
  END IF;

  -- Apply admin adjustment percentage (added to base P&L %)
  NEW.pnl_percentage := NEW.pnl_percentage + NEW.admin_adjustment_pct;

  -- Recompute PnL from final percentage for consistency
  NEW.pnl := (NEW.pnl_percentage / 100) * NEW.total_investment;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Attach triggers so the function runs automatically
DROP TRIGGER IF EXISTS trg_positions_before_insert ON public.portfolio_positions;
CREATE TRIGGER trg_positions_before_insert
BEFORE INSERT ON public.portfolio_positions
FOR EACH ROW
EXECUTE FUNCTION public.update_portfolio_positions_derived();

DROP TRIGGER IF EXISTS trg_positions_before_update ON public.portfolio_positions;
CREATE TRIGGER trg_positions_before_update
BEFORE UPDATE OF amount, buy_price, current_price, admin_adjustment_pct
ON public.portfolio_positions
FOR EACH ROW
EXECUTE FUNCTION public.update_portfolio_positions_derived();