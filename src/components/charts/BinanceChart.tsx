import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { binanceService, ProcessedCandle } from '@/services/binanceService';
import { AlertCircle, RefreshCw, Activity } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { BinanceChartControls } from './BinanceChartControls';
import { BinanceChartCanvas } from './BinanceChartCanvas';
import { cn } from '@/lib/utils';

interface BinanceChartProps {
  symbol: string;
  name: string;
  onClose?: () => void;
  isFullPage?: boolean;
}

export function BinanceChart({ symbol, name, onClose, isFullPage = false }: BinanceChartProps) {
  const [candles, setCandles] = useState<ProcessedCandle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState('1h');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanX, setLastPanX] = useState(0);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [showIntervalMenu, setShowIntervalMenu] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const isMobile = useIsMobile();
  
  const chartRef = useRef<HTMLDivElement>(null);
  const panTimeoutRef = useRef<number | null>(null);
  const refreshIntervalRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Available intervals
  const intervals = [
    { value: '1m', label: '1m' }, { value: '3m', label: '3m' }, { value: '5m', label: '5m' },
    { value: '15m', label: '15m' }, { value: '30m', label: '30m' }, { value: '1h', label: '1h' },
    { value: '2h', label: '2h' }, { value: '4h', label: '4h' }, { value: '6h', label: '6h' },
    { value: '8h', label: '8h' }, { value: '12h', label: '12h' }, { value: '1d', label: '1d' },
    { value: '3d', label: '3d' }, { value: '1w', label: '1w' }, { value: '1M', label: '1M' }
  ];

  const quickIntervals = ['1m', '5m', '15m', '1h', '4h', '1d'];

  // WebSocket connection for live updates
  const connectWebSocket = useCallback(() => {
    if (!symbol) return;

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@ticker`);
      
      ws.onopen = () => {
        console.log('[BinanceChart] WebSocket connected for', symbol);
        setIsLiveConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const ticker = JSON.parse(event.data);
          const newPrice = parseFloat(ticker.c);
          const change = parseFloat(ticker.P);
          
          setCurrentPrice(newPrice);
          setPriceChange(change);

          // Update the latest candle with current price  
          setCandles(prevCandles => {
            if (prevCandles.length === 0) return prevCandles;
            
            const updatedCandles = [...prevCandles];
            const lastCandle = { ...updatedCandles[updatedCandles.length - 1] };
            
            // Update close price and recalculate momentum
            lastCandle.close = newPrice;
            lastCandle.high = Math.max(lastCandle.high, newPrice);
            lastCandle.low = Math.min(lastCandle.low, newPrice);
            lastCandle.isBullish = lastCandle.close >= lastCandle.open;
            
            // Enhanced momentum calculation based on price velocity
            const bodySize = Math.abs(lastCandle.close - lastCandle.open);
            const totalRange = lastCandle.high - lastCandle.low;
            const bodyToRangeRatio = totalRange > 0 ? bodySize / totalRange : 0;
            const priceImpact = lastCandle.open > 0 ? bodySize / lastCandle.open : 0;
            lastCandle.momentum = Math.min((bodyToRangeRatio * priceImpact * Math.abs(change)) * 1000, 100);
            
            updatedCandles[updatedCandles.length - 1] = lastCandle;
            return updatedCandles;
          });
        } catch (err) {
          console.error('[BinanceChart] WebSocket message error:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('[BinanceChart] WebSocket error:', error);
        setIsLiveConnected(false);
      };

      ws.onclose = () => {
        console.log('[BinanceChart] WebSocket disconnected');
        setIsLiveConnected(false);
        
        // Reconnect after 3 seconds if auto-refresh is enabled
        if (isAutoRefresh) {
          setTimeout(() => {
            if (isAutoRefresh) connectWebSocket();
          }, 3000);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[BinanceChart] WebSocket connection error:', err);
      setIsLiveConnected(false);
    }
  }, [symbol, isAutoRefresh]);

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!symbol) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await binanceService.getKlines(symbol, interval, 200);
      setCandles(data);
      
      // Set initial current price
      if (data.length > 0) {
        setCurrentPrice(data[data.length - 1].close);
      }
    } catch (err) {
      console.error('[BinanceChart] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chart data');
    } finally {
      setLoading(false);
    }
  }, [symbol, interval]);

  // Auto-refresh and WebSocket setup
  useEffect(() => {
    fetchData();
    
    // Connect WebSocket for live updates
    if (isAutoRefresh) {
      connectWebSocket();
      refreshIntervalRef.current = window.setInterval(fetchData, 60000); // Reduced frequency since we have live updates
    }
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [fetchData, isAutoRefresh, connectWebSocket]);

  // Pause auto-refresh on interaction
  const pauseAutoRefresh = useCallback(() => {
    setIsAutoRefresh(false);
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    if (panTimeoutRef.current) {
      clearTimeout(panTimeoutRef.current);
    }
    panTimeoutRef.current = window.setTimeout(() => {
      setIsAutoRefresh(true);
    }, 10000);
  }, []);

  // Interaction handlers
  const zoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev * 1.5, 10));
    pauseAutoRefresh();
  }, [pauseAutoRefresh]);

  const zoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev / 1.5, 0.5));
    pauseAutoRefresh();
  }, [pauseAutoRefresh]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsPanning(true);
    setLastPanX(e.clientX);
    pauseAutoRefresh();
  }, [pauseAutoRefresh]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    const deltaX = e.clientX - lastPanX;
    setPanOffset(prev => prev + deltaX / zoomLevel);
    setLastPanX(e.clientX);
  }, [isPanning, lastPanX, zoomLevel]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    pauseAutoRefresh();
  }, [pauseAutoRefresh]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStart) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStart.x;
    if (Math.abs(deltaX) > 10) {
      setPanOffset(prev => prev + deltaX / (zoomLevel * 2));
      setTouchStart({ x: touch.clientX, y: touch.clientY });
    }
  }, [touchStart, zoomLevel]);

  const handleTouchEnd = useCallback(() => {
    setTouchStart(null);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      zoomIn();
    } else {
      zoomOut();
    }
  }, [zoomIn, zoomOut]);

  const handleIntervalChange = useCallback((newInterval: string) => {
    setInterval(newInterval);
    pauseAutoRefresh();
  }, [pauseAutoRefresh]);

  // Calculate visible data
  const visibleCandles = Math.max(10, Math.floor(50 / zoomLevel));
  const startIndex = Math.max(0, Math.min(
    candles.length - visibleCandles,
    candles.length - visibleCandles - Math.floor(panOffset)
  ));
  const endIndex = Math.min(candles.length, startIndex + visibleCandles);
  const displayCandles = candles.slice(startIndex, endIndex);

  // Calculate price range
  const prices = displayCandles.flatMap(c => [c.high, c.low]);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  const padding = priceRange * 0.1;

  const latestCandle = candles[candles.length - 1];

  // Chart height based on device and mode
  const chartHeight = isFullPage 
    ? 'h-[calc(100vh-60px)]' 
    : isMobile 
      ? 'h-[280px] sm:h-[350px]' 
      : 'h-[400px] lg:h-[500px]';

  if (loading && candles.length === 0) {
    return (
      <Card className={cn(chartHeight, "glass overflow-hidden border-0")}>
        <CardContent className="h-full flex items-center justify-center">
          <div className="text-center space-y-3">
            <Activity className="h-6 w-6 sm:h-8 sm:w-8 animate-pulse mx-auto text-primary" />
            <div>
              <p className="text-sm font-semibold">Loading Chart</p>
              <p className="text-xs text-muted-foreground">Fetching data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn(chartHeight, "glass overflow-hidden border-0")}>
        <CardContent className="h-full flex items-center justify-center p-4">
          <div className="text-center space-y-3 max-w-sm">
            <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 mx-auto text-danger" />
            <div>
              <p className="text-sm font-semibold text-danger">Chart Error</p>
              <p className="text-xs text-muted-foreground mb-3 break-words">{error}</p>
              <Button onClick={fetchData} variant="outline" size="sm" className="text-xs">
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(chartHeight, "glass overflow-hidden shadow-xl border-0")}>
      <BinanceChartControls
        symbol={symbol}
        name={name}
        latestCandle={latestCandle}
        interval={interval}
        isAutoRefresh={isAutoRefresh}
        showIntervalMenu={showIntervalMenu}
        intervals={intervals}
        quickIntervals={quickIntervals}
        onIntervalChange={handleIntervalChange}
        onToggleIntervalMenu={() => setShowIntervalMenu(!showIntervalMenu)}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onRefresh={fetchData}
        onClose={onClose}
      />
      
      <CardContent className="p-0 h-[calc(100%-40px)] relative overflow-hidden bg-gradient-to-b from-background to-muted">
        <BinanceChartCanvas
          displayCandles={displayCandles}
          visibleCandles={visibleCandles}
          minPrice={minPrice}
          maxPrice={maxPrice}
          priceRange={priceRange}
          padding={padding}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          zoomLevel={zoomLevel}
          currentPrice={currentPrice}
          priceChange={priceChange}
          isLiveConnected={isLiveConnected}
        />
      </CardContent>
    </Card>
  );
}