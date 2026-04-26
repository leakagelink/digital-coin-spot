import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const USD_TO_INR = 84;

/**
 * Background updater that syncs database positions with live prices
 * IMPORTANT: Does NOT update admin-adjusted positions - those are controlled by admin_adjustment_pct
 */
export const usePositionUpdater = (userId?: string) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const updatePositions = async () => {
      try {
        // Get all open positions
        const { data: allPositions, error } = await supabase
          .from('portfolio_positions')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'open');

        if (error || !allPositions || allPositions.length === 0) return;
        
        // Filter out admin-overridden positions (check for null OR false)
        const positions = allPositions.filter(p => p.admin_price_override !== true);

        // Get unique symbols
        const symbols = Array.from(new Set(positions.map(p => p.symbol)));
        
        // Fetch prices via edge function proxy
        const { data: tickerData, error: fetchError } = await supabase.functions.invoke('binance-proxy', {
          body: { 
            endpoint: 'tickersMulti',
            symbols: symbols
          }
        });

        if (fetchError) {
          console.error('Failed to fetch prices:', fetchError);
          return;
        }

        const tickers = Array.isArray(tickerData) ? tickerData : [tickerData];
        const priceMap: Record<string, number> = {};
        
        tickers.forEach((ticker: any) => {
          if (ticker?.symbol) {
            const cleanSymbol = ticker.symbol.replace('USDT', '');
            const priceUSD = parseFloat(ticker.lastPrice);
            priceMap[cleanSymbol] = priceUSD * USD_TO_INR;
          }
        });

        // Update positions in database
        const updates = positions.map(async (position) => {
          const livePriceINR = priceMap[position.symbol];
          if (!livePriceINR) return;

          // Only update if price changed significantly (>0.1%)
          const priceDiff = Math.abs(position.current_price - livePriceINR);
          if (priceDiff < livePriceINR * 0.001) return;

          const currentValue = position.amount * livePriceINR;
          const pnl = currentValue - position.total_investment;
          const pnlPercentage = position.total_investment > 0 
            ? (pnl / position.total_investment) * 100 
            : 0;

          return supabase
            .from('portfolio_positions')
            .update({
              current_price: livePriceINR,
              current_value: currentValue,
              pnl: pnl,
              pnl_percentage: pnlPercentage,
              updated_at: new Date().toISOString(),
            })
            .eq('id', position.id);
        });

        await Promise.all(updates.filter(Boolean));
        
        // Only invalidate queries if we actually updated something
        if (updates.some(u => u !== undefined)) {
          queryClient.invalidateQueries({ queryKey: ['portfolio-positions'] });
        }
      } catch (error) {
        console.error('Error updating positions:', error);
      }
    };

    // Update every 10 seconds (less aggressive to prevent conflicts)
    const interval = setInterval(updatePositions, 10000);
    updatePositions(); // Initial update

    return () => clearInterval(interval);
  }, [userId, queryClient]);
};
