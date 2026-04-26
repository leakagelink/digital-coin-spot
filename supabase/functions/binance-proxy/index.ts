
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const BINANCE_BASE_URL = "https://api.binance.com/api/v3";

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let endpoint: string | undefined;
    let symbol: string | undefined;
    let interval = "1h";
    let limit = 500;
    let symbols: string[] | undefined;

    // Support both GET and POST
    if (req.method === "GET") {
      const url = new URL(req.url);
      endpoint = url.searchParams.get("endpoint") || undefined;
      symbol = url.searchParams.get("symbol") || undefined;
      interval = url.searchParams.get("interval") || "1h";
      limit = parseInt(url.searchParams.get("limit") || "500");
      const symbolsParam = url.searchParams.get("symbols");
      if (symbolsParam) {
        symbols = symbolsParam.split(",");
      }
    } else if (req.method === "POST") {
      const body = await req.json().catch(() => null) as {
        endpoint?: string;
        symbol?: string;
        symbols?: string[];
        interval?: string;
        limit?: number;
      } | null;

      if (body) {
        endpoint = body.endpoint;
        symbol = body.symbol;
        symbols = body.symbols;
        interval = body.interval || "1h";
        limit = body.limit || 500;
      }
    } else {
      return new Response(
        JSON.stringify({ error: "Method not allowed. Use GET or POST." }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: "Missing 'endpoint' parameter." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let url = "";
    if (endpoint === "klines") {
      if (!symbol) {
        return new Response(
          JSON.stringify({ error: "Missing 'symbol' for klines endpoint." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Auto-append USDT if not already present for klines
      const klinesSymbol = symbol.endsWith('USDT') ? symbol : `${symbol}USDT`;
      url = `${BINANCE_BASE_URL}/klines?symbol=${encodeURIComponent(klinesSymbol)}&interval=${encodeURIComponent(interval)}&limit=${encodeURIComponent(String(limit))}`;
    } else if (endpoint === "ticker") {
      if (!symbol) {
        return new Response(
          JSON.stringify({ error: "Missing 'symbol' for ticker endpoint." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Auto-append USDT if not already present
      const fullSymbol = symbol.endsWith('USDT') ? symbol : `${symbol}USDT`;
      url = `${BINANCE_BASE_URL}/ticker/24hr?symbol=${encodeURIComponent(fullSymbol)}`;
    } else if (endpoint === "tickers") {
      // Fetch all 24hr tickers - for dashboard price display
      url = `${BINANCE_BASE_URL}/ticker/24hr`;
    } else if (endpoint === "tickersMulti") {
      // Fetch specific symbols
      if (symbols && symbols.length > 0) {
        const symbolsJson = JSON.stringify(symbols.map(s => `${s}USDT`));
        url = `${BINANCE_BASE_URL}/ticker/24hr?symbols=${encodeURIComponent(symbolsJson)}`;
      } else {
        url = `${BINANCE_BASE_URL}/ticker/24hr`;
      }
    } else if (endpoint === "exchangeInfo") {
      url = `${BINANCE_BASE_URL}/exchangeInfo`;
    } else {
      return new Response(
        JSON.stringify({ error: "Invalid endpoint. Use 'klines', 'ticker', 'tickers', 'tickersMulti', or 'exchangeInfo'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[binance-proxy] Fetching:", url);

    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      console.error("[binance-proxy] Binance error:", response.status, text);
      return new Response(
        JSON.stringify({ error: `Binance API error: ${response.status} ${response.statusText}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[binance-proxy] Unhandled error:", message);
    return new Response(JSON.stringify({ error: "Failed to fetch from Binance API", details: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
