
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, ArrowUpRight, ArrowDownLeft, Plus, Minus } from "lucide-react";

export function TransactionHistory() {
  const { user } = useAuth();

  // Fetch transactions
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["user-transactions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch deposit requests
  const { data: depositRequests } = useQuery({
    queryKey: ["user-deposit-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deposit_requests")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch withdrawal requests
  const { data: withdrawalRequests } = useQuery({
    queryKey: ["user-withdrawal-requests", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Combine all transactions
  const allTransactions = [
    ...(transactions || []).map(t => ({
      ...t,
      type: 'transaction',
      status: t.status || 'completed'
    })),
    ...(depositRequests || []).map(d => ({
      ...d,
      type: 'deposit_request',
      transaction_type: 'deposit',
      created_at: d.created_at
    })),
    ...(withdrawalRequests || []).map(w => ({
      ...w,
      type: 'withdrawal_request',
      transaction_type: 'withdrawal',
      created_at: w.created_at
    }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { variant: "default" as const, color: "text-green-600" },
      pending: { variant: "secondary" as const, color: "text-yellow-600" },
      approved: { variant: "default" as const, color: "text-green-600" },
      rejected: { variant: "destructive" as const, color: "text-red-600" },
      failed: { variant: "destructive" as const, color: "text-red-600" }
    };
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'admin_credit':
        return <Plus className="h-4 w-4 text-green-600 flex-shrink-0" />;
      case 'withdrawal':
        return <Minus className="h-4 w-4 text-red-600 flex-shrink-0" />;
      case 'buy':
        return <ArrowDownLeft className="h-4 w-4 text-blue-600 flex-shrink-0" />;
      case 'sell':
        return <ArrowUpRight className="h-4 w-4 text-orange-600 flex-shrink-0" />;
      default:
        return <History className="h-4 w-4 flex-shrink-0" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'short' 
      }),
      time: date.toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })
    };
  };

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5" />
            Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-1/2 mx-auto mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/4 mx-auto"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5" />
          Transaction History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        {allTransactions && allTransactions.length > 0 ? (
          <div className="max-h-[400px] overflow-y-auto px-1">
            <div className="space-y-3 pb-2">{/* Remove ScrollArea for better mobile performance */}
              {allTransactions.map((transaction) => {
                const statusConfig = getStatusBadge(transaction.status);
                const dateTime = formatDate(transaction.created_at);
                const isPositive = ['deposit', 'admin_credit'].includes(transaction.transaction_type);
                
                return (
                  <div 
                    key={`${transaction.type}-${transaction.id}`} 
                    className="flex items-start gap-3 p-4 border rounded-lg bg-card/50 hover:bg-card/80 transition-colors touch-manipulation"
                  >
                    <div className="mt-1">
                      {getTransactionIcon(transaction.transaction_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm capitalize leading-tight">
                            {transaction.transaction_type === 'admin_credit' ? 'Deposit' : transaction.transaction_type}
                            {transaction.type === 'deposit_request' && ' Request'}
                            {transaction.type === 'withdrawal_request' && ' Request'}
                          </p>
                          
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <div className="text-xs text-muted-foreground">
                              <span className="block sm:inline">{dateTime.date}</span>
                              <span className="hidden sm:inline mx-1">•</span>
                              <span className="block sm:inline">{dateTime.time}</span>
                            </div>
                            <Badge variant={statusConfig.variant} className={`${statusConfig.color} text-xs px-2 py-0.5`}>
                              {transaction.status}
                            </Badge>
                          </div>
                          
                          {(transaction.type === 'deposit_request' || transaction.type === 'withdrawal_request') && 
                           'payment_method' in transaction && transaction.payment_method && (
                            <p className="text-xs text-muted-foreground mt-1">
                              via {transaction.payment_method}
                            </p>
                          )}
                        </div>
                        
                        <div className="text-right flex-shrink-0">
                          <p className={`font-semibold text-sm ${
                            isPositive ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {isPositive ? '+' : '-'}₹{Number(transaction.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isPositive ? '+' : '-'}${(Number(transaction.amount) / 84).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 px-3">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/20 flex items-center justify-center">
              <History className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">No transactions found</p>
            <p className="text-muted-foreground/70 text-xs mt-1">Your transaction history will appear here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
