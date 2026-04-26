
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useIsAdmin() {
  const { user } = useAuth();

  const { data: isAdmin, isLoading, error } = useQuery({
    queryKey: ["user-admin-role", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      console.log("Fetched admin role:", !!data);
      return !!data;
    },
    enabled: !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  return { isAdmin: isAdmin ?? false, isLoading, error };
}
