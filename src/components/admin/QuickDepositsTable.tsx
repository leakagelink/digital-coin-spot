import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Check, X, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface QuickDeposit {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
  admin_notes: string | null;
  profiles?: {
    display_name: string | null;
    email: string | null;
  } | null;
}
export function QuickDepositsTable() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDeposit, setSelectedDeposit] = useState<QuickDeposit | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: deposits, isLoading } = useQuery({
    queryKey: ["admin-quick-deposits"],
    queryFn: async () => {
      // Fetch quick deposits
      const { data: depositsData, error: depositsError } = await supabase
        .from("quick_deposits")
        .select("*")
        .order("created_at", { ascending: false });

      if (depositsError) throw depositsError;

      // Fetch profiles for each deposit
      const userIds = [...new Set(depositsData.map(d => d.user_id))];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", userIds);

      // Map profiles to deposits
      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
      
      return depositsData.map(deposit => ({
        ...deposit,
        profiles: profilesMap.get(deposit.user_id) || null
      })) as QuickDeposit[];
    },
  });

  const handleAction = (deposit: QuickDeposit, action: 'approve' | 'reject') => {
    setSelectedDeposit(deposit);
    setActionType(action);
  };

  const confirmAction = async () => {
    if (!selectedDeposit || !actionType || !user) return;

    setIsProcessing(true);
    try {
      if (actionType === 'approve') {
        const { data, error } = await supabase.rpc('process_quick_deposit_approval', {
          quick_deposit_id: selectedDeposit.id,
          admin_id: user.id
        });

        if (error) throw error;
        
        const result = data as { success: boolean; error?: string };
        if (!result.success) {
          throw new Error(result.error || 'Failed to approve deposit');
        }

        toast({
          title: "Deposit Approved",
          description: `₹${selectedDeposit.amount.toLocaleString()} moved to user's available balance.`,
        });
      } else {
        const { data, error } = await supabase.rpc('reject_quick_deposit', {
          quick_deposit_id: selectedDeposit.id,
          admin_id: user.id,
          notes: 'Rejected by admin'
        });

        if (error) throw error;

        const result = data as { success: boolean; error?: string };
        if (!result.success) {
          throw new Error(result.error || 'Failed to reject deposit');
        }

        toast({
          title: "Deposit Rejected",
          description: "Locked balance has been removed.",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["admin-quick-deposits"] });
    } catch (error: any) {
      console.error('Error processing quick deposit:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to process deposit",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setSelectedDeposit(null);
      setActionType(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'locked':
        return <Badge variant="secondary">Locked</Badge>;
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-600">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card className="glass">
        <CardContent className="p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading quick deposits...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="glass">
        <CardHeader>
          <CardTitle>Quick Deposits</CardTitle>
        </CardHeader>
        <CardContent>
          {deposits && deposits.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deposits.map((deposit) => (
                    <TableRow key={deposit.id}>
                      <TableCell className="font-medium">
                        {deposit.profiles?.display_name || 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {deposit.profiles?.email || 'N/A'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {deposit.user_id.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="font-semibold">
                        ₹{deposit.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(deposit.created_at), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(deposit.status)}
                      </TableCell>
                      <TableCell>
                        {deposit.status === 'locked' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleAction(deposit, 'approve')}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleAction(deposit, 'reject')}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        {deposit.status !== 'locked' && (
                          <span className="text-sm text-muted-foreground">
                            {deposit.approved_at && format(new Date(deposit.approved_at), 'dd/MM/yyyy')}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No quick deposits found
            </p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!selectedDeposit && !!actionType} onOpenChange={() => {
        setSelectedDeposit(null);
        setActionType(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'approve' ? 'Approve Quick Deposit' : 'Reject Quick Deposit'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'approve' 
                ? `This will move ₹${selectedDeposit?.amount.toLocaleString()} from locked balance to available balance for ${selectedDeposit?.profiles?.display_name || 'the user'}.`
                : `This will remove ₹${selectedDeposit?.amount.toLocaleString()} from locked balance for ${selectedDeposit?.profiles?.display_name || 'the user'}.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              disabled={isProcessing}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                actionType === 'approve' ? 'Approve' : 'Reject'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
