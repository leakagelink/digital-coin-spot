
import { supabase } from "@/integrations/supabase/client";

export type CMCPrice = {
  symbol: string;
  name: string;
  price: number;
  percent_change_24h: number;
  market_cap?: number;
};

export const DEFAULT_SYMBOLS = [
  "BTC",
  "ETH",
  "BNB",
  "SOL",
  "XRP",
  "ADA",
  "DOGE",
  "TRX",
  "TON",
  "MATIC",
  "LTC",
  "DOT",
  "BCH",
  "LINK",
  "AVAX",
];

export async function getCryptoPrices(symbols: string[] = DEFAULT_SYMBOLS): Promise<CMCPrice[]> {
  console.log("Invoking edge function cmc-proxy with symbols:", symbols);
  const { data, error } = await supabase.functions.invoke("cmc-proxy", {
    body: { symbols },
  });

  if (error) {
    console.error("cmc-proxy invocation error:", error);
    throw error;
  }
  console.log("cmc-proxy data:", data);
  return data as CMCPrice[];
}
