
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { User, Edit, Save, X } from 'lucide-react';
import { KYCSection } from './kyc-section';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarUploader } from './avatar-uploader';

export function ProfileSection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');

  const { data: profile, refetch } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      setDisplayName(data.display_name || '');
      return data;
    },
    enabled: !!user,
  });

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });

      refetch();
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    }
  };

  const initials = (profile?.display_name || user?.email || 'U')
    .toString()
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <div className="space-y-6">
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Profile Information
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              {profile?.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt="Profile photo" />
              ) : (
                <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              )}
            </Avatar>
            <AvatarUploader
              onUploaded={() => {
                // Refresh profile to show new avatar
                refetch();
              }}
            />
          </div>

          <div className="flex items-center space-x-4">
            {/* Replaces the older static icon with the actual avatar above */}
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-2">
                  <div>
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your name"
                    />
                  </div>
                  <Button size="sm" onClick={handleSaveProfile}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              ) : (
                <div>
                  <h3 className="font-semibold">{profile?.display_name || 'Not set'}</h3>
                  <p className="text-muted-foreground">{user?.email}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <KYCSection />
    </div>
  );
}
