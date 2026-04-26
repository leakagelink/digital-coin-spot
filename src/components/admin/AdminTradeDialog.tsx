
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";

interface AdminTradeDialogProps {
  userId: string;
  userLabel?: string;
  onSuccess?: () => void;
}

type TradeMode = 'quantity' | 'amount';

const POPULAR_COINS = [
  { symbol: 'BTC', name: 'Bitcoin' },
  { symbol: 'ETH', name: 'Ethereum' },
  { symbol: 'BNB', name: 'Binance Coin' },
  { symbol: 'XRP', name: 'Ripple' },
  { symbol: 'ADA', name: 'Cardano' },
  { symbol: 'DOGE', name: 'Dogecoin' },
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'MATIC', name: 'Polygon' },
];

export function AdminTradeDialog({ userId, userLabel, onSuccess }: AdminTradeDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<string>("");
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [mode, setMode] = useState<TradeMode>('amount');
  const [quantity, setQuantity] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [livePrice, setLivePrice] = useState<number>(0);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user balance when dialog opens
  useEffect(() => {
    if (!open || !userId) return;
    
    const fetchUserBalance = async () => {
      const { data, error } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching user balance:', error);
        setUserBalance(0);
      } else {
        setUserBalance(Number(data?.balance || 0));
      }
    };
    
    fetchUserBalance();
  }, [open, userId]);

  // Fetch live price when coin is selected
  useEffect(() => {
    if (!selectedCoin || !open) return;

    const fetchPrice = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('binance-proxy', {
          body: { 
            endpoint: 'ticker',
            symbol: selectedCoin
          }
        });

        if (error) throw error;

        if (data?.lastPrice) {
          const priceUSD = parseFloat(data.lastPrice);
          const priceINR = priceUSD * 84;
          setLivePrice(priceINR);
          setPrice(priceINR.toFixed(2));
        }
      } catch (e) {
        console.error('Error fetching live price:', e);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 5000);
    return () => clearInterval(interval);
  }, [selectedCoin, open]);

  const selectedCoinData = POPULAR_COINS.find(coin => coin.symbol === selectedCoin);
  const parsedPrice = parseFloat(price || '0');
  const parsedQty = parseFloat(quantity || '0');
  const parsedAmount = parseFloat(amount || '0');

  // Calculate quantity and total based on mode
  const computed = {
    qty: mode === 'amount' ? (parsedPrice > 0 ? parsedAmount / parsedPrice : 0) : parsedQty,
    total: mode === 'amount' ? parsedAmount : parsedQty * parsedPrice,
  };

  const handleSubmit = async () => {
    if (!user || !selectedCoin || !price) {
      toast({
        title: "Missing information",
        description: "Please select a coin and enter price",
        variant: "destructive"
      });
      return;
    }

    if (computed.qty <= 0 || computed.total <= 0) {
      toast({
        title: "Invalid input",
        description: "Enter a valid quantity or amount",
        variant: "destructive"
      });
      return;
    }

    // For buy trades, check if user has sufficient balance
    if (tradeType === 'buy' && userBalance < computed.total) {
      toast({
        title: "Insufficient balance",
        description: `User needs ₹${computed.total.toFixed(2)} but only has ₹${userBalance.toFixed(2)}`,
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    
    try {
      console.log(`Admin executing ${tradeType}: ${computed.qty} ${selectedCoin} at ₹${parsedPrice} for user ${userId}`);

      const { data: existingPosition, error: existingErr } = await supabase
        .from('portfolio_positions')
        .select('*')
        .eq('user_id', userId)
        .eq('symbol', selectedCoin)
        .maybeSingle();

      if (existingErr) {
        console.warn('Existing position lookup error:', existingErr);
      }

      if (tradeType === 'buy') {
        if (existingPosition) {
          const oldQty = Number(existingPosition.amount || 0);
          const newQty = oldQty + computed.qty;
          const oldInvestment = Number(
            existingPosition.total_investment ??
            (oldQty * Number(existingPosition.buy_price || 0))
          );
          const newTotalInvestment = oldInvestment + computed.total;
          const newAvgPrice = newQty > 0 ? newTotalInvestment / newQty : parsedPrice;

          const { error } = await supabase
            .from('portfolio_positions')
            .update({
              amount: newQty,
              buy_price: newAvgPrice,
              current_price: parsedPrice,
              total_investment: newTotalInvestment,
              current_value: newQty * parsedPrice,
              pnl: (newQty * parsedPrice) - newTotalInvestment,
              pnl_percentage: newTotalInvestment > 0 ? (((newQty * parsedPrice) - newTotalInvestment) / newTotalInvestment) * 100 : 0,
              updated_at: new Date().toISOString(),
              admin_price_override: true,
            })
            .eq('id', existingPosition.id);
          
          if (error) throw error;
          console.log(`Updated existing position for ${selectedCoin}`);
        } else {
          // Ensure all numeric values are properly set as numbers
          const positionData = {
            user_id: userId,
            symbol: selectedCoin,
            coin_name: selectedCoinData?.name || selectedCoin,
            amount: Number(computed.qty) || 0,
            buy_price: Number(parsedPrice) || 0,
            current_price: Number(parsedPrice) || 0,
            total_investment: Number(computed.total) || 0,
            current_value: Number(computed.total) || 0,
            pnl: 0,
            pnl_percentage: 0,
            position_type: 'long',
            status: 'open',
            admin_price_override: true,
            admin_adjustment_pct: 0,
          };

          console.log('Creating new position with data:', positionData);

          const { error } = await supabase
            .from('portfolio_positions')
            .insert(positionData);
          
          if (error) throw error;
          console.log(`Created new position for ${selectedCoin}`);
        }

        // Deduct money from user wallet
        const { error: walletError } = await supabase
          .from('wallets')
          .update({
            balance: userBalance - computed.total,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (walletError) throw walletError;
        console.log(`Deducted ₹${computed.total} from user wallet`);
      } else {
        // Handle sell
        if (!existingPosition) {
          throw new Error(`No position found for ${selectedCoin} to sell`);
        }

        if (Number(existingPosition.amount) < computed.qty) {
          throw new Error("Insufficient quantity to sell");
        }

        const newAmount = Number(existingPosition.amount) - computed.qty;
        const proceeds = computed.qty * parsedPrice;

        if (newAmount === 0) {
          const { error } = await supabase
            .from('portfolio_positions')
            .delete()
            .eq('id', existingPosition.id);
          
          if (error) throw error;
          console.log(`Completely closed position for ${selectedCoin}`);
        } else {
          const oldInvestment = Number(
            existingPosition.total_investment ?? 
            (Number(existingPosition.amount) * Number(existingPosition.buy_price))
          );
          const newTotalInvestment = Math.max(0, oldInvestment - (computed.qty * Number(existingPosition.buy_price)));
          
          const { error } = await supabase
            .from('portfolio_positions')
            .update({
              amount: newAmount,
              current_price: parsedPrice,
              total_investment: newTotalInvestment,
              current_value: newAmount * parsedPrice,
              pnl: (newAmount * parsedPrice) - newTotalInvestment,
              pnl_percentage: newTotalInvestment > 0 ? (((newAmount * parsedPrice) - newTotalInvestment) / newTotalInvestment) * 100 : 0,
              updated_at: new Date().toISOString(),
              admin_price_override: true,
            })
            .eq('id', existingPosition.id);
          
          if (error) throw error;
          console.log(`Partially closed position for ${selectedCoin}`);
        }

        // Add proceeds to user wallet
        const { error: walletError } = await supabase
          .from('wallets')
          .update({
            balance: userBalance + proceeds,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (walletError) throw walletError;
        console.log(`Added ₹${proceeds} to user wallet`);
      }

      // Record the trade
      const tradeData = {
        user_id: userId,
        symbol: selectedCoin,
        coin_name: selectedCoinData?.name || selectedCoin,
        trade_type: tradeType,
        quantity: computed.qty,
        price: parsedPrice,
        total_amount: computed.total,
        status: 'completed',
      };

      const { error: tradeError } = await supabase
        .from('trades')
        .insert(tradeData);

      if (tradeError) throw tradeError;

      toast({
        title: "Trade executed successfully",
        description: `${tradeType.toUpperCase()}: ${computed.qty.toFixed(6)} ${selectedCoin} at ₹${parsedPrice.toLocaleString('en-IN')} for ${userLabel}`,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-users-overview'] }),
        queryClient.invalidateQueries({ queryKey: ['portfolio'] }),
        queryClient.invalidateQueries({ queryKey: ['portfolio-positions'] }),
        queryClient.invalidateQueries({ queryKey: ['portfolio-positions', userId] }),
        queryClient.invalidateQueries({ queryKey: ['trades'] }),
        queryClient.invalidateQueries({ queryKey: ['trades', userId] }),
        queryClient.invalidateQueries({ queryKey: ['wallet', userId] }),
        queryClient.invalidateQueries({ queryKey: ['my-trades'] }),
      ]);
      
      setOpen(false);
      setSelectedCoin("");
      setQuantity("");
      setAmount("");
      setPrice("");
      setTradeType('buy');
      setMode('amount');
      
      onSuccess?.();

    } catch (error: any) {
      console.error('Error executing admin trade:', error);
      toast({
        title: "Trade failed",
        description: error.message || "Failed to execute trade",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
          <TrendingUp className="h-4 w-4 mr-1" />
          Trade
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Execute Trade {userLabel ? `for ${userLabel}` : ""}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>User Balance: ₹{userBalance.toLocaleString("en-IN")}</span>
          {selectedCoin && livePrice > 0 && (
            <span className="text-primary font-mono">
              Live: ₹{livePrice.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
            </span>
          )}
        </div>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="coin-select">Select Coin</Label>
            <Select value={selectedCoin} onValueChange={setSelectedCoin}>
              <SelectTrigger>
                <SelectValue placeholder="Choose cryptocurrency" />
              </SelectTrigger>
              <SelectContent>
                {POPULAR_COINS.map((coin) => (
                  <SelectItem key={coin.symbol} value={coin.symbol}>
                    {coin.symbol} - {coin.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Trade Type</Label>
            <Select value={tradeType} onValueChange={(value: 'buy' | 'sell') => setTradeType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="buy">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    Buy/Open
                  </div>
                </SelectItem>
                <SelectItem value="sell">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    Sell/Close
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mode Toggle - Amount or Quantity */}
          <div className="flex gap-2">
            <Button 
              type="button"
              size="sm" 
              variant={mode === 'amount' ? 'default' : 'outline'} 
              className="h-8 px-3" 
              onClick={() => setMode('amount')}
            >
              By Amount (₹)
            </Button>
            <Button 
              type="button"
              size="sm" 
              variant={mode === 'quantity' ? 'default' : 'outline'} 
              className="h-8 px-3" 
              onClick={() => setMode('quantity')}
            >
              By Quantity
            </Button>
          </div>

          {mode === 'amount' ? (
            <div className="grid gap-2">
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="e.g. 1000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
              />
              {parsedPrice > 0 && parsedAmount > 0 && (
                <p className="text-xs text-muted-foreground">
                  ≈ {computed.qty.toFixed(8)} {selectedCoin}
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                placeholder="e.g. 0.001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                step="0.000001"
              />
              {parsedPrice > 0 && parsedQty > 0 && (
                <p className="text-xs text-muted-foreground">
                  ≈ ₹{computed.total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </p>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="price">Price (₹)</Label>
            <Input
              id="price"
              type="number"
              placeholder="e.g. 50000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              step="0.01"
            />
            <p className="text-xs text-muted-foreground">
              Auto-fetched from live market. You can override.
            </p>
          </div>

          {selectedCoin && (mode === 'amount' ? parsedAmount > 0 : parsedQty > 0) && parsedPrice > 0 && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Quantity:</span>
                <span className="font-mono font-medium">{computed.qty.toFixed(8)} {selectedCoin}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-mono font-medium">₹{computed.total.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {tradeType === 'buy' ? 'Open/Add to position' : 'Close/Reduce position'}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={submitting || !selectedCoin || !price || (mode === 'amount' ? !amount : !quantity)}
            className={tradeType === 'buy' ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
          >
            {submitting ? "Processing..." : `${tradeType.toUpperCase()} ${selectedCoin || 'Coin'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
