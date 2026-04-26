import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Download, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function AppManagement() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.apk')) {
      toast.error('Please upload an APK file');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Delete existing file first
      await supabase.storage
        .from('app-downloads')
        .remove(['nadex-app.apk']);

      // Upload new file
      const { data, error } = await supabase.storage
        .from('app-downloads')
        .upload('nadex-app.apk', file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      setUploadProgress(100);
      toast.success('App updated successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload app');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleUploadPreloadedAPK = async () => {
    setUploading(true);
    setUploadProgress(0);

    try {
      // Fetch the pre-loaded APK file
      const response = await fetch('/lovable-uploads/app-release.apk');
      const blob = await response.blob();
      const file = new File([blob], 'nadex-app.apk', { type: 'application/vnd.android.package-archive' });

      // Delete existing file first
      await supabase.storage
        .from('app-downloads')
        .remove(['nadex-app.apk']);

      // Upload new file
      const { error } = await supabase.storage
        .from('app-downloads')
        .upload('nadex-app.apk', file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;

      setUploadProgress(100);
      toast.success('App uploaded successfully! Users can now download it.');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload app');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDownloadTest = async () => {
    try {
      const { data, error } = await supabase
        .storage
        .from('app-downloads')
        .download('nadex-app.apk');
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Nadex-App-Test.apk';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Test download successful');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download failed');
    }
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          App Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="p-4 border rounded-lg bg-green-500/10 border-green-500/20">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Ready to Upload App
            </h4>
            <p className="text-sm text-muted-foreground mb-3">
              New app version is ready. Click the button below to make it available for users to download.
            </p>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleUploadPreloadedAPK}
                disabled={uploading}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload App to Server
              </Button>
              <Button
                onClick={handleDownloadTest}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Test Download
              </Button>
            </div>
          </div>

          <div className="border-t pt-4">
            <Label htmlFor="apk-upload" className="text-sm font-medium">
              Or Upload Different APK File
            </Label>
            <Input
              id="apk-upload"
              type="file"
              accept=".apk"
              onChange={handleFileUpload}
              disabled={uploading}
              className="mt-2"
            />
          </div>
          
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                Uploading... {uploadProgress}%
              </div>
              <div className="w-full bg-secondary rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border rounded-lg bg-muted/20">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-medium">App Update Instructions</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Upload APK files only (maximum 100MB)</li>
                <li>• New uploads replace the existing app file</li>
                <li>• Users can download the latest version from their account</li>
                <li>• Test download functionality after uploading</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}