
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search } from 'lucide-react';
import { useLCWPrices } from '@/hooks/useLCWPrices';

interface AddCryptoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCryptoAdded: () => void;
  mode?: 'watchlist' | 'trading';
}

export function AddCryptoModal({ isOpen, onClose, onCryptoAdded, mode = 'watchlist' }: AddCryptoModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { prices } = useLCWPrices();
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState<any>(null);
  const [showTradingForm, setShowTradingForm] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [amount, setAmount] = useState('');
  const [tradeMode, setTradeMode] = useState<'quantity' | 'amount'>('quantity');
  const [walletBalance, setWalletBalance] = useState<number>(0);

  // Get wallet balance when trading mode
  useEffect(() => {
    if (isOpen && mode === 'trading' && user) {
      fetchWalletBalance();
    }
  }, [isOpen, mode, user]);

  const fetchWalletBalance = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', user.id)
      .single();
    setWalletBalance(Number(data?.balance || 0));
  };

  // Popular cryptocurrencies with their symbols
  const popularCryptos = [
    { symbol: 'BTC', name: 'Bitcoin', coin_id: 'bitcoin' },
    { symbol: 'ETH', name: 'Ethereum', coin_id: 'ethereum' },
    { symbol: 'BNB', name: 'BNB', coin_id: 'binancecoin' },
    { symbol: 'ADA', name: 'Cardano', coin_id: 'cardano' },
    { symbol: 'XRP', name: 'XRP', coin_id: 'ripple' },
    { symbol: 'SOL', name: 'Solana', coin_id: 'solana' },
    { symbol: 'DOT', name: 'Polkadot', coin_id: 'polkadot' },
    { symbol: 'DOGE', name: 'Dogecoin', coin_id: 'dogecoin' },
    { symbol: 'AVAX', name: 'Avalanche', coin_id: 'avalanche-2' },
    { symbol: 'SHIB', name: 'Shiba Inu', coin_id: 'shiba-inu' },
    { symbol: 'MATIC', name: 'Polygon', coin_id: 'matic-network' },
    { symbol: 'LTC', name: 'Litecoin', coin_id: 'litecoin' },
    { symbol: 'UNI', name: 'Uniswap', coin_id: 'uniswap' },
    { symbol: 'LINK', name: 'Chainlink', coin_id: 'chainlink' },
    { symbol: 'ATOM', name: 'Cosmos', coin_id: 'cosmos' },
  ];

  const filteredCryptos = popularCryptos.filter(
    crypto =>
      crypto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToWatchlist = async (crypto: any) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('watchlist')
        .insert({
          user_id: user.id,
          coin_id: crypto.coin_id,
          symbol: crypto.symbol,
          coin_name: crypto.name,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${crypto.name} added to watchlist`,
      });

      onCryptoAdded();
      onClose();
      setSearchTerm('');
    } catch (error: any) {
      console.error('Error adding to watchlist:', error);
      if (error.code === '23505') {
        toast({
          title: 'Already exists',
          description: `${crypto.name} is already in your watchlist`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to add cryptocurrency to watchlist',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const openTradingForm = (crypto: any) => {
    setSelectedCrypto(crypto);
    setShowTradingForm(true);
  };

  const handleBuyTrade = async () => {
    if (!user || !selectedCrypto) return;

    const currentPrice = prices[selectedCrypto.symbol]?.price || 0;
    if (!currentPrice) {
      toast({
        title: 'Error',
        description: 'Unable to get current price',
        variant: 'destructive',
      });
      return;
    }

    const qty = tradeMode === 'quantity' ? Number(quantity) : Number(amount) / currentPrice;
    const totalCost = qty * currentPrice;

    if (qty <= 0 || totalCost <= 0) {
      toast({
        title: 'Invalid input',
        description: 'Enter a valid quantity or amount',
        variant: 'destructive',
      });
      return;
    }

    if (walletBalance < totalCost) {
      toast({
        title: 'Insufficient balance',
        description: `You need ${totalCost.toFixed(2)} USDT but only have ${walletBalance.toFixed(2)} USDT`,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      // Check if position already exists
      const { data: existingPosition } = await supabase
        .from('portfolio_positions')
        .select('*')
        .eq('user_id', user.id)
        .eq('symbol', selectedCrypto.symbol)
        .single();

      if (existingPosition) {
        // Update existing position
        const oldQty = Number(existingPosition.amount);
        const newQty = oldQty + qty;
        const oldInvestment = Number(existingPosition.total_investment || (oldQty * Number(existingPosition.buy_price)));
        const newTotalInvestment = oldInvestment + totalCost;
        const newAvgPrice = newTotalInvestment / newQty;

        const { error } = await supabase
          .from('portfolio_positions')
          .update({
            amount: newQty,
            quantity: newQty,
            buy_price: newAvgPrice,
            current_price: currentPrice,
            total_investment: newTotalInvestment,
            current_value: newQty * currentPrice,
            pnl: (newQty * currentPrice) - newTotalInvestment,
            pnl_percentage: ((newQty * currentPrice) - newTotalInvestment) / newTotalInvestment * 100,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingPosition.id);

        if (error) throw error;
      } else {
        // Create new position
        const { error } = await supabase
          .from('portfolio_positions')
          .insert({
            user_id: user.id,
            symbol: selectedCrypto.symbol,
            coin_name: selectedCrypto.name,
            amount: qty,
            quantity: qty,
            buy_price: currentPrice,
            current_price: currentPrice,
            total_investment: totalCost,
            current_value: qty * currentPrice,
            pnl: 0,
            pnl_percentage: 0,
            open_price: currentPrice,
            trade_type: 'buy',
            status: 'open',
            position_type: 'long',
          });

        if (error) throw error;
      }

      // Update wallet balance
      const { error: walletError } = await supabase
        .from('wallets')
        .update({
          balance: walletBalance - totalCost,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (walletError) throw walletError;

      // Record trade
      const { error: tradeError } = await supabase
        .from('trades')
        .insert({
          user_id: user.id,
          symbol: selectedCrypto.symbol,
          coin_name: selectedCrypto.name,
          trade_type: 'buy',
          quantity: qty,
          price: currentPrice,
          total_amount: totalCost,
          status: 'completed',
        });

      if (tradeError) throw tradeError;

      toast({
        title: 'Success',
        description: `Bought ${qty.toFixed(6)} ${selectedCrypto.symbol} for ${totalCost.toFixed(2)} USDT`,
      });

      onCryptoAdded();
      onClose();
      setShowTradingForm(false);
      setQuantity('');
      setAmount('');
      setSelectedCrypto(null);
    } catch (error) {
      console.error('Error executing trade:', error);
      toast({
        title: 'Error',
        description: 'Failed to execute trade',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const setMaxAmount = () => {
    if (!selectedCrypto) return;
    const currentPrice = prices[selectedCrypto.symbol]?.price || 0;
    if (currentPrice <= 0) return;

    if (tradeMode === 'amount') {
      setAmount(walletBalance.toFixed(2));
    } else {
      const maxQty = walletBalance / currentPrice;
      setQuantity(maxQty.toFixed(6));
    }
  };

  if (showTradingForm && selectedCrypto) {
    const currentPrice = prices[selectedCrypto.symbol]?.price || 0;
    const qty = tradeMode === 'quantity' ? Number(quantity) : (currentPrice > 0 ? Number(amount) / currentPrice : 0);
    const total = qty * currentPrice;

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Buy {selectedCrypto.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span>Available: {walletBalance.toFixed(2)} USDT</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={tradeMode === 'quantity' ? 'default' : 'outline'}
                  onClick={() => setTradeMode('quantity')}
                >
                  By Qty
                </Button>
                <Button
                  size="sm"
                  variant={tradeMode === 'amount' ? 'default' : 'outline'}
                  onClick={() => setTradeMode('amount')}
                >
                  By Amount
                </Button>
                <Button size="sm" variant="outline" onClick={setMaxAmount}>
                  Max
                </Button>
              </div>
            </div>

            <div>
              <Label>Price (USDT)</Label>
              <Input value={currentPrice.toFixed(4)} disabled />
            </div>

            {tradeMode === 'quantity' ? (
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0.00"
                  step="0.000001"
                />
              </div>
            ) : (
              <div>
                <Label>Amount (USDT)</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              Total: {total.toFixed(2)} USDT
              {qty > 0 && <span className="ml-2">(~{qty.toFixed(6)} {selectedCrypto.symbol})</span>}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowTradingForm(false)}>
                Back
              </Button>
              <Button
                onClick={handleBuyTrade}
                disabled={isLoading || (!quantity && !amount)}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buy'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'trading' ? 'Select Cryptocurrency to Trade' : 'Add Cryptocurrency'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search cryptocurrencies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredCryptos.map((crypto) => {
              const price = prices[crypto.symbol]?.price || 0;
              const change = prices[crypto.symbol]?.change24h || 0;
              const isPositive = change >= 0;

              return (
                <div
                  key={crypto.symbol}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <h3 className="font-semibold">{crypto.symbol}</h3>
                        <p className="text-sm text-muted-foreground">{crypto.name}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right mr-3">
                    <p className="font-semibold">${price.toFixed(4)}</p>
                    <p className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositive ? '+' : ''}{change.toFixed(2)}%
                    </p>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => mode === 'trading' ? openTradingForm(crypto) : addToWatchlist(crypto)}
                    disabled={isLoading}
                    className={mode === 'trading' ? 'bg-green-600 hover:bg-green-700' : ''}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : mode === 'trading' ? (
                      'Trade'
                    ) : (
                      'Add'
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
