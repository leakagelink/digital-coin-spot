
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type KycRow = {
  id: string;
  user_id: string;
  aadhar_front_url: string | null;
  aadhar_back_url: string | null;
  pan_card_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export function KYCSection() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [aadharFront, setAadharFront] = useState<File | null>(null);
  const [aadharBack, setAadharBack] = useState<File | null>(null);
  const [panCard, setPanCard] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: kyc, refetch, isLoading } = useQuery({
    queryKey: ['kyc', user?.id],
    queryFn: async (): Promise<KycRow | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('kyc_documents')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as KycRow | null;
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const uploadFile = async (file: File, key: string) => {
    if (!user) return null;
    const path = `${user.id}/${key}_${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from('kyc-documents').upload(path, file, {
      upsert: false,
    });
    if (error) throw error;
    return path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!aadharFront && !aadharBack && !panCard) {
      toast({
        title: "Upload required",
        description: "Please upload at least one document to submit KYC.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const updates: Partial<KycRow> = {};

      if (aadharFront) {
        const path = await uploadFile(aadharFront, 'aadhar_front');
        updates.aadhar_front_url = path!;
      }
      if (aadharBack) {
        const path = await uploadFile(aadharBack, 'aadhar_back');
        updates.aadhar_back_url = path!;
      }
      if (panCard) {
        const path = await uploadFile(panCard, 'pan_card');
        updates.pan_card_url = path!;
      }

      // Insert or update user's KYC row
      if (!kyc) {
        const { error } = await supabase.from('kyc_documents').insert({
          user_id: user.id,
          ...updates,
          status: 'approved',
          submitted_at: new Date().toISOString(),
          reviewed_at: new Date().toISOString(),
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('kyc_documents')
          .update({
            ...updates,
            status: 'approved',
            submitted_at: new Date().toISOString(),
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id);
        if (error) throw error;
      }

      toast({
        title: "KYC request submitted",
        description: "KYC request submitted successfully.",
      });

      setAadharFront(null);
      setAadharBack(null);
      setPanCard(null);
      await refetch();
    } catch (error: any) {
      console.error('KYC submission error:', error);
      toast({
        title: "Submission failed",
        description: error.message || "Failed to submit KYC.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const statusBadge = () => {
    const status = kyc?.status || 'pending';
    const map: Record<string, string> = {
      pending: 'text-yellow-600',
      approved: 'text-green-600',
      rejected: 'text-red-600',
    };
    return <span className={`text-sm font-medium ${map[status]}`}>{status.toUpperCase()}</span>;
  };

  const disabled = !!kyc && kyc.status !== 'pending';

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          KYC Verification
          <div className="text-sm text-muted-foreground">
            Status: {isLoading ? 'Loading...' : statusBadge()}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="aadharFront">Aadhar Card (Front)</Label>
            <Input
              id="aadharFront"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setAadharFront(e.target.files?.[0] || null)}
              disabled={submitting || disabled}
            />
          </div>
          <div>
            <Label htmlFor="aadharBack">Aadhar Card (Back)</Label>
            <Input
              id="aadharBack"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setAadharBack(e.target.files?.[0] || null)}
              disabled={submitting || disabled}
            />
          </div>
          <div>
            <Label htmlFor="panCard">PAN Card</Label>
            <Input
              id="panCard"
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setPanCard(e.target.files?.[0] || null)}
              disabled={submitting || disabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {kyc?.submitted_at ? `Last submitted: ${new Date(kyc.submitted_at).toLocaleString()}` : 'Not submitted yet'}
            </div>
            <Button type="submit" disabled={submitting || disabled} className="bg-gradient-primary">
              {submitting ? 'Submitting...' : 'Submit KYC'}
            </Button>
          </div>

          {disabled && (
            <p className="text-sm text-muted-foreground">
              Your KYC is {kyc?.status}. You cannot modify documents now.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
