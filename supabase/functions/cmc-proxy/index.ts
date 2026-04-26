/**
 * Supabase Edge Function: cmc-proxy
 * Proxies CoinMarketCap API with automatic API key rotation.
 * Uses CMC_API_KEY_1, CMC_API_KEY_2, CMC_API_KEY_3, CMC_API_KEY_4 secrets.
 * Supports GET ?symbols=BTC,ETH and POST { symbols: ["BTC", "ETH"] }.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

type CMCPrice = {
  symbol: string;
  name: string;
  price: number;
  percent_change_24h: number;
  market_cap?: number;
};

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const jsonHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
};

const DEFAULT_SYMBOLS = [
  "BTC", "ETH", "BNB", "SOL", "XRP", "ADA", "DOGE", "TRX", "TON", "MATIC",
  "LTC", "DOT", "BCH", "LINK", "AVAX",
];

// Get all API keys from environment
function getApiKeys(): string[] {
  const keys: string[] = [];
  for (let i = 1; i <= 4; i++) {
    const key = Deno.env.get(`CMC_API_KEY_${i}`);
    if (key) {
      keys.push(key);
    }
  }
  // Fallback to old single key if exists
  const legacyKey = Deno.env.get("CMC_API_KEY");
  if (legacyKey && !keys.includes(legacyKey)) {
    keys.push(legacyKey);
  }
  return keys;
}

// Check if response indicates rate limit or quota exceeded
function isRateLimitError(status: number, data: any): boolean {
  if (status === 429) return true;
  if (data?.status?.error_code === 1008 || data?.status?.error_code === 1009) return true;
  if (data?.status?.error_message?.toLowerCase().includes("rate limit")) return true;
  if (data?.status?.error_message?.toLowerCase().includes("quota")) return true;
  return false;
}

async function fetchWithRotation(symbols: string[]): Promise<{ data: any; keyIndex: number }> {
  const apiKeys = getApiKeys();
  
  if (apiKeys.length === 0) {
    throw new Error("No CoinMarketCap API keys configured. Set CMC_API_KEY_1, CMC_API_KEY_2, etc.");
  }

  const symbolsString = symbols.join(",");
  const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${encodeURIComponent(symbolsString)}&convert=USD`;

  let lastError: Error | null = null;

  for (let i = 0; i < apiKeys.length; i++) {
    const apiKey = apiKeys[i];
    console.log(`Trying CMC API key ${i + 1}/${apiKeys.length}`);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "X-CMC_PRO_API_KEY": apiKey,
          "Accept": "application/json",
        },
      });

      const data = await response.json();

      // Check for rate limit
      if (isRateLimitError(response.status, data)) {
        console.log(`API key ${i + 1} rate limited, switching to next key...`);
        lastError = new Error(`Key ${i + 1} rate limited: ${data?.status?.error_message || "Rate limit exceeded"}`);
        continue;
      }

      // Check for other API errors
      if (!response.ok || (data?.status?.error_code && data?.status?.error_code !== 0)) {
        console.log(`API key ${i + 1} error: ${data?.status?.error_message || response.statusText}`);
        lastError = new Error(data?.status?.error_message || `HTTP ${response.status}`);
        continue;
      }

      console.log(`Successfully fetched data with API key ${i + 1}`);
      return { data, keyIndex: i };
    } catch (error) {
      console.log(`API key ${i + 1} fetch error:`, error.message);
      lastError = error;
      continue;
    }
  }

  throw lastError || new Error("All API keys exhausted");
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get symbols from GET param or POST body
    let symbols = DEFAULT_SYMBOLS;
    if (req.method === "GET") {
      const url = new URL(req.url);
      const s = url.searchParams.get("symbols");
      if (s) {
        symbols = s.split(",").map((x) => x.trim().toUpperCase()).filter(Boolean);
      }
    } else if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (Array.isArray(body?.symbols)) {
        symbols = body.symbols.map((x: string) => String(x).toUpperCase());
      }
    }

    console.log("Fetching CMC prices for symbols:", symbols.join(","));

    const { data, keyIndex } = await fetchWithRotation(symbols);
    const raw = data?.data || {};

    const out: CMCPrice[] = Object.keys(raw).map((sym) => {
      const item = raw[sym];
      const quote = item?.quote?.USD || {};
      return {
        symbol: item?.symbol,
        name: item?.name,
        price: Number(quote?.price ?? 0),
        percent_change_24h: Number(quote?.percent_change_24h ?? 0),
        market_cap: quote?.market_cap != null ? Number(quote.market_cap) : undefined,
      };
    });

    console.log(`Returned ${out.length} prices using API key ${keyIndex + 1}`);
    return new Response(JSON.stringify(out), { status: 200, headers: jsonHeaders });
  } catch (e) {
    console.error("cmc-proxy error:", e);
    return new Response(
      JSON.stringify({ error: "Internal error", message: e?.message || String(e) }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
