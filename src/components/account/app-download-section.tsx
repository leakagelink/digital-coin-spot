import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function AppDownloadSection() {
  const handleAppDownload = async () => {
    try {
      toast.loading('Downloading app...');
      
      const { data, error } = await supabase
        .storage
        .from('app-downloads')
        .download('nadex-app.apk');
      
      if (error) {
        console.error('Download error:', error);
        toast.error('App download is not available at the moment');
        return;
      }
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Nadex-App.apk';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('App downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download app');
    }
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          Download Nadex App
        </CardTitle>
        <CardDescription>
          Get the mobile app for a better trading experience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Trade on the go</p>
              <p className="text-xs text-muted-foreground">Access your portfolio anytime, anywhere</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Real-time updates</p>
              <p className="text-xs text-muted-foreground">Get instant notifications on market movements</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Secure & Fast</p>
              <p className="text-xs text-muted-foreground">Enhanced security with biometric login</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <Button 
            onClick={handleAppDownload}
            className="w-full flex items-center gap-2 hover-glow"
            size="lg"
          >
            <Download className="h-5 w-5" />
            Download Android App (APK)
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            For Android devices • Latest version
          </p>
        </div>

        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <p className="text-xs text-amber-600 dark:text-amber-400">
            <strong>Note:</strong> Enable "Install from Unknown Sources" in your device settings before installing.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
