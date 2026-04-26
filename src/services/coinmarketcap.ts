// CoinMarketCap service - uses edge function for API calls
// All API calls go through the cmc-proxy edge function which handles key rotation

import { supabase } from "@/integrations/supabase/client";

export interface CMCPrice {
  symbol: string;
  name: string;
  price: number;
  percent_change_24h: number;
  change24h?: number; // Alias for compatibility
  marketCap?: number;
  market_cap?: number;
  volume24h?: number;
}

export const DEFAULT_CRYPTO_SYMBOLS = [
  "BTC", "ETH", "BNB", "SOL", "XRP", "ADA", "DOGE", "TRX", "TON", "MATIC",
  "LTC", "DOT", "BCH", "LINK", "AVAX",
];

class CoinMarketCapService {
  /**
   * Fetches prices for multiple cryptocurrencies
   * Uses edge function with automatic API key rotation
   */
  async getCryptoPrices(symbols: string[] = DEFAULT_CRYPTO_SYMBOLS): Promise<CMCPrice[]> {
    console.log("Fetching CMC prices via edge function for:", symbols);
    
    const { data, error } = await supabase.functions.invoke("cmc-proxy", {
      body: { symbols },
    });

    if (error) {
      console.error("CMC proxy error:", error);
      throw error;
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    // Normalize the response to include both naming conventions
    return (data as any[]).map((item) => ({
      symbol: item.symbol,
      name: item.name,
      price: item.price,
      percent_change_24h: item.percent_change_24h,
      change24h: item.percent_change_24h, // Alias
      marketCap: item.market_cap,
      market_cap: item.market_cap,
      volume24h: 0, // Not available in current API response
    }));
  }

  /**
   * Fetches price for a single cryptocurrency
   */
  async getCryptoPrice(symbol: string): Promise<CMCPrice> {
    const prices = await this.getCryptoPrices([symbol.toUpperCase()]);
    if (prices.length === 0) {
      throw new Error(`Price not found for ${symbol}`);
    }
    return prices[0];
  }
}

export const coinMarketCapService = new CoinMarketCapService();
