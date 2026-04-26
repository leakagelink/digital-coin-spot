
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type PublicUPI = {
  upi_id?: string;
  qr_code?: string;
  instructions?: string[];
};

type PublicBank = {
  account_holder?: string;
  bank_name?: string;
  account_number?: string;
  ifsc?: string;
  instructions?: string[];
};

type PublicUSDT = {
  wallet_address?: string;
  network?: string;
  instructions?: string[];
};

type PublicAdminSettings = {
  upi_details?: PublicUPI;
  bank_details?: PublicBank;
  usdt_details?: PublicUSDT;
};

export function useAdminSettings() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-settings-public"],
    queryFn: async (): Promise<PublicAdminSettings | null> => {
      console.log("Fetching public admin settings via RPC...");
      const { data, error } = await supabase.rpc("get_public_admin_settings");
      if (error) throw error;
      console.log("Public admin settings:", data);
      return data as PublicAdminSettings;
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  return { settings: data || undefined, isLoading, error, refetch };
}
