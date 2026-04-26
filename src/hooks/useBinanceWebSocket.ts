import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";

export type WebSocketPriceData = {
  symbol: string;
  priceUSD: number;
  priceINR: number;
  change24h: number;
  lastUpdate: number;
};

const USD_TO_INR = 84;
const POLLING_INTERVAL = 5000; // 5 second polling

// Global singleton state to prevent multiple instances
let globalPrices: Record<string, WebSocketPriceData> = {};
let globalIsConnected = false;
let globalError: string | null = null;
let globalUpdateCount = 0;
let globalConnectionMode: 'connecting' | 'websocket' | 'polling' = 'connecting';
let pollingInterval: number | null = null;
let isPollingActive = false;
let lastFetchTime = 0;
const subscribers = new Set<() => void>();

function notifySubscribers() {
  subscribers.forEach(callback => callback());
}

function subscribe(callback: () => void) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function getSnapshot() {
  return {
    prices: globalPrices,
    isConnected: globalIsConnected,
    error: globalError,
    updateCount: globalUpdateCount,
    connectionMode: globalConnectionMode,
  };
}

// Fetch prices via edge function proxy
async function fetchPrices(symbols: string[]) {
  const uniqueSymbols = [...new Set(symbols.filter(Boolean).map(s => s.toUpperCase()))];
  if (uniqueSymbols.length === 0) return;

  // Debounce - prevent fetching more than once per second
  const now = Date.now();
  if (now - lastFetchTime < 1000) {
    return;
  }
  lastFetchTime = now;

  try {
    const { data, error: fnError } = await supabase.functions.invoke('binance-proxy', {
      body: { 
        endpoint: 'tickersMulti',
        symbols: uniqueSymbols
      }
    });

    if (fnError) throw fnError;
    
    const newPrices: Record<string, WebSocketPriceData> = {};
    const tickers = Array.isArray(data) ? data : [data];
    
    uniqueSymbols.forEach(symbol => {
      const ticker = tickers.find((t: any) => t.symbol === `${symbol}USDT`);
      if (ticker) {
        const priceUSD = parseFloat(ticker.lastPrice);
        const change24h = parseFloat(ticker.priceChangePercent);
        newPrices[symbol] = {
          symbol,
          priceUSD,
          priceINR: priceUSD * USD_TO_INR,
          change24h,
          lastUpdate: Date.now(),
        };
      }
    });

    if (Object.keys(newPrices).length > 0) {
      globalPrices = newPrices;
      globalUpdateCount++;
      globalIsConnected = true;
      globalError = null;
      globalConnectionMode = 'polling';
      notifySubscribers();
    }
  } catch (e) {
    console.error("Binance proxy error:", e);
    globalError = "Failed to fetch prices";
    notifySubscribers();
  }
}

// Start global polling
function startPolling(symbols: string[]) {
  if (isPollingActive) return;
  isPollingActive = true;
  
  console.log("Starting price polling with symbols:", symbols);
  globalConnectionMode = 'connecting';
  notifySubscribers();
  
  // Immediate first fetch
  fetchPrices(symbols);
  
  // Set up interval
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
  pollingInterval = window.setInterval(() => {
    fetchPrices(symbols);
  }, POLLING_INTERVAL);
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  isPollingActive = false;
}

/**
 * Price data hook using Supabase edge function proxy
 * Uses singleton pattern to prevent multiple API calls
 */
export function useBinanceWebSocket(symbols: string[]) {
  const symbolsKey = symbols.filter(Boolean).map(s => s.toUpperCase()).join(',');
  const symbolsRef = useRef(symbols);
  symbolsRef.current = symbols;
  
  const [localState, setLocalState] = useState(getSnapshot);

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      setLocalState(getSnapshot());
    });
    
    // Start polling if not already active
    if (!isPollingActive && symbols.length > 0) {
      startPolling(symbols);
    }
    
    return () => {
      unsubscribe();
      // Only stop if no more subscribers
      if (subscribers.size === 0) {
        stopPolling();
      }
    };
  }, [symbolsKey]);

  const getPrice = useCallback((symbol: string): WebSocketPriceData | null => {
    return globalPrices[symbol.toUpperCase()] || null;
  }, []);

  const reconnect = useCallback(() => {
    stopPolling();
    globalIsConnected = false;
    globalConnectionMode = 'connecting';
    notifySubscribers();
    startPolling(symbolsRef.current);
  }, []);

  return { 
    prices: localState.prices, 
    isConnected: localState.isConnected, 
    error: localState.error,
    getPrice,
    reconnect,
    updateCount: localState.updateCount,
    connectionMode: localState.connectionMode
  };
}
