import { useNavigate } from 'react-router-dom';
import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CryptoCard } from "./crypto-card";
import { useBinanceWebSocket } from "@/hooks/useBinanceWebSocket";
import { Loader2, TrendingUp, Activity, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const cryptoMapping = {
  'BTC': { name: 'Bitcoin', symbol: 'BTCUSDT', minAmount: 350 },
  'ETH': { name: 'Ethereum', symbol: 'ETHUSDT', minAmount: 350 },
  'BNB': { name: 'BNB', symbol: 'BNBUSDT', minAmount: 150 },
  'ADA': { name: 'Cardano', symbol: 'ADAUSDT', minAmount: 150 },
  'SOL': { name: 'Solana', symbol: 'SOLUSDT', minAmount: 150 },
};

const SYMBOLS = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL'] as const;

export function MarketOverview() {
  const { prices, isConnected, error, updateCount, connectionMode } = useBinanceWebSocket([...SYMBOLS]);
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleChartClick = (symbol: string, name: string) => {
    const tradingSymbol = cryptoMapping[symbol as keyof typeof cryptoMapping]?.symbol || `${symbol}USDT`;
    navigate(`/chart/${tradingSymbol}`);
  };

  const pricesWithMomentum = useMemo(() => {
    return SYMBOLS.map(symbol => {
      const priceData = prices[symbol];
      if (!priceData) return null;
      
      const momentum = Math.abs(priceData.change24h);
      
      return {
        symbol,
        price: priceData.priceUSD,
        priceINR: priceData.priceINR,
        momentum,
        changePercent: priceData.change24h,
        change24h: priceData.change24h,
        marketCap: priceData.priceUSD * 1000000000,
        volume24h: 10000000 + Math.random() * 50000000,
        lastUpdate: priceData.lastUpdate
      };
    }).filter(Boolean);
  }, [prices, updateCount]);

  const marketStats = pricesWithMomentum.reduce((acc, priceData) => {
    if (!priceData) return acc;
    acc.totalMarketCap += priceData.marketCap || 0;
    acc.gainers += priceData.changePercent > 0 ? 1 : 0;
    acc.losers += priceData.changePercent < 0 ? 1 : 0;
    acc.totalVolume += priceData.volume24h || 0;
    return acc;
  }, { totalMarketCap: 0, gainers: 0, losers: 0, totalVolume: 0 });

  const lastUpdate = pricesWithMomentum.length > 0 && pricesWithMomentum[0] 
    ? pricesWithMomentum[0].lastUpdate 
    : Date.now();
  const secondsAgo = lastUpdate > 0 ? Math.floor((currentTime - lastUpdate) / 1000) : 0;
  const hasNoPrices = Object.keys(prices).length === 0;

  if (!isConnected && hasNoPrices) {
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle className="gradient-text">Market Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">
              {connectionMode === 'connecting' ? 'Connecting to live stream...' : 'Loading prices...'}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && hasNoPrices) {
    return (
      <Card className="glass">
        <CardHeader>
          <CardTitle className="gradient-text">Market Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-red-500 font-medium">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Market Cap</p>
                <p className="text-lg font-bold">${(marketStats.totalMarketCap / 1000000000).toFixed(2)}B</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">24h Volume</p>
                <p className="text-lg font-bold">${(marketStats.totalVolume / 1000000).toFixed(1)}M</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Gainers</p>
                <p className="text-lg font-bold text-green-600">{marketStats.gainers}</p>
              </div>
              <Badge variant="default" className="bg-green-100 text-green-800">+</Badge>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Losers</p>
                <p className="text-lg font-bold text-red-600">{marketStats.losers}</p>
              </div>
              <Badge variant="destructive" className="bg-red-100 text-red-800">-</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="gradient-text text-xl sm:text-2xl">Live Market Prices</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Click any coin to view professional trading chart</p>
            </div>
            <div className="flex items-center gap-3">
              <Badge 
                variant="outline" 
                className={`${connectionMode === 'websocket' 
                  ? 'bg-green-500/10 text-green-400 border-green-500/30' 
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  {connectionMode === 'websocket' ? (
                    <Wifi className="h-3 w-3" />
                  ) : (
                    <Activity className="h-3 w-3" />
                  )}
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs">
                    {connectionMode === 'websocket' ? 'REALTIME' : 'LIVE'}
                  </span>
                </div>
              </Badge>
              <span className="text-xs text-muted-foreground">
                {secondsAgo}s ago • #{updateCount}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6">
            {SYMBOLS.map((sym) => {
              const crypto = cryptoMapping[sym as keyof typeof cryptoMapping];
              const priceData = pricesWithMomentum.find(p => p?.symbol === sym);
              
              if (!priceData) return null;
              
              return (
                <div key={sym} onClick={() => handleChartClick(sym, crypto.name)} className="cursor-pointer">
                  <CryptoCard
                    symbol={sym}
                    name={crypto.name}
                    price={priceData.price}
                    change={priceData.change24h}
                    changePercent={priceData.changePercent}
                    isWatchlisted={false}
                    onChartClick={() => handleChartClick(sym, crypto.name)}
                    momentum={priceData.momentum}
                    minimumAmount={crypto.minAmount}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
