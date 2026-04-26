
import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ImagePlus, Loader2 } from 'lucide-react';

interface AvatarUploaderProps {
  onUploaded?: (url: string) => void;
  className?: string;
}

export const AvatarUploader: React.FC<AvatarUploaderProps> = ({ onUploaded, className }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleSelect = () => inputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file || !user) return;

    // 1MB limit
    const MAX_SIZE_BYTES = 1 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      toast({
        title: 'File too large',
        description: 'Please upload an image up to 1 MB.',
        variant: 'destructive',
      });
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowed = ['jpg', 'jpeg', 'png', 'webp'];
    if (!ext || !allowed.includes(ext)) {
      toast({
        title: 'Invalid file type',
        description: 'Only JPG, JPEG, PNG or WEBP are allowed.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploading(true);
      const path = `${user.id}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-photos')
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast({
          title: 'Upload failed',
          description: uploadError.message,
          variant: 'destructive',
        });
        return;
      }

      // Get public URL
      const { data } = supabase.storage.from('profile-photos').getPublicUrl(path);
      const publicUrl = data?.publicUrl;

      if (!publicUrl) {
        toast({
          title: 'URL error',
          description: 'Could not get public URL for the uploaded image.',
          variant: 'destructive',
        });
        return;
      }

      // Update profile avatar_url
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        toast({
          title: 'Profile update failed',
          description: updateError.message,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Photo updated',
        description: 'Your profile photo has been updated.',
      });

      onUploaded?.(publicUrl);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleSelect}
        disabled={uploading}
        className="gap-2"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <ImagePlus className="h-4 w-4" />
            Change Photo
          </>
        )}
      </Button>
    </div>
  );
};
