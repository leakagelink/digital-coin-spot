import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setShowPasswordReset } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      // Check URL params for recovery/magic link
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const queryParams = new URLSearchParams(window.location.search);
      
      const type = hashParams.get('type') || queryParams.get('type');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      // If we have tokens in the URL, set the session
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!error) {
          // Check if this is a password recovery flow
          if (type === 'recovery') {
            setShowPasswordReset(true);
          }
          // Redirect to home after successful auth
          navigate('/', { replace: true });
          return;
        }
      }

      // Try to exchange code for session (for PKCE flow)
      const code = queryParams.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          if (type === 'recovery') {
            setShowPasswordReset(true);
          }
          navigate('/', { replace: true });
          return;
        }
      }

      // Fallback - just redirect to home
      navigate('/', { replace: true });
    };

    handleCallback();
  }, [navigate, setShowPasswordReset]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <h1 className="text-lg font-semibold">Logging you in…</h1>
        <p className="text-sm text-muted-foreground">Processing secure link. This may take a moment.</p>
      </div>
    </main>
  );
}
