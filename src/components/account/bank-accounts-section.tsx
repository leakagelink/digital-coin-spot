
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CreditCard, Plus, Trash2 } from 'lucide-react';
import { AddBankAccountModal } from './add-bank-account-modal';
import { useToast } from '@/hooks/use-toast';

interface BankAccount {
  id: string;
  account_number: string;
  account_holder_name: string;
  bank_name: string;
  ifsc_code: string;
  is_primary: boolean;
}

export function BankAccountsSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: bankAccounts, refetch } = useQuery({
    queryKey: ['bank-accounts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as BankAccount[];
    },
    enabled: !!user,
  });

  const handleDeleteAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;

      toast({
        title: "Bank account deleted",
        description: "Bank account has been removed successfully",
      });

      refetch();
    } catch (error) {
      console.error('Error deleting bank account:', error);
      toast({
        title: "Error",
        description: "Failed to delete bank account",
        variant: "destructive"
      });
    }
  };

  return (
    <>
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Bank Accounts
            </div>
            <Button
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Bank
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bankAccounts && bankAccounts.length > 0 ? (
            <div className="space-y-3">
              {bankAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-semibold">{account.bank_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {account.account_holder_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      ****{account.account_number.slice(-4)}
                    </p>
                    {account.is_primary && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                        Primary
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteAccount(account.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No bank accounts added</p>
              <Button
                className="mt-4 bg-gradient-primary"
                onClick={() => setShowAddModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Bank Account
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AddBankAccountModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onBankAdded={refetch}
      />
    </>
  );
}
