
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { AuthWrapper } from "./components/layout/auth-wrapper";
import { PasswordResetModal } from "./components/auth/password-reset-modal";
import Index from "./pages/Index";
import Chart from "./pages/Chart";
import Portfolio from "./pages/Portfolio";
import Trades from "./pages/Trades";
import Wallet from "./pages/Wallet";
import Watchlist from "./pages/Watchlist";
import Account from "./pages/Account";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/AuthCallback";
import "./App.css";

const queryClient = new QueryClient();

function AppContent() {
  const { showPasswordReset, setShowPasswordReset } = useAuth();

  return (
    <>
      <AuthWrapper>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/chart/:symbol" element={<Chart />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/trades" element={<Trades />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/account" element={<Account />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthWrapper>
      <PasswordResetModal 
        isOpen={showPasswordReset} 
        onClose={() => setShowPasswordReset(false)} 
      />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
