-- Add a field to track if prices were manually edited by admin
ALTER TABLE portfolio_positions 
ADD COLUMN admin_price_override BOOLEAN DEFAULT FALSE;

-- Add a comment to clarify the purpose
COMMENT ON COLUMN portfolio_positions.admin_price_override IS 'When true, current_price was set by admin and should not be overridden by live market data';