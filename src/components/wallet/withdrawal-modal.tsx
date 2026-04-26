
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAdminSettings } from '@/hooks/useAdminSettings';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  method: string;
}

interface BankAccount {
  id: string;
  account_number: string;
  account_holder_name: string;
  bank_name: string;
  ifsc_code: string;
  is_primary: boolean;
}

export function WithdrawalModal({ isOpen, onClose, method }: WithdrawalModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings } = useAdminSettings();
  const [amount, setAmount] = useState('');
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>('');
  const [upiId, setUpiId] = useState('');
  const [usdtAddress, setUsdtAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: bankAccounts } = useQuery({
    queryKey: ['bank-accounts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', user?.id)
        .order('is_primary', { ascending: false });
      
      if (error) throw error;
      return data as BankAccount[];
    },
    enabled: !!user && isOpen && method === 'Bank Account',
  });

  const { data: wallet } = useQuery({
    queryKey: ['wallet-balance', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user && isOpen,
  });

  // Reset form when modal opens/closes or method changes
  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setSelectedBankAccount('');
      setUpiId('');
      setUsdtAddress('');
    }
  }, [isOpen, method]);

  // Auto-select primary bank account when available
  useEffect(() => {
    if (bankAccounts && bankAccounts.length > 0 && !selectedBankAccount) {
      const primaryAccount = bankAccounts.find(acc => acc.is_primary);
      if (primaryAccount) {
        setSelectedBankAccount(primaryAccount.id);
      } else {
        setSelectedBankAccount(bankAccounts[0].id);
      }
    }
  }, [bankAccounts, selectedBankAccount]);

  const selectedAccount = bankAccounts?.find(acc => acc.id === selectedBankAccount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid amount",
        variant: "destructive"
      });
      return;
    }

    const withdrawalAmount = parseFloat(amount);
    const currentBalance = Number(wallet?.balance || 0);

    if (withdrawalAmount > currentBalance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough balance for this withdrawal",
        variant: "destructive"
      });
      return;
    }

    // Method-specific validation
    if (method === 'Bank Account' && !selectedBankAccount) {
      toast({
        title: "Bank Account Required",
        description: "Please select a bank account for withdrawal",
        variant: "destructive"
      });
      return;
    }

    if (method === 'UPI' && !upiId.trim()) {
      toast({
        title: "UPI ID Required",
        description: "Please enter your UPI ID",
        variant: "destructive"
      });
      return;
    }

    if (method === 'USDT' && !usdtAddress.trim()) {
      toast({
        title: "USDT Address Required",
        description: "Please enter your USDT wallet address",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const insertData: any = {
        user_id: user.id,
        amount: withdrawalAmount,
        payment_method: method,
        status: 'pending'
      };

      // Add method-specific fields
      if (method === 'Bank Account') {
        insertData.bank_account_id = selectedBankAccount;
      } else if (method === 'UPI') {
        insertData.upi_id = upiId.trim();
      } else if (method === 'USDT') {
        insertData.usdt_address = usdtAddress.trim();
      }

      const { error } = await supabase.from('withdrawal_requests').insert(insertData);

      if (error) throw error;

      toast({
        title: "Withdrawal Requested",
        description: "Your withdrawal request has been submitted and is pending approval",
      });

      onClose();
    } catch (error) {
      console.error('Error submitting withdrawal request:', error);
      toast({
        title: "Error",
        description: "Failed to submit withdrawal request",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMethodSpecificFields = () => {
    switch (method) {
      case 'Bank Account':
        return (
          <div className="space-y-4">
            {bankAccounts && bankAccounts.length > 0 ? (
              <>
                <div>
                  <Label htmlFor="bank-account">Select Bank Account</Label>
                  <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{account.bank_name}</span>
                            <span className="text-sm text-muted-foreground">
                              {account.account_holder_name} - ****{account.account_number?.slice(-4)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedAccount && (
                  <div className="p-3 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Withdrawal Details</h4>
                    <div className="space-y-1 text-sm">
                      <p><strong>Bank:</strong> {selectedAccount.bank_name}</p>
                      <p><strong>Account Holder:</strong> {selectedAccount.account_holder_name}</p>
                      <p><strong>Account Number:</strong> ****{selectedAccount.account_number?.slice(-4)}</p>
                      <p><strong>IFSC Code:</strong> {selectedAccount.ifsc_code}</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-2">No bank accounts found</p>
                <p className="text-sm text-muted-foreground">Please add a bank account first to make withdrawals</p>
              </div>
            )}
          </div>
        );

      case 'UPI':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="upi-id">UPI ID</Label>
              <Input
                id="upi-id"
                type="text"
                placeholder="your-upi@bank"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                required
              />
            </div>
            {settings?.upi_details && (
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Withdrawal Information</h4>
                <p className="text-sm text-muted-foreground">
                  Funds will be transferred to your UPI ID within 24 hours after approval.
                </p>
              </div>
            )}
          </div>
        );

      case 'USDT':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="usdt-address">USDT Wallet Address (TRC20)</Label>
              <Input
                id="usdt-address"
                type="text"
                placeholder="TXXXxxxXXXxxxXXX"
                value={usdtAddress}
                onChange={(e) => setUsdtAddress(e.target.value)}
                required
              />
            </div>
            {settings?.usdt_details && (
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">USDT Withdrawal Information</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p><strong>Network:</strong> {settings.usdt_details.network}</p>
                  <p><strong>Processing Time:</strong> 2-24 hours after approval</p>
                  <p className="text-xs mt-2">
                    Please ensure your wallet supports TRC20 network. Funds sent to wrong network will be lost.
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const canSubmit = () => {
    if (!amount || parseFloat(amount) <= 0) return false;
    
    switch (method) {
      case 'Bank Account':
        return selectedBankAccount && bankAccounts && bankAccounts.length > 0;
      case 'UPI':
        return upiId.trim().length > 0;
      case 'USDT':
        return usdtAddress.trim().length > 0;
      default:
        return false;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Withdraw via {method}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="1"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            {wallet && (
              <p className="text-sm text-muted-foreground mt-1">
                Available balance: ₹{Number(wallet.balance).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
            )}
          </div>

          {renderMethodSpecificFields()}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-gradient-primary" 
              disabled={isSubmitting || !canSubmit()}
            >
              {isSubmitting ? "Processing..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
