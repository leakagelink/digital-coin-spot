
// This file is deprecated - using Binance service directly
// Kept for compatibility but redirects to Binance service

import { binanceService } from './binanceService';

export interface ChartData {
  timestamp: number;
  date: string;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  momentum?: number;
}

class ChartAPIService {
  async getChartData(symbol: string, interval: string = '1h', limit: number = 200): Promise<ChartData[]> {
    try {
      console.log(`Redirecting to Binance service for ${symbol}`);
      const binanceData = await binanceService.getKlines(symbol, interval, limit);
      
      return binanceData.map(candle => ({
        timestamp: Math.floor(candle.timestamp / 1000),
        date: new Date(candle.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        time: new Date(candle.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
        momentum: candle.momentum
      }));
    } catch (error) {
      console.error('Chart API error:', error);
      throw error;
    }
  }
}

export const chartAPI = new ChartAPIService();
