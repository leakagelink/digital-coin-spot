
import { Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon() {
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
              Coming Soon
            </p>
          </div>
          
          <div className="space-y-3 text-muted-foreground">
            <p>
              We're building something amazing for you.
            </p>
            <p className="text-sm">
              Our cryptocurrency trading platform will be launching soon.
            </p>
          </div>
          
          <div className="pt-4">
            <div className="w-full bg-secondary rounded-full h-2">
              <div className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full w-3/4 animate-pulse"></div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              75% Complete
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
