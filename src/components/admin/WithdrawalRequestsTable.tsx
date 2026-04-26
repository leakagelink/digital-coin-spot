
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { BadgeCheck, XCircle } from "lucide-react";

interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  bank_account_id: string | null;
  status: string;
  approved_by: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
  wallet_updated: boolean | null;
  payment_method: string | null;
  upi_id: string | null;
  usdt_address: string | null;
  profiles?: {
    email?: string;
    display_name?: string;
  } | null;
  bank_accounts?: {
    account_holder_name?: string;
    bank_name?: string;
    account_number?: string;
    ifsc_code?: string;
  } | null;
}

export function WithdrawalRequestsTable() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Query data

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-withdrawal-requests", user?.id],
    queryFn: async () => {
      console.log("Fetching withdrawal requests for admin...");
      
      // Fetch withdrawal requests
      const { data: withdrawalData, error: withdrawalError } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (withdrawalError) throw withdrawalError;
      
      if (!withdrawalData || withdrawalData.length === 0) {
        return [];
      }
      
      // Get unique user IDs
      const userIds = [...new Set(withdrawalData.map(req => req.user_id))];
      
      // Fetch user profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, display_name")
        .in("id", userIds);
      
      if (profilesError) {
        console.warn("Could not fetch profiles:", profilesError);
      }
      
      // Get unique bank account IDs
      const bankIds = withdrawalData
        .map(req => req.bank_account_id)
        .filter(id => id !== null);
      
      console.log("Bank account IDs found:", bankIds);
      
      let bankAccountsData = [];
      if (bankIds.length > 0) {
        const { data: banksData, error: banksError } = await supabase
          .from("bank_accounts")
          .select("id, account_holder_name, bank_name, account_number, ifsc_code")
          .in("id", bankIds);
        
        if (banksError) {
          console.error("Could not fetch bank accounts:", banksError);
        } else {
          bankAccountsData = banksData || [];
          console.log("Fetched bank accounts:", bankAccountsData);
        }
      }
      
      // Combine the data
      const combinedData = withdrawalData.map(req => ({
        ...req,
        profiles: profilesData?.find(p => p.id === req.user_id) || null,
        bank_accounts: req.bank_account_id 
          ? bankAccountsData.find(b => b.id === req.bank_account_id) || null 
          : null
      }));
      
      console.log(`Loaded ${combinedData.length} withdrawal requests with user data`);
      console.log("Sample combined data:", combinedData.slice(0, 2));
      return combinedData;
    },
    enabled: !!user, // ensure we query after auth so RLS allows admin
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const approve = async (id: string) => {
    if (!user) return;
    console.log("Approving withdrawal", id);
    const { error } = await supabase.rpc("process_withdrawal_approval", {
      withdrawal_id: id,
      admin_id: user.id,
    });
    if (error) {
      console.error("Approve withdrawal error:", error);
      toast({
        title: "Approval failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Withdrawal approved",
      description: "Status updated and wallet adjusted.",
    });
    refetch();
  };

  const reject = async (id: string) => {
    if (!user) return;
    console.log("Rejecting withdrawal", id);
    const { data, error } = await supabase.rpc("reject_request", {
      request_id: id,
      request_type: "withdrawal",
      admin_id: user.id,
      notes: "Rejected by admin",
    });
    if (error) {
      console.error("Reject withdrawal error:", error);
      toast({
        title: "Rejection failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }
    toast({
      title: "Withdrawal rejected",
      description: "The request has been marked as rejected.",
    });
    refetch();
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>Withdrawal Requests</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-6 text-muted-foreground">Loading...</div>
        ) : data && data.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Created</TableHead>
                  <TableHead>User Email</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Payment Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(req.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {req.profiles?.email || req.profiles?.display_name || req.user_id}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      ₹{Number(req.amount).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="whitespace-nowrap capitalize">
                      {req.payment_method || 'N/A'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {req.payment_method === 'UPI' && req.upi_id && (
                        <div>UPI: {req.upi_id}</div>
                      )}
                      {req.payment_method === 'Bank Account' && req.bank_accounts && (
                        <div className="space-y-1">
                          <div><strong>Bank:</strong> {req.bank_accounts.bank_name}</div>
                          <div><strong>A/C:</strong> {req.bank_accounts.account_number}</div>
                          <div><strong>IFSC:</strong> {req.bank_accounts.ifsc_code}</div>
                          <div><strong>Holder:</strong> {req.bank_accounts.account_holder_name}</div>
                        </div>
                      )}
                      {req.payment_method === 'Bank Account' && !req.bank_accounts && req.bank_account_id && (
                        <div className="text-red-500 text-xs">Bank details not found</div>
                      )}
                      {req.payment_method === 'USDT' && req.usdt_address && (
                        <div>USDT: {req.usdt_address}</div>
                      )}
                      {!req.payment_method && 'No details available'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap capitalize">
                      {req.status}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="bg-gradient-success"
                          disabled={req.status !== "pending"}
                          onClick={() => approve(req.id)}
                        >
                          <BadgeCheck className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={req.status !== "pending"}
                          onClick={() => reject(req.id)}
                        >
                          <XCircle className="h-4 w-4 mr-1 text-destructive" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">No requests found</div>
        )}
      </CardContent>
    </Card>
  );
}
