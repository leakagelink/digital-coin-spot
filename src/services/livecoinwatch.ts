
interface LiveCoinWatchCoin {
  code: string;
  name: string;
  rate: number;
  delta: {
    hour: number;
    day: number;
    week: number;
    month: number;
    quarter: number;
    year: number;
  };
  cap: number;
  volume: number;
  circulatingSupply: number;
  totalSupply: number;
  maxSupply: number;
  markets: number;
}

interface LiveCoinWatchResponse {
  data: LiveCoinWatchCoin[];
}

export interface LCWPrice {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
}

class LiveCoinWatchService {
  private apiKey = '8e41e1cd-fed1-4383-b85c-e997c8574cfd';
  private baseUrl = 'https://api.livecoinwatch.com';

  // Popular crypto symbols to fetch
  private cryptoCodes = ['BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'USDT'];

  async getCryptoPrices(): Promise<LCWPrice[]> {
    try {
      const response = await fetch(`${this.baseUrl}/coins/map`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          codes: this.cryptoCodes,
          currency: 'USD',
          sort: 'rank',
          order: 'ascending',
          offset: 0,
          limit: 10,
          meta: false
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      return data.map((coin: LiveCoinWatchCoin) => ({
        symbol: coin.code,
        name: coin.name,
        price: coin.rate,
        change24h: coin.delta.day,
        marketCap: coin.cap,
        volume24h: coin.volume,
      }));
    } catch (error) {
      console.error('Error fetching data from LiveCoinWatch:', error);
      throw error;
    }
  }

  async getCryptoPrice(code: string): Promise<LCWPrice> {
    try {
      const response = await fetch(`${this.baseUrl}/coins/single`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          code: code,
          currency: 'USD',
          meta: false
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const coin: LiveCoinWatchCoin = await response.json();
      
      return {
        symbol: coin.code,
        name: coin.name,
        price: coin.rate,
        change24h: coin.delta.day,
        marketCap: coin.cap,
        volume24h: coin.volume,
      };
    } catch (error) {
      console.error('Error fetching crypto price from LiveCoinWatch:', error);
      throw error;
    }
  }
}

export const liveCoinWatchService = new LiveCoinWatchService();
