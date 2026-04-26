import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TaapiPrice = {
  symbol: string;
  priceUSD: number;
  priceINR: number;
  lastUpdate: number;
};

const USD_TO_INR = 84;

export function useTaapiPrices(symbols: string[]) {
  const [prices, setPrices] = useState<Record<string, TaapiPrice>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  const uniqueSymbols = useMemo(() => Array.from(new Set(symbols)).filter(Boolean), [symbols]);

  const fetchAll = useCallback(async () => {
    if (uniqueSymbols.length === 0) {
      setIsLoading(false);
      return;
    }
    
    try {
      // Use Binance proxy for reliable price fetching
      const { data, error: fetchError } = await supabase.functions.invoke('binance-proxy', {
        body: { 
          endpoint: 'tickersMulti',
          symbols: uniqueSymbols
        }
      });

      if (fetchError) throw fetchError;

      const now = Date.now();
      const tickers = Array.isArray(data) ? data : [data];
      const map: Record<string, TaapiPrice> = {};

      tickers.forEach((ticker: any) => {
        if (ticker?.symbol) {
          const cleanSymbol = ticker.symbol.replace('USDT', '');
          const priceUSD = parseFloat(ticker.lastPrice);
          if (priceUSD > 0) {
            map[cleanSymbol] = {
              symbol: cleanSymbol,
              priceUSD,
              priceINR: priceUSD * USD_TO_INR,
              lastUpdate: now,
            };
          }
        }
      });

      if (Object.keys(map).length > 0) {
        setPrices(map);
      }
      setError(null);
    } catch (e: any) {
      setError(e?.message || "Failed to load prices");
      console.error('Price fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [uniqueSymbols]);

  useEffect(() => {
    fetchAll();
    // Refresh every 10 seconds
    intervalRef.current = window.setInterval(fetchAll, 10000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [fetchAll]);

  return { prices, isLoading, error };
}
