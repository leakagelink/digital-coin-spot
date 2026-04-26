import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Copy, CheckCircle, Clock } from 'lucide-react';
import { useAdminSettings } from '@/hooks/useAdminSettings';
import { useQueryClient } from '@tanstack/react-query';

interface QuickDepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COUNTDOWN_DURATION = 10 * 60; // 10 minutes in seconds
const PROVISIONAL_CREDIT_TIME = 2 * 60 + 39; // 2 minutes 39 seconds remaining

export function QuickDepositModal({ isOpen, onClose }: QuickDepositModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'amount' | 'payment' | 'credited'>('amount');
  const [timeRemaining, setTimeRemaining] = useState(COUNTDOWN_DURATION);
  const [hasCredited, setHasCredited] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const creditedRef = useRef(false);

  const { settings, isLoading: settingsLoading } = useAdminSettings();

  // Convert Google Drive link to direct image URL
  const convertDriveLink = (url: string) => {
    if (!url) return '';
    // Check if it's a Google Drive link
    const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
      return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
    }
    // Check for drive.google.com/file/d/ format
    const driveMatch2 = url.match(/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch2) {
      return `https://drive.google.com/uc?export=view&id=${driveMatch2[1]}`;
    }
    return url;
  };

  // Get QR code - use admin settings or fallback to static file
  const getQrCode = () => {
    const adminQr = settings?.upi_details?.qr_code;
    if (adminQr) {
      return convertDriveLink(adminQr);
    }
    // Fallback to static QR code in public folder
    return '/lovable-uploads/upi-qr-code.jpeg';
  };

  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Process provisional credit
  const processProvisionalCredit = async () => {
    if (creditedRef.current || !user || !amount) return;
    creditedRef.current = true;
    setHasCredited(true);

    try {
      const depositAmount = parseFloat(amount);

      // Check for duplicate - prevent re-crediting
      const { data: existingDeposit } = await supabase
        .from('quick_deposits')
        .select('id')
        .eq('user_id', user.id)
        .eq('amount', depositAmount)
        .eq('status', 'locked')
        .gte('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString())
        .maybeSingle();

      if (existingDeposit) {
        console.log('Duplicate quick deposit prevented');
        return;
      }

      // Create quick deposit record
      const { error: depositError } = await supabase
        .from('quick_deposits')
        .insert({
          user_id: user.id,
          amount: depositAmount,
          status: 'locked'
        });

      if (depositError) throw depositError;

      // Get current locked balance and increment
      const { data: currentWallet } = await supabase
        .from('wallets')
        .select('locked_balance')
        .eq('user_id', user.id)
        .single();

      const newLockedBalance = Number(currentWallet?.locked_balance || 0) + depositAmount;

      const { error: updateError } = await supabase
        .from('wallets')
        .update({ locked_balance: newLockedBalance })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Invalidate wallet query to refresh UI
      queryClient.invalidateQueries({ queryKey: ['wallet-balance'] });

      toast({
        title: "Provisional Credit Added",
        description: `₹${depositAmount.toLocaleString()} has been added to your locked balance. It will be available after admin approval.`,
      });

      setStep('credited');
    } catch (error) {
      console.error('Error processing provisional credit:', error);
      creditedRef.current = false;
      setHasCredited(false);
      toast({
        title: "Error",
        description: "Failed to process provisional credit",
        variant: "destructive"
      });
    }
  };

  // Start countdown timer
  useEffect(() => {
    if (step === 'payment' && !hasCredited) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          
          // Check if we've reached the provisional credit time (8:29 remaining)
          if (newTime === PROVISIONAL_CREDIT_TIME && !creditedRef.current) {
            processProvisionalCredit();
          }
          
          // Stop at 0
          if (newTime <= 0) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step, hasCredited]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('amount');
      setAmount('');
      setTimeRemaining(COUNTDOWN_DURATION);
      setHasCredited(false);
      creditedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isOpen]);

  const handleProceed = () => {
    if (!amount || parseFloat(amount) < 100) {
      toast({
        title: "Invalid Amount",
        description: "Minimum deposit amount is ₹100",
        variant: "destructive"
      });
      return;
    }
    setStep('payment');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Copied to clipboard",
    });
  };

  const upiId = settings?.upi_details?.upi_id || 'nadex@ptaxis';
  const qrCode = getQrCode();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Deposit</DialogTitle>
        </DialogHeader>

        {step === 'amount' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quick-amount">Amount (₹)</Label>
              <Input
                id="quick-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                min="100"
              />
              <p className="text-sm text-muted-foreground">
                Minimum deposit: ₹100
              </p>
            </div>
            
            <Button onClick={handleProceed} className="w-full bg-gradient-primary">
              Add Funds
            </Button>
          </div>
        )}

        {step === 'payment' && (
          <div className="space-y-4">
            {/* Timer */}
            <div className="flex items-center justify-center gap-2 p-4 bg-muted rounded-lg">
              <Clock className="h-5 w-5 text-primary" />
              <span className="text-2xl font-mono font-bold">
                {formatTime(timeRemaining)}
              </span>
            </div>

            {timeRemaining <= PROVISIONAL_CREDIT_TIME && hasCredited && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
                <p className="text-sm text-green-600 dark:text-green-400">
                  Provisional credit added to locked balance
                </p>
              </div>
            )}

            {/* Payment Details */}
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <h3 className="font-semibold">Payment Details</h3>
              
              <div className="flex justify-between items-center">
                <span>Amount:</span>
                <span className="font-bold text-lg">₹{parseFloat(amount).toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center">
                <span>UPI ID:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{upiId}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(upiId)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <span className="text-sm font-medium">Scan QR Code:</span>
                <div className="mt-2 p-3 bg-white rounded-lg border flex items-center justify-center">
                  <img 
                    src={qrCode} 
                    alt="Payment QR Code" 
                    className="w-48 h-48 object-contain"
                    onError={(e) => {
                      // Fallback to static QR if dynamic fails
                      const target = e.currentTarget;
                      if (target.src !== '/lovable-uploads/upi-qr-code.jpeg') {
                        target.src = '/lovable-uploads/upi-qr-code.jpeg';
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Scan this QR code with your UPI app
                </p>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-2">
              <h4 className="font-semibold">Instructions:</h4>
              <ul className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Open your UPI app (PhonePe, Google Pay, Paytm)</li>
                <li>Scan the QR code or pay to UPI ID: {upiId}</li>
                <li>Send exactly ₹{parseFloat(amount).toLocaleString()}</li>
                <li>Payment karne ke baad fund instantly add ho jayega</li>
              </ul>
            </div>

            <Button variant="outline" onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        )}

        {step === 'credited' && (
          <div className="text-center space-y-4">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h3 className="text-lg font-semibold">Provisional Credit Added!</h3>
            <p className="text-muted-foreground">
              ₹{parseFloat(amount).toLocaleString()} has been added to your locked balance.
              Once admin approves, it will be moved to your available balance.
            </p>
            <Button onClick={onClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
