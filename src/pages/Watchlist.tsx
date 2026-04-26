
import { useState, useMemo } from "react";
import { Layout } from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AddCryptoModal } from "@/components/watchlist/add-crypto-modal";
import { usePriceData } from "@/hooks/usePriceData";
import { useNavigate } from "react-router-dom";

const Watchlist = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAddCryptoModal, setShowAddCryptoModal] = useState(false);
  
  const { data: watchlist, isLoading, refetch } = useQuery({
    queryKey: ['watchlist', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('watchlist')
        .select('*')
        .eq('user_id', user?.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Get unique symbols from watchlist for TAAPI
  const symbols = useMemo(() => 
    watchlist?.map(item => item.symbol) || [], 
    [watchlist]
  );
  
  const { prices: taapiPrices, isLoading: pricesLoading } = usePriceData(symbols);

  // Calculate momentum from TAAPI prices
  const pricesWithMomentum = useMemo(() => {
    const priceHistory: Record<string, number[]> = {};
    
    return symbols.map(symbol => {
      const priceData = taapiPrices[symbol];
      if (!priceData) return null;
      
      // Track price history for momentum
      if (!priceHistory[symbol]) priceHistory[symbol] = [];
      priceHistory[symbol].push(priceData.priceUSD);
      if (priceHistory[symbol].length > 10) priceHistory[symbol].shift();
      
      // Calculate momentum
      let momentum = 0;
      if (priceHistory[symbol].length >= 2) {
        const changes = priceHistory[symbol].map((p, i, arr) => 
          i > 0 ? ((p - arr[i-1]) / arr[i-1]) * 100 : 0
        );
        momentum = Math.abs(changes.reduce((sum, c) => sum + c, 0));
      }
      
      const changePercent = priceHistory[symbol].length >= 2 
        ? ((priceData.priceUSD - priceHistory[symbol][0]) / priceHistory[symbol][0]) * 100 
        : 0;
      
      return {
        symbol,
        price: priceData.priceUSD,
        priceINR: priceData.priceINR,
        momentum,
        changePercent,
        lastUpdate: priceData.lastUpdate
      };
    }).filter(Boolean);
  }, [taapiPrices, symbols]);

  // Minimum trading amounts for different coins
  const getMinimumAmount = (symbol: string) => {
    if (symbol === 'BTC' || symbol === 'ETH') return 350;
    if (symbol === 'XRP' || symbol === 'DOGE') return 50;
    return 150; // Default for other coins
  };

  const handleCryptoAdded = () => {
    refetch();
  };

  const handleChartClick = (symbol: string, name: string) => {
    const tradingSymbol = `${symbol}USDT`;
    navigate(`/chart/${tradingSymbol}`);
  };

  const lastUpdate = pricesWithMomentum.length > 0 && pricesWithMomentum[0] 
    ? pricesWithMomentum[0].lastUpdate 
    : Date.now();
  const isLive = pricesWithMomentum.length > 0;

  return (
    <Layout>
      <div className="space-y-6 animate-slide-up pb-20 md:pb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Eye className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold gradient-text">Watchlist</h1>
            {isLive && (
              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30 animate-pulse">
                LIVE
              </Badge>
            )}
          </div>
          
          <Button 
            size="sm" 
            className="bg-gradient-primary shrink-0"
            onClick={() => setShowAddCryptoModal(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Crypto
          </Button>
        </div>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Your Watchlist</span>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/30">
                  Live Momentum Active
                </Badge>
                {lastUpdate > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Updated {Math.floor((Date.now() - lastUpdate) / 1000)}s ago
                  </span>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || pricesLoading ? (
              <div className="text-center py-8">
                <div className="flex items-center justify-center gap-3">
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-muted-foreground">Loading live prices and momentum...</p>
                </div>
              </div>
            ) : watchlist && watchlist.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {watchlist.map((item) => {
                  const livePrice = pricesWithMomentum.find(p => p?.symbol === item.symbol);
                  
                  return (
                    <div key={item.id} className="p-6 border rounded-xl glass hover:border-primary/30 hover:shadow-lg hover:shadow-primary/20 transition-all duration-300">
                      <div className="space-y-4">
                        {/* Header with coin info */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-bold text-xl gradient-text">{item.symbol}</h3>
                            <p className="text-sm text-muted-foreground mb-2">{item.coin_name}</p>
                            
                            {/* Live Momentum Badge */}
                            {livePrice && (
                              <Badge 
                                variant="outline" 
                                className={`text-xs font-medium px-3 py-1 animate-pulse ${
                                  livePrice.momentum > 15 ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                                  livePrice.momentum > 8 ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' :
                                  'bg-green-500/15 text-green-400 border-green-500/30'
                                }`}
                              >
                                🔥 Live Momentum: {livePrice.momentum.toFixed(1)}
                              </Badge>
                            )}
                            
                            {!livePrice && (
                              <Badge variant="outline" className="text-xs bg-muted/50 text-muted-foreground">
                                Price loading...
                              </Badge>
                            )}
                          </div>
                          
                          {livePrice && (
                            <div className="text-right">
                              <div className={`text-sm font-bold ${
                                livePrice.changePercent > 0 ? 'text-success' : 
                                livePrice.changePercent < 0 ? 'text-danger' : 
                                'text-muted-foreground'
                              }`}>
                                {livePrice.changePercent > 0 ? '+' : ''}{livePrice.changePercent.toFixed(2)}%
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Price display */}
                        {livePrice && (
                          <div className="space-y-2">
                            <div className="text-2xl font-bold gradient-text">
                              ₹{livePrice.priceINR.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              ${livePrice.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-primary/70">
                              Live updated {Math.floor((Date.now() - livePrice.lastUpdate) / 1000)}s ago
                            </div>
                            <div className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded mt-2">
                              Min Trade: ${getMinimumAmount(item.symbol)} USDT
                            </div>
                          </div>
                        )}

                        {/* Action button */}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full border-primary/30 hover:bg-primary/10"
                          onClick={() => handleChartClick(item.symbol, item.coin_name)}
                        >
                          View Chart
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No cryptocurrencies in your watchlist</p>
                <Button 
                  className="mt-4 bg-gradient-primary"
                  onClick={() => setShowAddCryptoModal(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Crypto
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <AddCryptoModal
          isOpen={showAddCryptoModal}
          onClose={() => setShowAddCryptoModal(false)}
          onCryptoAdded={handleCryptoAdded}
        />
      </div>
    </Layout>
  );
};

export default Watchlist;
