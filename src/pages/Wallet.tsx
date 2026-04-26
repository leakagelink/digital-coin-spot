
import { useState } from "react";
import { Layout } from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wallet as WalletIcon, Plus, Minus, Lock } from "lucide-react";
import { DepositModal } from "@/components/wallet/deposit-modal";
import { WithdrawalModal } from "@/components/wallet/withdrawal-modal";
import { QuickDepositModal } from "@/components/wallet/quick-deposit-modal";
import { TransactionHistory } from "@/components/wallet/transaction-history";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Wallet = () => {
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [withdrawalModalOpen, setWithdrawalModalOpen] = useState(false);
  const [quickDepositModalOpen, setQuickDepositModalOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('');
  const { user } = useAuth();

  const { data: wallet, isLoading: balanceLoading } = useQuery({
    queryKey: ["wallet-balance", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallets")
        .select("balance, locked_balance")
        .eq("user_id", user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 0,
  });

  const handleDepositMethod = (method: string) => {
    setSelectedMethod(method);
    setDepositModalOpen(true);
  };

  const handleWithdrawMethod = (method: string) => {
    setSelectedMethod(method);
    setWithdrawalModalOpen(true);
  };

  const availableBalance = Number(wallet?.balance || 0);
  const lockedBalance = Number(wallet?.locked_balance || 0);
  const usdtBalance = availableBalance / 84; // 1 USD ≈ 84 INR

  return (
    <Layout>
      <div className="space-y-6 animate-slide-up pb-20 md:pb-8">
        <div className="flex items-center gap-2">
          <WalletIcon className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold gradient-text">Wallet</h1>
        </div>

        <Card className="glass hover-glow">
          <CardHeader>
            <CardTitle>Wallet Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-4">
              {/* Available Balance */}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
                <div className="text-3xl font-bold gradient-text">
                  {balanceLoading ? "Loading..." : `$${usdtBalance.toFixed(2)} USDT`}
                </div>
                <div className="text-lg text-muted-foreground">
                  ₹{availableBalance.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                </div>
              </div>
              
              {/* Locked Balance - only show if > 0 */}
              {lockedBalance > 0 && (
                <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Lock className="h-4 w-4 text-yellow-500" />
                    <p className="text-sm text-muted-foreground">Locked Balance</p>
                  </div>
                  <div className="text-xl font-semibold text-yellow-600 dark:text-yellow-400">
                    ₹{lockedBalance.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pending admin approval • Cannot be used for trading or withdrawal
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                className="bg-gradient-success flex-1" 
                onClick={() => setDepositModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Deposit
              </Button>
              <Button 
                variant="secondary" 
                className="flex-1" 
                onClick={() => setQuickDepositModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Quick Deposit
              </Button>
              <Button 
                variant="outline" 
                className="flex-1 hover:bg-muted/80" 
                onClick={() => setWithdrawalModalOpen(true)}
              >
                <Minus className="h-4 w-4 mr-2" />
                Withdraw
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="deposit" className="w-full">
          <TabsList className="grid w-full grid-cols-2 glass">
            <TabsTrigger value="deposit">Deposit</TabsTrigger>
            <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
          </TabsList>

          <TabsContent value="deposit" className="space-y-4">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Deposit Funds</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col hover:bg-muted/80"
                    onClick={() => handleDepositMethod('UPI')}
                  >
                    <span className="text-2xl mb-2">🏦</span>
                    <span>UPI</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col hover:bg-muted/80"
                    onClick={() => handleDepositMethod('Bank Account')}
                  >
                    <span className="text-2xl mb-2">💳</span>
                    <span>Bank Account</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col hover:bg-muted/80"
                    onClick={() => handleDepositMethod('USDT')}
                  >
                    <span className="text-2xl mb-2">₮</span>
                    <span>USDT</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdraw" className="space-y-4">
            <Card className="glass">
              <CardHeader>
                <CardTitle>Withdraw Funds</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col hover:bg-muted/80"
                    onClick={() => handleWithdrawMethod('UPI')}
                  >
                    <span className="text-2xl mb-2">🏦</span>
                    <span>UPI</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col hover:bg-muted/80"
                    onClick={() => handleWithdrawMethod('Bank Account')}
                  >
                    <span className="text-2xl mb-2">💳</span>
                    <span>Bank Account</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-20 flex-col hover:bg-muted/80"
                    onClick={() => handleWithdrawMethod('USDT')}
                  >
                    <span className="text-2xl mb-2">₮</span>
                    <span>USDT</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <TransactionHistory />

        <DepositModal
          isOpen={depositModalOpen}
          onClose={() => setDepositModalOpen(false)}
          method={selectedMethod}
        />

        <WithdrawalModal
          isOpen={withdrawalModalOpen}
          onClose={() => setWithdrawalModalOpen(false)}
          method={selectedMethod}
        />

        <QuickDepositModal
          isOpen={quickDepositModalOpen}
          onClose={() => setQuickDepositModalOpen(false)}
        />
      </div>
    </Layout>
  );
};

export default Wallet;
