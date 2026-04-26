import { useEffect, useState, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { binanceAPI } from '@/services/binanceApi';


interface TradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  name: string;
  currentPrice: number;
}

type TradeMode = 'quantity' | 'amount';

const getMinimumTradeAmount = (_symbol: string): number => {
  return 1; // Flat $1 minimum to ensure buys work easily
};

export function TradingModal({ isOpen, onClose, symbol, name, currentPrice }: TradingModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState('');
  const [amount, setAmount] = useState('');
  const [priceInINR, setPriceInINR] = useState((currentPrice * 84).toString());
  const [isLoading, setIsLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [mode, setMode] = useState<TradeMode>('amount');
  const [existingPosition, setExistingPosition] = useState<any>(null);
  const [livePrice, setLivePrice] = useState<number>(currentPrice);

  // Track live momentum locally for this trade
  const priceHistoryRef = useRef<number[]>([]);
  const prevPriceRef = useRef<number | null>(null);

  // Fetch live Binance price every 2 seconds
  useEffect(() => {
    if (!isOpen) return;

    const fetchPrice = async () => {
      try {
        const binanceSymbol = symbol; // Already in format like "BTCUSDT"
        const priceData = await binanceAPI.getPrice(binanceSymbol);
        const price = parseFloat(priceData.price);
        
        if (price && price > 0) {
          setLivePrice(price);
          
          // Update price history for momentum
          const arr = priceHistoryRef.current;
          arr.push(price);
          if (arr.length > 10) arr.shift();
          prevPriceRef.current = arr.length >= 2 ? arr[arr.length - 2] : prevPriceRef.current;
        }
      } catch (error) {
        console.error('Error fetching Binance price:', error);
        // Fallback to currentPrice if Binance fails
        setLivePrice(currentPrice);
      }
    };

    fetchPrice(); // Initial fetch
    const interval = setInterval(fetchPrice, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [isOpen, symbol, currentPrice]);

  const liveInr = livePrice * 84;

  const momentum = useMemo(() => {
    const arr = priceHistoryRef.current;
    if (arr.length < 2) return 0;
    const changes = arr.map((v, i, a) => (i > 0 ? ((v - a[i - 1]) / a[i - 1]) * 100 : 0));
    return Math.abs(changes.reduce((s, c) => s + c, 0));
  }, [livePrice]);

  const isUp = useMemo(() => {
    const arr = priceHistoryRef.current;
    if (arr.length < 2) return true;
    return arr[arr.length - 1] >= arr[arr.length - 2];
  }, [livePrice]);

  // Fetch wallet balance and existing position when modal opens
  useEffect(() => {
    if (!isOpen || !user) return;
    
    const fetchData = async () => {
      try {
        console.log('[TradingModal] Fetching wallet and position data for', user.id);
        
        // Fetch wallet balance
        const { data: walletData, error: walletError } = await supabase
          .from('wallets')
          .select('balance')
          .eq('user_id', user.id)
          .single();
        
        if (walletError) {
          console.error('Error fetching wallet:', walletError);
          // Create wallet if doesn't exist
          if (walletError.code === 'PGRST116') {
            const { data: newWallet, error: createError } = await supabase
              .from('wallets')
              .insert({ user_id: user.id, balance: 10000 })
              .select()
              .single();
            
            if (createError) {
              console.error('Error creating wallet:', createError);
              setWalletBalance(0);
            } else {
              setWalletBalance(Number(newWallet.balance));
            }
          } else {
            setWalletBalance(0);
          }
        } else {
          setWalletBalance(Number(walletData?.balance || 0));
        }

        // Fetch existing position
        const symbolPure = symbol.replace('USDT', '');
        const { data: positionData, error: positionError } = await supabase
          .from('portfolio_positions')
          .select('*')
          .eq('user_id', user.id)
          .eq('symbol', symbolPure)
          .single();
        
        if (positionError && positionError.code !== 'PGRST116') {
          console.error('Error fetching position:', positionError);
        } else {
          setExistingPosition(positionData);
        }
        
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch account data',
          variant: 'destructive',
        });
      }
    };
    
    fetchData();
  }, [isOpen, user, symbol, toast]);

  // Initialize defaults when modal opens - run only once when opening
  useEffect(() => {
    if (isOpen) {
      // Always use live TAAPI price
      setPriceInINR(liveInr.toString());
      const sp = symbol.replace('USDT', '');
      const minInr = getMinimumTradeAmount(sp) * 84;
      setMode('amount');
      setAmount(minInr.toFixed(2));
      setQuantity('');
    }
  }, [isOpen, symbol]);

  // Update price separately without resetting user inputs
  useEffect(() => {
    if (isOpen) {
      setPriceInINR(liveInr.toString());
    }
  }, [liveInr, isOpen]);

  const parsedPriceINR = parseFloat(priceInINR || '0');
  const parsedQty = parseFloat(quantity || '0');
  const parsedAmount = parseFloat(amount || '0');

  const computed = {
    qty: mode === 'amount' ? (parsedPriceINR > 0 ? parsedAmount / parsedPriceINR : 0) : parsedQty,
    total: mode === 'amount' ? parsedAmount : parsedQty * parsedPriceINR,
  };

  const symbolPure = symbol.replace('USDT', '');

  const setMaxForBalance = () => {
    if (!parsedPriceINR || parsedPriceINR <= 0) return;
    const maxQty = walletBalance / parsedPriceINR;
    if (mode === 'amount') {
      setAmount(walletBalance.toFixed(2));
    } else {
      setQuantity(maxQty.toString());
    }
    toast({
      title: 'Max applied',
      description: mode === 'amount'
        ? `Set to max amount: ₹${walletBalance.toFixed(2)}`
        : `Set to max quantity: ${maxQty.toFixed(6)} ${symbolPure}`,
    });
  };

  const setMaxForSell = () => {
    if (!existingPosition) return;
    
    const maxSellQty = Number(existingPosition.amount);
    if (mode === 'amount') {
      setAmount((maxSellQty * parsedPriceINR).toFixed(2));
    } else {
      setQuantity(maxSellQty.toString());
    }
    toast({
      title: 'Max applied',
      description: `Set to max sell quantity: ${maxSellQty.toFixed(6)} ${symbolPure}`,
    });
  };

  const recordTrade = async (tradeType: 'buy' | 'sell', qty: number, px: number, total: number) => {
    const { error } = await supabase.from('trades').insert({
      user_id: user!.id,
      symbol: symbolPure,
      coin_name: name,
      trade_type: tradeType,
      quantity: qty,
      price: px,
      total_amount: total,
      status: 'completed',
    });
    if (error) throw error;
  };

  const updateWallet = async (newBalance: number) => {
    const { error } = await supabase
      .from('wallets')
      .update({
        balance: newBalance,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user!.id);
    if (error) throw error;
    setWalletBalance(newBalance);
  };

  const handleBuy = async () => {
    console.log('[TradingModal] handleBuy called', { user: !!user, priceInINR, quantity, amount, walletBalance });
    
    if (!user || !priceInINR) {
      console.log('[TradingModal] Missing user or price', { user: !!user, priceInINR });
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    const qty = Number(computed.qty);
    const totalCost = Number(computed.total);
    
    console.log('[TradingModal] Buy calculations', { qty, totalCost, computed, symbolPure });

    if (qty <= 0 || totalCost <= 0) {
      console.log('[TradingModal] Invalid quantity or total', { qty, totalCost });
      toast({ title: 'Invalid input', description: 'Enter a valid quantity or amount', variant: 'destructive' });
      return;
    }

    // Check minimum trade amounts based on coin type (in USD)
    const minimumAmountUSD = getMinimumTradeAmount(symbolPure);
    const totalCostUSD = totalCost / 84;
    console.log('[TradingModal] Minimum check', { minimumAmountUSD, totalCostUSD, symbolPure });
    
    if (totalCostUSD < minimumAmountUSD) {
      console.log('[TradingModal] Below minimum amount', { totalCostUSD, minimumAmountUSD });
      toast({
        title: 'Minimum amount required',
        description: `Minimum trade amount for ${symbolPure} is $${minimumAmountUSD}`,
        variant: 'destructive',
      });
      return;
    }


    if (walletBalance < totalCost) {
      console.log('[TradingModal] Insufficient balance', { walletBalance, totalCost });
      toast({
        title: 'Insufficient balance',
        description: `You need ₹${totalCost.toFixed(2)} but only have ₹${walletBalance.toFixed(2)}.`,
        variant: 'destructive',
      });
      return;
    }

    console.log('[TradingModal] All checks passed, proceeding with buy');

    setIsLoading(true);
    try {
      // Always use live Binance price for trade execution
      const buyPriceINR = liveInr; // Live market price at execution time
      
      console.log('[TradingModal] Executing buy with live price:', buyPriceINR);
      if (existingPosition) {
        const oldQty = Number(existingPosition.amount);
        const newQty = oldQty + qty;
        const newTotalInvestment = Number(existingPosition.total_investment || (oldQty * Number(existingPosition.buy_price))) + totalCost;
        const newAvgPriceINR = newQty > 0 ? newTotalInvestment / newQty : buyPriceINR;
        
        // Use LIVE price for immediate sync so P&L reflects market, not stale DB price
        const currentPrice = buyPriceINR;
        const currentValue = newQty * currentPrice;
        const pnl = currentValue - newTotalInvestment;
        const pnlPercentage = newTotalInvestment > 0 ? (pnl / newTotalInvestment) * 100 : 0;

        const { error } = await supabase
          .from('portfolio_positions')
          .update({
            amount: newQty,
            buy_price: newAvgPriceINR,  // Average cost basis
            current_price: currentPrice, // sync to live
            total_investment: newTotalInvestment,
            current_value: currentValue,
            pnl: pnl,
            pnl_percentage: pnlPercentage,
            admin_price_override: false, // Reset admin override on new buy
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingPosition.id);
        if (error) throw error;
      } else {
        // New position: buy_price and current_price are SAME at trade time (live TAAPI price)
        // P&L will be 0 initially and will update as market moves
        
        const { error } = await supabase
          .from('portfolio_positions')
          .insert({
            user_id: user.id,
            symbol: symbolPure,
            coin_name: name,
            amount: qty,
            buy_price: buyPriceINR,      // Live TAAPI price at execution
            current_price: buyPriceINR,  // Same as buy price at creation
            total_investment: totalCost,
            current_value: totalCost,    // Same as investment at creation
            pnl: 0,                      // Zero P&L at creation
            pnl_percentage: 0,           // Zero P&L% at creation
            admin_price_override: false,
          });
        if (error) throw error;
      }

      await updateWallet(walletBalance - totalCost);
      await recordTrade('buy', qty, buyPriceINR, totalCost);

      toast({
        title: "Success",
        description: `Bought ${qty.toFixed(6)} ${symbolPure} for ₹${totalCost.toFixed(2)}`,
      });

      onClose();
      setQuantity('');
      setAmount('');
    } catch (error) {
      console.error('Error buying crypto:', error);
      toast({
        title: "Error",
        description: "Failed to execute buy order",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSell = async () => {
    if (!user || !priceInINR) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    const qty = Number(computed.qty);
    if (qty <= 0) {
      toast({ title: 'Invalid input', description: 'Enter a valid quantity or amount', variant: 'destructive' });
      return;
    }

    if (!existingPosition) {
      toast({
        title: "Error",
        description: "You don't own this cryptocurrency",
        variant: "destructive"
      });
      return;
    }

    if (Number(existingPosition.amount) < qty) {
      toast({
        title: "Error",
        description: "Insufficient quantity to sell",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const sellPriceINR = parseFloat(priceInINR);
      const currentMarketPriceINR = liveInr;
      const newAmount = Number(existingPosition.amount) - qty;
      const proceeds = qty * currentMarketPriceINR;

      if (newAmount === 0) {
        const { error } = await supabase
          .from('portfolio_positions')
          .delete()
          .eq('id', existingPosition.id);
        if (error) throw error;
      } else {
        const newTotalInvestment = Math.max(
          0,
          Number(existingPosition.total_investment || (Number(existingPosition.amount) * Number(existingPosition.buy_price))) -
            (qty * Number(existingPosition.buy_price))
        );
        const newCurrentValue = newAmount * currentMarketPriceINR;
        const newCurrentPrice = currentMarketPriceINR;
        const { error } = await supabase
          .from('portfolio_positions')
          .update({
            amount: newAmount,
            current_price: newCurrentPrice,
            current_value: newCurrentValue,
            total_investment: newTotalInvestment,
            pnl: newCurrentValue - newTotalInvestment,
            pnl_percentage: newTotalInvestment > 0 ? ((newCurrentValue - newTotalInvestment) / newTotalInvestment) * 100 : 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingPosition.id);

        if (error) throw error;
      }

      await updateWallet(walletBalance + proceeds);
      await recordTrade('sell', qty, currentMarketPriceINR, proceeds);

      toast({
        title: "Success",
        description: `Sold ${qty.toFixed(6)} ${symbolPure} for ₹${proceeds.toFixed(2)}`,
      });

      onClose();
      setQuantity('');
      setAmount('');
    } catch (error) {
      console.error('Error selling crypto:', error);
      toast({
        title: "Error",
        description: "Failed to execute sell order",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Trade {symbol.replace('USDT', '')}
            <div className="flex items-center gap-2 text-sm">
              {isUp ? <TrendingUp className="h-4 w-4 text-success" /> : <TrendingDown className="h-4 w-4 text-danger" />}
              <span className="font-mono">₹{liveInr.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              <span className={`text-xs ${isUp ? 'text-success' : 'text-danger'}`}>🔥 {momentum.toFixed(1)}</span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>Available: ₹{walletBalance.toFixed(2)}</span>
          {existingPosition && (
            <span>Holdings: {Number(existingPosition.amount).toFixed(6)} {symbolPure}</span>
          )}
        </div>

        <div className="flex gap-2 mb-4">
          <Button size="sm" variant={mode === 'quantity' ? 'default' : 'outline'} className="h-7 px-3" onClick={() => setMode('quantity')}>
            By Qty
          </Button>
          <Button size="sm" variant={mode === 'amount' ? 'default' : 'outline'} className="h-7 px-3" onClick={() => setMode('amount')}>
            By Amount
          </Button>
        </div>
        
        <Tabs defaultValue="buy" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy" className="text-green-600">Buy</TabsTrigger>
            <TabsTrigger value="sell" className="text-red-600" disabled={!existingPosition}>
              Sell {!existingPosition && '(No Holdings)'}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="buy" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="buy-price">Live Market Price (₹) - Auto Updated</Label>
              <Input
                id="buy-price"
                type="text"
                value={`₹${liveInr.toLocaleString('en-IN', { maximumFractionDigits: 2 })} (Live)`}
                disabled
                className="bg-muted/50 cursor-not-allowed font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Trade will execute at live Binance market price
              </p>
            </div>
            {mode === 'quantity' ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="buy-quantity">Quantity</Label>
                  <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={setMaxForBalance}>
                    Max
                  </Button>
                </div>
                <Input
                  id="buy-quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  step="0.000001"
                  placeholder="0.00"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="buy-amount">Amount (₹)</Label>
                  <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={setMaxForBalance}>
                    Max
                  </Button>
                </div>
                <Input
                  id="buy-amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              Total: ₹{computed.total.toFixed(2)}
              {computed.qty > 0 && <span className="ml-2">(~{computed.qty.toFixed(6)} {symbolPure})</span>}
            </div>
            <Button 
              onClick={handleBuy} 
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={isLoading || computed.total <= 0}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buy'}
            </Button>
          </TabsContent>
          
          <TabsContent value="sell" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sell-price">Live Market Price (₹) - Auto Updated</Label>
              <Input
                id="sell-price"
                type="text"
                value={`₹${liveInr.toLocaleString('en-IN', { maximumFractionDigits: 2 })} (Live)`}
                disabled
                className="bg-muted/50 cursor-not-allowed font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Trade will execute at live Binance market price
              </p>
            </div>
            {mode === 'quantity' ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="sell-quantity">Quantity</Label>
                  <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={setMaxForSell}>
                    Max
                  </Button>
                </div>
                <Input
                  id="sell-quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  step="0.000001"
                  placeholder="0.00"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="sell-amount">Amount (₹)</Label>
                  <Button size="sm" variant="outline" className="h-6 px-2 text-xs" onClick={setMaxForSell}>
                    Max
                  </Button>
                </div>
                <Input
                  id="sell-amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              Total: ₹{computed.total.toFixed(2)}
              {computed.qty > 0 && <span className="ml-2">(~{computed.qty.toFixed(6)} {symbolPure})</span>}
            </div>
            <Button 
              onClick={handleSell} 
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={isLoading || computed.total <= 0}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sell'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
