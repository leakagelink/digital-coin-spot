import { supabase } from "@/integrations/supabase/client";

export interface BinancePrice {
  symbol: string;
  price: string;
  priceChange: string;
  priceChangePercent: string;
}

export interface BinanceTicker {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  weightedAvgPrice: string;
  prevClosePrice: string;
  lastPrice: string;
  lastQty: string;
  bidPrice: string;
  askPrice: string;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  openTime: number;
  closeTime: number;
  firstId: number;
  lastId: number;
  count: number;
}

class BinanceAPIService {
  // Use Supabase edge function proxy to avoid CORS issues
  async getPrice(symbol: string): Promise<BinancePrice> {
    try {
      const { data, error } = await supabase.functions.invoke('binance-proxy', {
        body: { 
          endpoint: 'ticker',
          symbol: symbol
        }
      });

      if (error) throw error;
      
      return {
        symbol: data.symbol,
        price: data.lastPrice,
        priceChange: data.priceChange,
        priceChangePercent: data.priceChangePercent
      };
    } catch (error) {
      console.error('Error fetching price from Binance proxy:', error);
      throw error;
    }
  }

  async getPrices(symbols: string[]): Promise<BinancePrice[]> {
    try {
      // Remove USDT suffix for the proxy call, it will add it
      const cleanSymbols = symbols.map(s => s.replace('USDT', ''));
      
      const { data, error } = await supabase.functions.invoke('binance-proxy', {
        body: { 
          endpoint: 'tickersMulti',
          symbols: cleanSymbols
        }
      });

      if (error) throw error;
      
      const tickers = Array.isArray(data) ? data : [data];
      
      return tickers.map((ticker: any) => ({
        symbol: ticker.symbol,
        price: ticker.lastPrice,
        priceChange: ticker.priceChange,
        priceChangePercent: ticker.priceChangePercent
      }));
    } catch (error) {
      console.error('Error fetching prices from Binance proxy:', error);
      throw error;
    }
  }
}

export const binanceAPI = new BinanceAPIService();
