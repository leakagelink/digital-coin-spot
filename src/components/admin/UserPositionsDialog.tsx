
import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, X, TrendingUp, TrendingDown, Plus, Minus, Activity } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { usePriceData } from "@/hooks/usePriceData";
import { usePositionCalculations } from "@/hooks/usePositionCalculations";

interface UserPositionsDialogProps {
  userId: string;
  userLabel?: string;
}

type Position = {
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
  position_type: string;
  status: string;
  created_at: string;
  admin_adjustment_pct?: number;
  admin_price_override?: boolean;
};

export function UserPositionsDialog({ userId, userLabel }: UserPositionsDialogProps) {
  const [open, setOpen] = useState(false);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(false);
  const [closingPosition, setClosingPosition] = useState<string | null>(null);
  const [adjustingPosition, setAdjustingPosition] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const fetchPositions = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      console.log(`Fetching positions for user: ${userId}`);
      const { data, error } = await supabase
        .from('portfolio_positions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching positions:', error);
        toast({
          title: "Error",
          description: "Failed to load positions",
          variant: "destructive"
        });
        return;
      }
      
      console.log(`Found ${data?.length || 0} positions for user`);
      setPositions(data || []);
    } catch (error) {
      console.error('Exception fetching positions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchPositions();
    }
  }, [open, userId]);

  // Get symbols for live prices
  const symbolsForPrices = positions.map(p => p.symbol);
  const { prices: livePrices, updateCount } = usePriceData(symbolsForPrices);
  
  // Calculate live P&L and momentum for display
  const displayPositions = usePositionCalculations(positions, livePrices);
  
  // Calculate momentum for each position
  const priceHistoryRef = useRef<Record<string, number[]>>({});
  
  const positionsWithMomentum = useMemo(() => {
    return displayPositions.map(position => {
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
      
      // Calculate momentum
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
  }, [displayPositions, livePrices, updateCount]);

  const adjustPnlPercentage = async (positionId: string, percentageChange: number) => {
    if (!user) return;
    
    setAdjustingPosition(positionId);
    try {
      const position = positions.find(p => p.id === positionId);
      if (!position) {
        throw new Error('Position not found');
      }

      // Get the CURRENT admin_adjustment_pct and add to it
      const currentAdjustment = Number(position.admin_adjustment_pct) || 0;
      const newAdjustment = currentAdjustment + percentageChange;

      console.log(`Adjusting P&L for position ${positionId}: ${currentAdjustment}% -> ${newAdjustment}%`);

      // Update position with new admin_adjustment_pct
      // The frontend will use this to calculate the simulated P&L
      const { error } = await supabase
        .from('portfolio_positions')
        .update({
          admin_adjustment_pct: newAdjustment,
          admin_price_override: true, // Flag to disconnect from live prices
          updated_at: new Date().toISOString(),
        })
        .eq('id', positionId);

      if (error) throw error;

      toast({
        title: "P&L updated",
        description: `Total adjustment now: ${newAdjustment > 0 ? '+' : ''}${newAdjustment}%`,
      });

      // Refresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-users-overview'] }),
        queryClient.invalidateQueries({ queryKey: ['portfolio-positions'] }),
        queryClient.invalidateQueries({ queryKey: ['trades'] }),
      ]);
      
      fetchPositions();

    } catch (error: any) {
      console.error('Error adjusting position:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to adjust position",
        variant: "destructive"
      });
    } finally {
      setAdjustingPosition(null);
    }
  };

  const closePosition = async (positionId: string, symbol: string, positionType: string) => {
    if (!user) return;
    
    setClosingPosition(positionId);
    try {
      console.log(`Admin closing position: ${positionId} for ${symbol} ${positionType}`);
      
      const position = positions.find(p => p.id === positionId);
      if (!position) {
        throw new Error('Position not found');
      }

      // Get current user balance
      const { data: walletData } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .single();

      const currentBalance = Number(walletData?.balance || 0);
      
      // Calculate proceeds using current price and amount to get the correct value after admin edits
      const proceeds = position.amount * position.current_price;

      console.log(`Closing position with calculated proceeds: ₹${proceeds}`);

      // Delete the position (close it)
      const { error: deleteError } = await supabase
        .from('portfolio_positions')
        .delete()
        .eq('id', positionId);

      if (deleteError) {
        console.error('Error deleting position:', deleteError);
        throw deleteError;
      }

      // Update user wallet (add proceeds from position closure)
      const { error: walletError } = await supabase
        .from('wallets')
        .update({
          balance: currentBalance + proceeds,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (walletError) {
        console.error('Error updating wallet:', walletError);
        throw walletError;
      }

      // Record sell trade for the closure
      const { error: tradeError } = await supabase
        .from('trades')
        .insert({
          user_id: userId,
          symbol: position.symbol,
          coin_name: position.coin_name,
          trade_type: 'sell',
          quantity: position.amount,
          price: position.current_price,
          total_amount: proceeds,
          status: 'completed',
        });

      if (tradeError) {
        console.error('Error recording trade:', tradeError);
        throw tradeError;
      }

      toast({
        title: "Position closed successfully",
        description: `Closed ${symbol} ${positionType} position and credited ₹${proceeds.toFixed(2)} to user`,
      });

      console.log(`Position closed successfully, credited ₹${proceeds} to user wallet`);

      // Refresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-users-overview'] }),
        queryClient.invalidateQueries({ queryKey: ['portfolio'] }),
        queryClient.invalidateQueries({ queryKey: ['trades'] }),
      ]);
      
      // Refresh positions list
      fetchPositions();

    } catch (error: any) {
      console.error('Error closing position:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to close position",
        variant: "destructive"
      });
    } finally {
      setClosingPosition(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Eye className="h-4 w-4 mr-1" />
          Positions ({positions.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>
            Open Positions {userLabel ? `for ${userLabel}` : ""} ({positions.length})
          </DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="text-center py-6 text-muted-foreground">Loading positions...</div>
        ) : positions.length > 0 ? (
          <div className="w-full overflow-x-auto max-h-96">
            <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
              <Activity className="h-3 w-3 animate-pulse text-green-500" />
              <span>Live prices updating every 5s</span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Coin</TableHead>
                  <TableHead>Momentum</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Buy Price</TableHead>
                  <TableHead className="text-right">Live Price</TableHead>
                  <TableHead className="text-right">Investment</TableHead>
                  <TableHead className="text-right">Current Value</TableHead>
                  <TableHead className="text-right">P&L</TableHead>
                  <TableHead>P&L Adjust</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positionsWithMomentum.map((position) => (
                  <TableRow key={position.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold">{position.symbol}</div>
                        <div className="text-xs text-muted-foreground">{position.coin_name}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge 
                          variant="outline" 
                          className={`text-xs font-medium animate-pulse ${
                            position.momentum > 15 ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                            position.momentum > 8 ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' :
                            'bg-green-500/15 text-green-400 border-green-500/30'
                          }`}
                        >
                          {position.isUp ? <TrendingUp className="h-3 w-3 mr-1 inline" /> : <TrendingDown className="h-3 w-3 mr-1 inline" />}
                          🔥 {position.momentum.toFixed(1)}
                        </Badge>
                        {position.isAdminAdjusted && (
                          <Badge variant="secondary" className="text-xs bg-purple-500/15 text-purple-400 border-purple-500/30">
                            EDITED
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={position.position_type === 'long' ? 'default' : 'secondary'}
                        className={`capitalize ${
                          position.position_type === 'long' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {position.position_type === 'long' ? (
                          <><TrendingUp className="h-3 w-3 mr-1" /> Long</>
                        ) : (
                          <><TrendingDown className="h-3 w-3 mr-1" /> Short</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {Number(position.amount).toFixed(6)}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{Number(position.buy_price).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className={position.isUp ? 'text-green-600' : 'text-red-600'}>
                        ₹{Number(position.current_price).toFixed(2)}
                        {position.isAdminAdjusted && (
                          <span className="text-purple-400 text-xs ml-1">⚡</span>
                        )}
                      </div>
                      {!position.isAdminAdjusted && (
                        <div className="text-xs text-muted-foreground">
                          ${(livePrices[position.symbol]?.priceUSD ?? Number(position.current_price) / 84).toFixed(2)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{Number(position.total_investment).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      ₹{Number(position.current_value).toFixed(2)}
                    </TableCell>
                    <TableCell className={`text-right ${Number(position.pnl) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{Number(position.pnl).toFixed(2)}
                      <div className="text-xs">
                        ({Number(position.pnl_percentage).toFixed(2)}%)
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => adjustPnlPercentage(position.id, 5)}
                          disabled={adjustingPosition === position.id}
                          className="text-green-600 hover:text-green-700"
                          title="Increase P&L by 5%"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                           onClick={() => adjustPnlPercentage(position.id, -5)}
                          disabled={adjustingPosition === position.id}
                          className="text-red-600 hover:text-red-700"
                          title="Decrease P&L by 5%"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => closePosition(position.id, position.symbol, position.position_type)}
                        disabled={closingPosition === position.id}
                      >
                        <X className="h-4 w-4 mr-1" />
                        {closingPosition === position.id ? 'Closing...' : 'Close'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <p>No open positions found</p>
            <p className="text-sm mt-2">User has no open trading positions</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
