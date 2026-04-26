
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TaapiRequest {
  symbol: string;
  exchange: string;
  interval: string;
  period?: number;
  indicators?: string[];
}

// Cache to store recent requests and avoid rate limiting
const requestCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 300000; // 5 minutes cache (reduce API pressure)

// Binance fallback (no secret required) when TAAPI is rate-limited/unavailable
async function fetchBinanceCandles(symbol: string, interval: string, limit: number) {
  const binanceSymbol = symbol.replace('/', ''); // e.g., BTC/USDT -> BTCUSDT
  const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Binance fallback error: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('Invalid Binance kline data');
  const candles = data.map((k: any[]) => ({
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
    timestamp: Number(k[0]),
  }));
  return candles;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, exchange = 'binance', interval = '1h', period = 100, indicators = [] }: TaapiRequest = await req.json();
    
    const taapiKey = Deno.env.get('TAAPI_API_KEY');
    if (!taapiKey) {
      throw new Error('TaapiAPI key not configured');
    }

    // Create cache key
    const cacheKey = `${symbol}-${exchange}-${interval}-${period}-${indicators.join(',')}`;
    const now = Date.now();
    
    // Check cache first
    const cached = requestCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      console.log(`Returning cached data for ${symbol}`);
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Fetching fresh data for ${symbol} on ${exchange} with interval ${interval}`);

    // Add a small delay to avoid hitting rate limits
    await new Promise(resolve => setTimeout(resolve, 500));

    // Fetch OHLCV candlestick data
    const candleResponse = await fetch(`https://api.taapi.io/candles?secret=${taapiKey}&exchange=${exchange}&symbol=${symbol}&interval=${interval}&period=${period}`);
    
    if (!candleResponse.ok) {
      if (candleResponse.status === 429) {
        // Serve last cached data if available to avoid breaking the UI
        const last = requestCache.get(cacheKey);
        if (last) {
          console.warn(`Rate limited by TaapiAPI for ${symbol}. Serving stale cached data.`);
          const stale = { ...last.data, stale: true, rateLimited: true, timestamp: now };
          return new Response(JSON.stringify(stale), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        // Try Binance fallback when TAAPI is rate-limited
        if (exchange === 'binance') {
          try {
            const candles = await fetchBinanceCandles(symbol, interval, period);
            const result = { candles, indicators: {}, symbol, exchange, interval, timestamp: now, source: 'binance', fallback: true, rateLimited: true };
            requestCache.set(cacheKey, { data: result, timestamp: now });
            return new Response(JSON.stringify(result), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          } catch (e) {
            console.error('Binance fallback failed (429):', e);
          }
        }
        return new Response(JSON.stringify({ candles: [], indicators: {}, symbol, exchange, interval, timestamp: now, fallback: true, degraded: true, rateLimited: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      // For other errors, attempt Binance fallback as well
      if (exchange === 'binance') {
        try {
          const candles = await fetchBinanceCandles(symbol, interval, period);
          const result = { candles, indicators: {}, symbol, exchange, interval, timestamp: now, source: 'binance', fallback: true };
          requestCache.set(cacheKey, { data: result, timestamp: now });
          return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (e) {
          console.error('Binance fallback failed (non-429):', e);
        }
      }
      return new Response(JSON.stringify({ candles: [], indicators: {}, symbol, exchange, interval, timestamp: now, fallback: true, degraded: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const candleData = await candleResponse.json();

    if (!Array.isArray(candleData) || candleData.length === 0) {
      throw new Error('No candle data received from TaapiAPI');
    }

    // Fetch technical indicators with delays between requests
    const indicatorData: Record<string, any> = {};
    
    for (const indicator of indicators) {
      try {
        // Add delay between indicator requests
        await new Promise(resolve => setTimeout(resolve, 300));
        
        let url = `https://api.taapi.io/${indicator}?secret=${taapiKey}&exchange=${exchange}&symbol=${symbol}&interval=${interval}`;
        
        // Add specific parameters for different indicators
        if (indicator === 'sma') {
          url += '&period=20';
        } else if (indicator === 'rsi') {
          url += '&period=14';
        } else if (indicator === 'macd') {
          url += '&fastperiod=12&slowperiod=26&signalperiod=9';
        }
        
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          indicatorData[indicator] = Array.isArray(data) ? data : [data];
        } else {
          console.error(`Error fetching ${indicator}: ${response.status}`);
          indicatorData[indicator] = null;
        }
      } catch (error) {
        console.error(`Error fetching ${indicator}:`, error);
        indicatorData[indicator] = null;
      }
    }

    const result = {
      candles: candleData,
      indicators: indicatorData,
      symbol,
      exchange,
      interval,
      timestamp: now
    };

    // Cache the result
    requestCache.set(cacheKey, { data: result, timestamp: now });
    
    // Clean old cache entries
    for (const [key, value] of requestCache.entries()) {
      if ((now - value.timestamp) > CACHE_DURATION * 2) {
        requestCache.delete(key);
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('TaapiAPI proxy error:', error);
    
    const errorResponse = {
      error: (error as Error)?.message ?? 'unknown',
      candles: [],
      indicators: {},
      fallback: true,
      degraded: true,
    };
    
    // Always respond 200 to avoid client hard errors; client can read fallback/degraded flags
    return new Response(JSON.stringify(errorResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
