
import { Layout } from "@/components/layout/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, DollarSign, FileText, Phone, Lock, ChevronRight, Shield } from "lucide-react";
import { ProfileSection } from "@/components/account/profile-section";
import { BankAccountsSection } from "@/components/account/bank-accounts-section";
import { PrivacyPolicy } from "@/components/account/privacy-policy";
import { TermsConditions } from "@/components/account/terms-conditions";
import { PasswordChangeModal } from "@/components/account/password-change-modal";
import { AppDownloadSection } from "@/components/account/app-download-section";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Account = () => {
  const { user, signOut } = useAuth();
  const [activeSection, setActiveSection] = useState<string>('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const { data: orders } = useQuery({
    queryKey: ['user-orders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleFundDeposit = () => {
    // Navigate to wallet page for deposits
    window.location.href = '/wallet';
  };

  const handleAllOrders = () => {
    setActiveSection('orders');
  };

  const handleContactUs = () => {
    // Open contact form or redirect to contact page
    alert('Contact support: support@bitexa.in');
  };

  const handlePasswordChange = () => {
    setShowPasswordModal(true);
  };

  return (
    <Layout>
      <div className="space-y-6 animate-slide-up pb-20 md:pb-8">
        <div className="flex items-center gap-2">
          <User className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold gradient-text">My Account</h1>
        </div>

        {activeSection === '' && (
          <>
            <ProfileSection />

            <AppDownloadSection />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="h-16 justify-between glass hover-glow"
                onClick={() => setActiveSection('profile')}
              >
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-primary" />
                  <span>Profile</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button 
                variant="outline" 
                className="h-16 justify-between glass hover-glow"
                onClick={() => setActiveSection('banks')}
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <span>Add Bank</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button 
                variant="outline" 
                className="h-16 justify-between glass hover-glow"
                onClick={handleFundDeposit}
              >
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <span>Fund Deposit</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button 
                variant="outline" 
                className="h-16 justify-between glass hover-glow"
                onClick={handleAllOrders}
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <span>All Orders ({orders?.length || 0})</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button 
                variant="outline" 
                className="h-16 justify-between glass hover-glow"
                onClick={handleContactUs}
              >
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-primary" />
                  <span>Contact Us</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button 
                variant="outline" 
                className="h-16 justify-between glass hover-glow"
                onClick={handlePasswordChange}
              >
                <div className="flex items-center gap-3">
                  <Lock className="h-5 w-5 text-primary" />
                  <span>Password Change</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button
                variant="outline" 
                className="h-16 justify-between glass hover-glow"
                onClick={() => setActiveSection('privacy')}
              >
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-primary" />
                  <span>Privacy Policy</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </Button>

              <Button 
                variant="outline" 
                className="h-16 justify-between glass hover-glow"
                onClick={() => setActiveSection('terms')}
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <span>Terms & Conditions</span>
                </div>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="pt-4">
              <Button 
                variant="destructive" 
                className="w-full"
                onClick={signOut}
              >
                Logout
              </Button>
            </div>
          </>
        )}

        {activeSection === 'profile' && (
          <div className="space-y-4">
            <Button 
              variant="ghost" 
              onClick={() => setActiveSection('')}
              className="mb-4"
            >
              ← Back
            </Button>
            <ProfileSection />
          </div>
        )}

        {activeSection === 'banks' && (
          <div className="space-y-4">
            <Button 
              variant="ghost" 
              onClick={() => setActiveSection('')}
              className="mb-4"
            >
              ← Back
            </Button>
            <BankAccountsSection />
          </div>
        )}

        {activeSection === 'orders' && (
          <div className="space-y-4">
            <Button 
              variant="ghost" 
              onClick={() => setActiveSection('')}
              className="mb-4"
            >
              ← Back
            </Button>
            <Card className="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  All Orders ({orders?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {orders && orders.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-1">
                    {orders.map((order) => (
                      <div key={order.id} className="p-4 border rounded-lg bg-card/50 hover:bg-card/80 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-semibold text-lg">{order.symbol}</span>
                              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                order.trade_type === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {order.trade_type.toUpperCase()}
                              </span>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div className="flex flex-wrap gap-4">
                                <span>Qty: {Number(order.quantity).toLocaleString('en-IN', { maximumFractionDigits: 6 })}</span>
                                <span>Price: ₹{Number(order.price).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                              </div>
                              <p className="text-xs">
                                {new Date(order.created_at).toLocaleDateString('en-IN', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2">
                            <div className="text-right">
                              <p className="font-bold text-lg">₹{Number(order.total_amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
                              <p className="text-xs text-muted-foreground">${(Number(order.total_amount) / 84).toFixed(2)}</p>
                            </div>
                            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                              order.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {order.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/20 flex items-center justify-center">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">No orders found</p>
                    <p className="text-muted-foreground/70 text-xs mt-1">Your trading history will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeSection === 'privacy' && (
          <div className="space-y-4">
            <Button 
              variant="ghost" 
              onClick={() => setActiveSection('')}
              className="mb-4"
            >
              ← Back
            </Button>
            <PrivacyPolicy />
          </div>
        )}

        {activeSection === 'terms' && (
          <div className="space-y-4">
            <Button 
              variant="ghost" 
              onClick={() => setActiveSection('')}
              className="mb-4"
            >
              ← Back
            </Button>
            <TermsConditions />
          </div>
        )}
        
        <PasswordChangeModal 
          isOpen={showPasswordModal} 
          onClose={() => setShowPasswordModal(false)} 
        />
      </div>
    </Layout>
  );
};

export default Account;
