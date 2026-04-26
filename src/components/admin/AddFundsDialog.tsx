
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Wallet } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";

interface AddFundsDialogProps {
  userId: string;
  userLabel?: string;
  onSuccess?: () => void;
}

export function AddFundsDialog({ userId, userLabel, onSuccess }: AddFundsDialogProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("Admin credit");
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
    
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a positive amount.",
        variant: "destructive",
      });
      return;
    }
    
    setSubmitting(true);
    console.log("Admin adding funds via RPC", { target_user_id: userId, amount: value, admin_id: user.id, notes });
    
    try {
      // Use SECURITY DEFINER RPC to bypass RLS and perform atomic wallet + transaction updates
      const { data, error } = await (supabase as any).rpc("admin_add_funds", {
        target_user_id: userId,
        amount: value,
        admin_id: user.id,
        notes,
      });

      if (error) {
        console.error("admin_add_funds RPC error:", error);
        toast({
          title: "Add funds failed",
          description: error.message || "An unexpected error occurred.",
          variant: "destructive",
        });
        return;
      }

      console.log("Add funds success via RPC", data);
      toast({
        title: "Funds added successfully",
        description: `₹${value.toLocaleString("en-IN")} added to ${userLabel || "user"}.`,
      });
      
      // Wait a bit to ensure database updates are complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Invalidate and refetch all wallet-related queries
      await queryClient.invalidateQueries({ queryKey: ['admin-users-overview'] });
      await queryClient.invalidateQueries({ queryKey: ['wallet', userId] });
      await queryClient.invalidateQueries({ queryKey: ['portfolio-positions', userId] });
      await queryClient.invalidateQueries({ queryKey: ['trades', userId] });
      
      // Force refetch of admin users data
      await queryClient.refetchQueries({ queryKey: ['admin-users-overview'] });
      
      setOpen(false);
      setAmount("");
      setNotes("Admin credit");
      onSuccess?.();

    } catch (error: any) {
      console.error("Exception in add funds:", error);
      toast({
        title: "Add funds failed",
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
        <Button size="sm" className="bg-gradient-success">
          <Wallet className="h-4 w-4 mr-1" />
          Add Funds
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Funds {userLabel ? `to ${userLabel}` : ""}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="amount">Amount (INR)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="e.g. 1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              step="0.01"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              type="text"
              placeholder="Admin credit"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="bg-gradient-success">
            {submitting ? "Processing..." : "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
