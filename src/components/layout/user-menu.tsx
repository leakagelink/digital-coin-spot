
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, User } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function UserMenu() {
  const { user, signOut } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['profile-avatar', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url, email, display_name')
        .eq('id', user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleSignOut = async () => {
    await signOut();
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  };

  if (!user) return null;

  const userInitials =
    (profile?.display_name || user.email || 'U').toString().trim().charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt="Profile photo" />
            ) : (
              <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                {userInitials}
              </AvatarFallback>
            )}
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 glass" align="end">
        <DropdownMenuItem className="flex items-center">
          <User className="mr-2 h-4 w-4" />
          <span>{user.email}</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut} className="flex items-center text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
