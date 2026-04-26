-- Create a trigger to keep portfolio_positions derived values consistent
CREATE OR REPLACE FUNCTION public.update_portfolio_positions_derived()
RETURNS trigger AS $$
BEGIN
  -- Ensure numeric fields are not null
  NEW.amount := COALESCE(NEW.amount, 0);
  NEW.buy_price := COALESCE(NEW.buy_price, 0);
  NEW.current_price := COALESCE(NEW.current_price, 0);

  -- Recalculate derived values in INR
  NEW.total_investment := NEW.amount * NEW.buy_price;
  NEW.current_value := NEW.amount * NEW.current_price;
  NEW.pnl := NEW.current_value - NEW.total_investment;
  NEW.pnl_percentage := CASE
    WHEN NEW.total_investment > 0 THEN (NEW.pnl / NEW.total_investment) * 100
    ELSE 0
  END;
  NEW.updated_at := now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_update_portfolio_positions_derived ON public.portfolio_positions;
CREATE TRIGGER trg_update_portfolio_positions_derived
BEFORE INSERT OR UPDATE ON public.portfolio_positions
FOR EACH ROW
EXECUTE FUNCTION public.update_portfolio_positions_derived();