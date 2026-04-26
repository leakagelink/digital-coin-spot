
import { Shield, Smartphone } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function AuthComingSoon() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="max-w-md w-full glass border-primary/20">
        <CardContent className="p-8 text-center space-y-6">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold gradient-text">
              Bitexa
            </h1>
            <p className="text-xl font-semibold text-foreground">
              Welcome!
            </p>
          </div>
          
          <div className="space-y-4 text-muted-foreground">
            <div className="flex items-center justify-center gap-2 text-primary">
              <Smartphone className="w-5 h-5" />
              <span className="font-semibold">Mobile App Required</span>
            </div>
            
            <p className="text-sm leading-relaxed">
              Thank you for signing up! Our cryptocurrency trading platform is currently available only on mobile devices.
            </p>
            
            <p className="text-sm leading-relaxed">
              Please download our Android app to start trading and access all features.
            </p>
          </div>
          
          <div className="space-y-3 pt-4">
            <Button 
              className="w-full bg-gradient-primary"
              onClick={() => window.open('https://play.google.com/store', '_blank')}
            >
              Download Android App
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={signOut}
            >
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
