
import { Layout } from "@/components/layout/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Users, Smartphone, Zap } from "lucide-react";
import { DepositRequestsTable } from "@/components/admin/DepositRequestsTable";
import { WithdrawalRequestsTable } from "@/components/admin/WithdrawalRequestsTable";
import { QuickDepositsTable } from "@/components/admin/QuickDepositsTable";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminUsersTable } from "@/components/admin/AdminUsersTable";
import { AdminPaymentSettings } from "@/components/admin/AdminPaymentSettings";
import { AppManagement } from "@/components/admin/AppManagement";
import { AdminPasswordChange } from "@/components/admin/AdminPasswordChange";

const Admin = () => {
  const { isAdmin, isLoading } = useIsAdmin();

  return (
    <Layout>
      <div className="space-y-6 animate-slide-up pb-20 md:pb-8">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold gradient-text">Admin Panel</h1>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Checking permissions...</div>
        ) : isAdmin ? (
          <Tabs defaultValue="deposits" className="w-full">
            <TabsList className="grid w-full grid-cols-6 glass">
              <TabsTrigger value="deposits">Deposits</TabsTrigger>
              <TabsTrigger value="quick-deposits" className="flex items-center gap-1">
                <Zap className="h-4 w-4" />
                Quick
              </TabsTrigger>
              <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="app" className="flex items-center gap-1">
                <Smartphone className="h-4 w-4" />
                App
              </TabsTrigger>
            </TabsList>

            <TabsContent value="deposits" className="space-y-4">
              <DepositRequestsTable />
            </TabsContent>

            <TabsContent value="quick-deposits" className="space-y-4">
              <QuickDepositsTable />
            </TabsContent>

            <TabsContent value="withdrawals" className="space-y-4">
              <WithdrawalRequestsTable />
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <AdminUsersTable />
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <AdminPasswordChange />
              <AdminPaymentSettings />
            </TabsContent>

            <TabsContent value="app" className="space-y-4">
              <AppManagement />
            </TabsContent>
          </Tabs>
        ) : (
          <Card className="glass">
            <CardHeader>
              <CardTitle>Access Restricted</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                You don't have admin permissions. Please login with an admin account.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Admin;
