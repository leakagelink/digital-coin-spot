
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AddBankAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBankAdded: () => void;
}

export function AddBankAccountModal({ isOpen, onClose, onBankAdded }: AddBankAccountModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    accountNumber: '',
    accountHolderName: '',
    bankName: '',
    ifscCode: '',
    accountType: 'savings'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .insert({
          user_id: user.id,
          account_number: formData.accountNumber,
          account_holder_name: formData.accountHolderName,
          bank_name: formData.bankName,
          ifsc_code: formData.ifscCode,
          account_type: formData.accountType,
        });

      if (error) throw error;

      toast({
        title: "Bank account added",
        description: "Your bank account has been added successfully",
      });

      onBankAdded();
      onClose();
      setFormData({
        accountNumber: '',
        accountHolderName: '',
        bankName: '',
        ifscCode: '',
        accountType: 'savings'
      });
    } catch (error) {
      console.error('Error adding bank account:', error);
      toast({
        title: "Error",
        description: "Failed to add bank account",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Bank Account</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="accountHolderName">Account Holder Name</Label>
            <Input
              id="accountHolderName"
              value={formData.accountHolderName}
              onChange={(e) => setFormData({...formData, accountHolderName: e.target.value})}
              placeholder="Enter account holder name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account Number</Label>
            <Input
              id="accountNumber"
              value={formData.accountNumber}
              onChange={(e) => setFormData({...formData, accountNumber: e.target.value})}
              placeholder="Enter account number"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name</Label>
            <Input
              id="bankName"
              value={formData.bankName}
              onChange={(e) => setFormData({...formData, bankName: e.target.value})}
              placeholder="Enter bank name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ifscCode">IFSC Code</Label>
            <Input
              id="ifscCode"
              value={formData.ifscCode}
              onChange={(e) => setFormData({...formData, ifscCode: e.target.value.toUpperCase()})}
              placeholder="Enter IFSC code"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Account Type</Label>
            <Select value={formData.accountType} onValueChange={(value) => setFormData({...formData, accountType: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="savings">Savings</SelectItem>
                <SelectItem value="current">Current</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-primary"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Bank Account'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
