
import { Layout } from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUpIcon, TrendingDown, Activity } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { TradingModal } from "@/components/trading/trading-modal";
import { useToast } from "@/hooks/use-toast";
import { usePositionUpdater } from "@/hooks/usePositionUpdater";
import { usePriceData } from "@/hooks/usePriceData";
import { usePositionCalculations } from "@/hooks/usePositionCalculations";

type PortfolioPosition = {
  id: string;
  symbol: string;
  coin_name: string;
  amount: number;
  buy_price: number;
  current_price: number;
  total_investment: number;
  current_value: number;
  pnl: number;
  pnl_percentage: number;
  admin_adjustment_pct?: number;
  admin_price_override?: boolean;
};

const Portfolio = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedCrypto, setSelectedCrypto] = useState<{
    symbol: string;
    name: string;
    currentPrice: number;
  } | null>(null);
  const [isTradingModalOpen, setIsTradingModalOpen] = useState(false);

  // Get minimum trading amount for each coin
  const getMinimumAmount = (symbol: string) => {
    if (symbol === 'BTC' || symbol === 'ETH') return 350;
    if (symbol === 'XRP' || symbol === 'DOGE') return 50;
    return 150; // Default for other coins
  };

  // Fetch positions from database
  const { data: positions, isLoading, refetch } = useQuery({
    queryKey: ["portfolio-positions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("portfolio_positions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PortfolioPosition[];
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Get symbols for price fetching
  const symbolsForPrices = (positions || []).map(p => p.symbol);
  
  // Fetch live prices (separate from database updates)
  const { prices: livePrices, updateCount } = usePriceData(symbolsForPrices);
  
  // Calculate live P&L for display (doesn't affect database)
  // This also handles admin-adjusted positions with simulated momentum
  const updatedPositions = usePositionCalculations(positions, livePrices);
  
  // Calculate momentum for each position (for non-admin-adjusted positions)
  const priceHistoryRef = useRef<Record<string, number[]>>({});
  
  const positionsWithMomentum = useMemo(() => {
    if (!updatedPositions || !livePrices) return updatedPositions || [];
    
    return updatedPositions.map(position => {
      // Check if this is an admin-adjusted position
      const isAdminAdjusted = (position as any)._isAdminAdjusted;
      
      if (isAdminAdjusted) {
        // Use simulated momentum for admin-adjusted positions
        const simulatedMomentum = (position as any)._simulatedMomentum || 0;
        const simulatedDirection = (position as any)._simulatedDirection || 1;
        return { 
          ...position, 
          momentum: simulatedMomentum, 
          isUp: simulatedDirection > 0,
          isAdminAdjusted: true 
        };
      }
      
      // For normal positions: use live market momentum
      const priceData = livePrices[position.symbol];
      if (!priceData) return { ...position, momentum: 0, isUp: true, isAdminAdjusted: false };
      
      // Track price history for momentum
      const symbol = position.symbol;
      if (!priceHistoryRef.current[symbol]) priceHistoryRef.current[symbol] = [];
      priceHistoryRef.current[symbol].push(priceData.priceUSD);
      if (priceHistoryRef.current[symbol].length > 10) priceHistoryRef.current[symbol].shift();
      
      // Calculate momentum and direction
      let momentum = 0;
      let isUp = true;
      if (priceHistoryRef.current[symbol].length >= 2) {
        const arr = priceHistoryRef.current[symbol];
        const changes = arr.map((p, i, a) => i > 0 ? ((p - a[i-1]) / a[i-1]) * 100 : 0);
        momentum = Math.abs(changes.reduce((sum, c) => sum + c, 0));
        isUp = arr[arr.length - 1] >= arr[arr.length - 2];
      }
      
      return { ...position, momentum, isUp, isAdminAdjusted: false };
    });
  }, [updatedPositions, livePrices, updateCount]);
  
  // Background updater (syncs DB with live prices)
  usePositionUpdater(user?.id);

  // Realtime: auto-refresh when positions change
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('portfolio_positions_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'portfolio_positions', filter: `user_id=eq.${user.id}` },
        () => refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetch]);

  const totalInvestment = positionsWithMomentum?.reduce((sum, p) => sum + p.total_investment, 0) || 0;
  const totalCurrentValue = positionsWithMomentum?.reduce((sum, p) => sum + p.current_value, 0) || 0;
  const totalPnL = totalCurrentValue - totalInvestment;
  const totalPnLPercentage = totalInvestment > 0 ? (totalPnL / totalInvestment) * 100 : 0;

  const handleTradeClick = (position: PortfolioPosition) => {
    const livePriceUSD = livePrices[position.symbol]?.priceUSD ?? (Number(position.current_price) / 84);
    setSelectedCrypto({
      symbol: position.symbol + 'USDT',
      name: position.coin_name,
      currentPrice: livePriceUSD,
    });
    setIsTradingModalOpen(true);
  };

  const handleTradingModalClose = () => {
    setIsTradingModalOpen(false);
    setSelectedCrypto(null);
    refetch(); // Refresh portfolio data after trade
  };

  const handleClosePosition = async (position: PortfolioPosition) => {
    if (!user) return;

    try {
      // Calculate proceeds: return original investment + P&L
      const proceeds = position.current_value;

      // Delete the position
      const { error: positionError } = await supabase
        .from('portfolio_positions')
        .delete()
        .eq('id', position.id);

      if (positionError) throw positionError;

      // Update wallet balance
      const { data: walletData, error: walletFetchError } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (walletFetchError) throw walletFetchError;

      const { error: walletError } = await supabase
        .from('wallets')
        .update({
          balance: Number(walletData.balance) + proceeds,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (walletError) throw walletError;

      // Record the trade
      const { error: tradeError } = await supabase
        .from('trades')
        .insert({
          user_id: user.id,
          symbol: position.symbol,
          coin_name: position.coin_name,
          trade_type: 'sell',
          quantity: position.amount,
          price: position.current_price,
          total_amount: proceeds,
          status: 'completed',
        });

      if (tradeError) throw tradeError;

      toast({
        title: "Position closed successfully",
        description: `Sold ${position.amount.toFixed(6)} ${position.symbol} for ₹${proceeds.toFixed(2)}`,
      });

      refetch(); // Refresh portfolio data
    } catch (error: any) {
      console.error('Error closing position:', error);
      toast({
        title: "Error closing position",
        description: error.message || "Failed to close position",
        variant: "destructive"
      });
    }
  };

  return (
    <Layout>
      <div className="space-y-6 animate-slide-up pb-20 md:pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl font-bold gradient-text">Portfolio</h1>
        </div>


        {/* Holdings */}
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUpIcon className="h-5 w-5" />
                Your Holdings
              </CardTitle>
              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                <Activity className="h-3 w-3 mr-1 animate-pulse" />
                LIVE
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-6 text-muted-foreground">Loading...</div>
            ) : positionsWithMomentum && positionsWithMomentum.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-1">
                {positionsWithMomentum.map((position) => {
                  const isPositive = position.pnl >= 0;
                  const momentum = (position as any).momentum || 0;
                  const isUp = (position as any).isUp !== false;
                  const isAdminAdjusted = (position as any).isAdminAdjusted === true;
                  
                  return (
                    <div key={position.id} className="p-4 border rounded-lg bg-card/50 hover:bg-card/80 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-lg">{position.symbol}</span>
                                {/* Live Momentum Badge with direction */}
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs font-medium px-2 py-1 animate-pulse ${
                                    momentum > 15 ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                                    momentum > 8 ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' :
                                    'bg-green-500/15 text-green-400 border-green-500/30'
                                  }`}
                                >
                                  {isUp ? <TrendingUpIcon className="h-3 w-3 mr-1 inline text-green-500" /> : <TrendingDown className="h-3 w-3 mr-1 inline text-red-500" />}
                                  🔥 {momentum.toFixed(1)}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{position.coin_name}</p>
                              <div className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded mt-1">
                                Min Trade: ${getMinimumAmount(position.symbol)} USDT
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Holdings</p>
                              <p className="font-medium">{Number(position.amount).toLocaleString("en-IN", { maximumFractionDigits: 6 })}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Avg Price</p>
                              <p className="font-medium">
                                ${(Number(position.buy_price) / 84).toFixed(2)} USDT
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ₹{Number(position.buy_price).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Current Price</p>
                              <p className="font-medium">
                                ${(Number(position.current_price) / 84).toFixed(2)} USDT
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ₹{Number(position.current_price).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Investment</p>
                              <p className="font-medium">
                                ${(Number(position.total_investment) / 84).toFixed(2)} USDT
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ₹{Number(position.total_investment).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col sm:items-end gap-3">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Current Value</p>
                            <p className="font-bold text-lg">
                              ${(position.current_value / 84).toFixed(2)} USDT
                            </p>
                            <p className="text-sm text-muted-foreground">
                              ₹{position.current_value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                            </p>
                          </div>
                          
                          <div className="text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                {isPositive ? '+' : ''}${(position.pnl / 84).toFixed(2)} USDT
                              </span>
                              <span className={`text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                {isPositive ? '+' : ''}₹{position.pnl.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                              </span>
                              <Badge 
                                variant={isPositive ? "default" : "destructive"}
                                className={`text-xs ${
                                  isPositive 
                                    ? 'bg-green-50 text-green-700 border-green-200' 
                                    : 'bg-red-50 text-red-700 border-red-200'
                                }`}
                              >
                                {isPositive ? '+' : ''}{position.pnl_percentage.toFixed(2)}%
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex gap-2 w-full sm:w-auto">
                            <Button
                              size="sm"
                              onClick={() => handleTradeClick(position)}
                              className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none"
                            >
                              Trade
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleClosePosition(position)}
                              className="bg-red-600 hover:bg-red-700 flex-1 sm:flex-none"
                            >
                              Close
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/20 flex items-center justify-center">
                  <TrendingUpIcon className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No holdings yet</p>
                <p className="text-muted-foreground/70 text-xs mt-1">Start trading to build your portfolio!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trading Modal */}
      {selectedCrypto && (
        <TradingModal
          isOpen={isTradingModalOpen}
          onClose={handleTradingModalClose}
          symbol={selectedCrypto.symbol}
          name={selectedCrypto.name}
          currentPrice={selectedCrypto.currentPrice}
        />
      )}
    </Layout>
  );
};

export default Portfolio;
