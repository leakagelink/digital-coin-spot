
import { supabase } from '@/integrations/supabase/client';

export interface BinanceKline {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteAssetVolume: string;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
}

export interface ProcessedCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  momentum: number;
  bodySize: number;
  upperShadow: number;
  lowerShadow: number;
  isBullish: boolean;
}

class BinanceService {
  private async callBinanceProxy(endpoint: string, params: Record<string, unknown> = {}) {
    const { data, error } = await supabase.functions.invoke('binance-proxy', {
      body: { endpoint, ...params },
    });

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(error.message || 'Binance proxy failed');
    }

    if (!data) {
      throw new Error('Empty response from Binance proxy');
    }

    // If edge function returns { error: ... }
    if ((data as any).error) {
      console.error('Binance API error via proxy:', (data as any).error);
      throw new Error((data as any).error);
    }

    return data;
  }

  async getKlines(symbol: string, interval: string, limit: number = 500): Promise<ProcessedCandle[]> {
    console.log(`Fetching Binance data for ${symbol} [${interval}], limit=${limit}`);
    const raw = await this.callBinanceProxy('klines', { symbol, interval, limit });

    if (!Array.isArray(raw)) {
      throw new Error('Invalid data format from Binance API');
    }

    return this.processCandles(raw as any[][]);
  }

  private processCandles(klines: any[][]): ProcessedCandle[] {
    return klines.map((kline) => {
      const open = parseFloat(kline[1]);
      const high = parseFloat(kline[2]);
      const low = parseFloat(kline[3]);
      const close = parseFloat(kline[4]);
      const volume = parseFloat(kline[5]);

      const bodySize = Math.abs(close - open);
      const totalRange = high - low;
      const upperShadow = high - Math.max(open, close);
      const lowerShadow = Math.min(open, close) - low;
      const isBullish = close >= open;

      const bodyToRangeRatio = totalRange > 0 ? bodySize / totalRange : 0;
      const volumeWeight = Math.log(volume + 1) / 20;
      const priceImpact = Math.max(open, close) > 0 ? bodySize / Math.max(open, close) : 0;
      const momentum = (bodyToRangeRatio * volumeWeight * priceImpact) * 100;

      return {
        timestamp: parseInt(kline[0]),
        open,
        high,
        low,
        close,
        volume,
        momentum: Math.min(momentum, 100),
        bodySize,
        upperShadow,
        lowerShadow,
        isBullish,
      };
    });
  }

  async getCurrentPrice(symbol: string) {
    return await this.callBinanceProxy('ticker', { symbol });
  }

  async getExchangeInfo() {
    return await this.callBinanceProxy('exchangeInfo');
  }
}

export const binanceService = new BinanceService();
