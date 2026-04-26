import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DeleteUserDialogProps {
  userId: string;
  userLabel: string;
  onSuccess?: () => void;
}

export function DeleteUserDialog({ userId, userLabel, onSuccess }: DeleteUserDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.rpc("admin_delete_user", {
        target_user_id: userId,
        admin_id: user.id,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || "Failed to delete user");
      }

      toast({
        title: "User Deleted Successfully",
        description: `${userLabel} को सफलतापूर्वक delete कर दिया गया है।`,
      });

      setIsOpen(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Delete Failed",
        description: error.message || "User को delete करने में समस्या आई। कृपया फिर से कोशिश करें।",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>User को Delete करें?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              क्या आप वाकई <strong>{userLabel}</strong> को delete करना चाहते हैं?
            </p>
            <p className="text-destructive font-semibold">
              यह action permanent है! इस user का सारा data delete हो जाएगा:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 ml-4">
              <li>Profile information</li>
              <li>Wallet balance</li>
              <li>All trades और positions</li>
              <li>Transaction history</li>
              <li>Bank accounts</li>
              <li>KYC documents</li>
            </ul>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "हाँ, Delete करें"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
