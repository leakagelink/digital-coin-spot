
import { supabase } from "@/integrations/supabase/client";

export type TaapiCandle = {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  timestamp?: number; // sometimes provided
  time?: number; // alternate key
};

export async function getTaapiCandles(symbol: string, interval: string = "1m", period: number = 5) {
  const pair = `${symbol}/USDT`;
  const { data, error } = await supabase.functions.invoke("taapi-proxy", {
    body: {
      symbol: pair,
      exchange: "binance",
      interval,
      period,
      indicators: [],
    },
  });

  if (error) {
    console.error("taapi-proxy invocation error:", error);
    throw error;
  }
  return data as { candles: TaapiCandle[] };
}

export async function getLatestTaapiPriceUSD(symbol: string, interval: string = "1m") {
  try {
    const res = await getTaapiCandles(symbol, interval, 5);
    const candles = res?.candles || [];
    if (!Array.isArray(candles) || candles.length === 0) throw new Error("No candles returned");

    // Prefer candle with max timestamp/time, otherwise take last
    const latest = candles.reduce((acc: TaapiCandle, c: TaapiCandle) => {
      const accTs = (acc?.timestamp ?? acc?.time ?? 0) as number;
      const cTs = (c?.timestamp ?? c?.time ?? 0) as number;
      return cTs > accTs ? c : acc;
    }, candles[candles.length - 1]);

    const close = Number(latest?.close);
    if (!close || close <= 0) throw new Error("Invalid close price from TAAPI");
    return close; // USD/USDT
  } catch (e) {
    console.error("Failed to fetch TAAPI price for", symbol, e);
    throw e;
  }
}
