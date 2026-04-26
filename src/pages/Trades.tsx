import { Layout } from "@/components/layout/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

type Trade = {
  id: string;
  created_at: string;
  symbol: string;
  coin_name: string;
  quantity: number;
  price: number;
  total_amount: number;
  trade_type: string;
  status: string;
};

const Trades = () => {
  const { user } = useAuth();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["my-trades", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Trade[];
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // Realtime: auto-refresh when trades change for this user
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('trades_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trades', filter: `user_id=eq.${user.id}` },
        () => refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, refetch]);

  return (
    <Layout>
      <div className="space-y-6 animate-slide-up pb-20 md:pb-8">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold gradient-text">Trade History</h1>
        </div>
        <Card className="glass">
          <CardHeader>
            <CardTitle>Your Trades</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-6 text-muted-foreground">Loading...</div>
            ) : data && data.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {new Date(t.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{t.symbol}</TableCell>
                        <TableCell className="whitespace-nowrap capitalize">{t.trade_type}</TableCell>
                        <TableCell className="whitespace-nowrap capitalize">{t.status}</TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          {Number(t.quantity).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          ₹{Number(t.price).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          ₹{Number(t.total_amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">No trades yet</div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Trades;