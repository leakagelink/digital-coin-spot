import { useState, useEffect, useRef, useCallback } from 'react';
import { binanceService } from '@/services/binanceService';

export interface BinancePrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent: number;
  volume24h: number;
  marketCap: number;
  momentum: number;
  trend: 'up' | 'down' | 'neutral';
  lastUpdate: number;
}

const BINANCE_SYMBOLS = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', shortSymbol: 'BTC' },
  { symbol: 'ETHUSDT', name: 'Ethereum', shortSymbol: 'ETH' },
  { symbol: 'BNBUSDT', name: 'BNB', shortSymbol: 'BNB' },
  { symbol: 'ADAUSDT', name: 'Cardano', shortSymbol: 'ADA' },
  { symbol: 'SOLUSDT', name: 'Solana', shortSymbol: 'SOL' },
  { symbol: 'USDCUSDT', name: 'USD Coin', shortSymbol: 'USDC' },
  { symbol: 'XRPUSDT', name: 'Ripple', shortSymbol: 'XRP' },
  { symbol: 'DOTUSDT', name: 'Polkadot', shortSymbol: 'DOT' },
  { symbol: 'LINKUSDT', name: 'Chainlink', shortSymbol: 'LINK' },
  { symbol: 'LTCUSDT', name: 'Litecoin', shortSymbol: 'LTC' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', shortSymbol: 'DOGE' },
  { symbol: 'TRXUSDT', name: 'Tron', shortSymbol: 'TRX' }
];

export function useBinancePrices() {
  const [prices, setPrices] = useState<Record<string, BinancePrice>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsConnections = useRef<Record<string, WebSocket>>({});
  const priceHistoryRef = useRef<Record<string, number[]>>({});

  const calculateMomentum = useCallback((symbol: string, currentPrice: number, previousPrice?: number) => {
    if (!priceHistoryRef.current[symbol]) {
      priceHistoryRef.current[symbol] = [];
    }
    
    const history = priceHistoryRef.current[symbol];
    history.push(currentPrice);
    
    // Keep last 20 prices for better momentum calculation
    if (history.length > 20) {
      history.shift();
    }
    
    if (history.length < 3) {
      return Math.random() * 15 + 5; // Random initial momentum
    }
    
    // Calculate momentum based on price velocity and volatility
    const recentPrices = history.slice(-10);
    const priceChanges = recentPrices.slice(1).map((price, idx) => 
      (price - recentPrices[idx]) / recentPrices[idx]
    );
    
    const avgChange = priceChanges.reduce((sum, change) => sum + Math.abs(change), 0) / priceChanges.length;
    const volatility = Math.sqrt(priceChanges.reduce((sum, change) => sum + Math.pow(change, 2), 0) / priceChanges.length);
    
    // Enhanced momentum calculation
    const momentum = (avgChange + volatility) * 1000;
    return Math.min(Math.max(momentum, 1), 25); // Cap between 1-25
  }, []);

  const connectWebSockets = useCallback(() => {
    console.log('🔗 Connecting to Binance WebSockets for live price data...');
    
    BINANCE_SYMBOLS.forEach(({ symbol }) => {
      const wsUrl = `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@ticker`;
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log(`✅ WebSocket connected for ${symbol}`);
      };
      
      ws.onmessage = (event) => {
        try {
          const ticker = JSON.parse(event.data);
          const currentPrice = parseFloat(ticker.c);
          const change24h = parseFloat(ticker.p);
          const changePercent = parseFloat(ticker.P);
          const volume24h = parseFloat(ticker.v);
          
          const momentum = calculateMomentum(symbol, currentPrice);
          const cryptoInfo = BINANCE_SYMBOLS.find(s => s.symbol === symbol);
          
          setPrices(prev => ({
            ...prev,
            [cryptoInfo?.shortSymbol || symbol]: {
              symbol: cryptoInfo?.shortSymbol || symbol,
              name: cryptoInfo?.name || symbol,
              price: currentPrice,
              change24h,
              changePercent,
              volume24h,
              marketCap: currentPrice * volume24h * 10, // Estimated market cap
              momentum,
              trend: changePercent > 0.1 ? 'up' : changePercent < -0.1 ? 'down' : 'neutral',
              lastUpdate: Date.now()
            }
          }));
        } catch (err) {
          console.error(`WebSocket message error for ${symbol}:`, err);
        }
      };
      
      ws.onerror = (error) => {
        console.error(`WebSocket error for ${symbol}:`, error);
      };
      
      ws.onclose = () => {
        console.log(`WebSocket closed for ${symbol}`);
        // Reconnect after 5 seconds
        setTimeout(() => connectWebSockets(), 5000);
      };
      
      wsConnections.current[symbol] = ws;
    });
  }, [calculateMomentum]);

  const fetchInitialPrices = useCallback(async () => {
    try {
      console.log('📊 Fetching initial prices from Binance...');
      setIsLoading(true);
      setError(null);
      
      const pricesMap: Record<string, BinancePrice> = {};
      
      for (const { symbol, name, shortSymbol } of BINANCE_SYMBOLS) {
        try {
          const ticker = await binanceService.getCurrentPrice(symbol);
          const currentPrice = parseFloat(ticker.price);
          const changePercent = parseFloat(ticker.priceChangePercent || '0');
          const momentum = calculateMomentum(symbol, currentPrice);
          
          pricesMap[shortSymbol] = {
            symbol: shortSymbol,
            name,
            price: currentPrice,
            change24h: parseFloat(ticker.priceChange || '0'),
            changePercent,
            volume24h: parseFloat(ticker.volume || '0'),
            marketCap: currentPrice * parseFloat(ticker.volume || '0') * 10,
            momentum,
            trend: changePercent > 0.1 ? 'up' : changePercent < -0.1 ? 'down' : 'neutral',
            lastUpdate: Date.now()
          };
        } catch (err) {
          console.error(`Error fetching price for ${symbol}:`, err);
        }
      }
      
      setPrices(pricesMap);
      console.log('✅ Initial prices loaded:', Object.keys(pricesMap).length, 'symbols');
    } catch (err) {
      console.error('❌ Error fetching initial prices:', err);
      setError('Failed to fetch live prices from Binance');
    } finally {
      setIsLoading(false);
    }
  }, [calculateMomentum]);

  useEffect(() => {
    // Initial load
    fetchInitialPrices();
    
    // Connect WebSockets for live updates
    connectWebSockets();
    
    return () => {
      // Clean up WebSocket connections
      Object.values(wsConnections.current).forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      });
      wsConnections.current = {};
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchInitialPrices, connectWebSockets]);

  const getPrice = useCallback((symbol: string): BinancePrice | null => {
    return prices[symbol] || null;
  }, [prices]);

  const getTrendingPairs = useCallback(() => {
    return Object.values(prices)
      .sort((a, b) => b.momentum - a.momentum)
      .slice(0, 8);
  }, [prices]);

  const refresh = useCallback(async () => {
    await fetchInitialPrices();
  }, [fetchInitialPrices]);

  return {
    prices,
    isLoading,
    error,
    getPrice,
    getTrendingPairs,
    refresh,
    lastUpdate: Object.keys(prices).length ? Math.max(...Object.values(prices).map(p => p.lastUpdate)) : 0,
    isLive: Object.keys(prices).length > 0
  };
}
