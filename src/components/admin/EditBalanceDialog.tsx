
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Edit } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";

interface EditBalanceDialogProps {
  userId: string;
  currentBalance: number;
  userLabel?: string;
  onSuccess?: () => void;
}

export function EditBalanceDialog({ userId, currentBalance, userLabel, onSuccess }: EditBalanceDialogProps) {
  const [open, setOpen] = useState(false);
  const [newBalance, setNewBalance] = useState<string>(currentBalance.toString());
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please login to continue.",
        variant: "destructive",
      });
      return;
    }
    
    const value = parseFloat(newBalance);
    if (isNaN(value) || value < 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount.",
        variant: "destructive",
      });
      return;
    }
    
    setSubmitting(true);
    console.log("Admin updating balance", { userId, newBalance: value });
    
    try {
      // Update wallet balance directly
      const { error } = await supabase
        .from('wallets')
        .update({
          balance: value,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) {
        console.error("Update balance error:", error);
        toast({
          title: "Update failed",
          description: error.message || "An unexpected error occurred.",
          variant: "destructive",
        });
        return;
      }

      // Record transaction
      await supabase.from('transactions').insert({
        user_id: userId,
        transaction_type: 'admin_balance_update',
        amount: value - currentBalance,
        total_value: value,
        status: 'completed',
      });

      console.log("Balance updated successfully");
      toast({
        title: "Balance updated successfully",
        description: `${userLabel || "User"} balance set to ₹${value.toLocaleString("en-IN")}`,
      });
      
      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['admin-users-overview'] });
      
      setOpen(false);
      onSuccess?.();

    } catch (error: any) {
      console.error("Exception in update balance:", error);
      toast({
        title: "Update failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Edit className="h-4 w-4 mr-1" />
          Edit Balance
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Balance {userLabel ? `for ${userLabel}` : ""}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="current-balance">Current Balance</Label>
            <Input
              id="current-balance"
              type="text"
              value={`₹${currentBalance.toLocaleString("en-IN")}`}
              disabled
              className="bg-muted"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-balance">New Balance (INR)</Label>
            <Input
              id="new-balance"
              type="number"
              placeholder="e.g. 5000"
              value={newBalance}
              onChange={(e) => setNewBalance(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
            {submitting ? "Updating..." : "Update Balance"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
