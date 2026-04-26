export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_holder_name: string
          account_number: string
          bank_name: string
          created_at: string | null
          id: string
          ifsc_code: string
          is_primary: boolean | null
          user_id: string
        }
        Insert: {
          account_holder_name: string
          account_number: string
          bank_name: string
          created_at?: string | null
          id?: string
          ifsc_code: string
          is_primary?: boolean | null
          user_id: string
        }
        Update: {
          account_holder_name?: string
          account_number?: string
          bank_name?: string
          created_at?: string | null
          id?: string
          ifsc_code?: string
          is_primary?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      deposit_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          approved_by: string | null
          created_at: string | null
          id: string
          payment_method: string
          processed_at: string | null
          status: string | null
          transaction_reference: string | null
          updated_at: string | null
          user_id: string
          wallet_updated: boolean | null
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          approved_by?: string | null
          created_at?: string | null
          id?: string
          payment_method: string
          processed_at?: string | null
          status?: string | null
          transaction_reference?: string | null
          updated_at?: string | null
          user_id: string
          wallet_updated?: boolean | null
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          approved_by?: string | null
          created_at?: string | null
          id?: string
          payment_method?: string
          processed_at?: string | null
          status?: string | null
          transaction_reference?: string | null
          updated_at?: string | null
          user_id?: string
          wallet_updated?: boolean | null
        }
        Relationships: []
      }
      kyc_documents: {
        Row: {
          aadhar_back_url: string | null
          aadhar_front_url: string | null
          admin_notes: string | null
          created_at: string | null
          id: string
          pan_card_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          submitted_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          aadhar_back_url?: string | null
          aadhar_front_url?: string | null
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          pan_card_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          aadhar_back_url?: string | null
          aadhar_front_url?: string | null
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          pan_card_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      portfolio_positions: {
        Row: {
          admin_adjustment_pct: number | null
          admin_price_override: boolean | null
          amount: number
          buy_price: number
          coin_name: string
          created_at: string | null
          current_price: number | null
          current_value: number | null
          id: string
          pnl: number | null
          pnl_percentage: number | null
          position_type: string | null
          status: string | null
          symbol: string
          total_investment: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_adjustment_pct?: number | null
          admin_price_override?: boolean | null
          amount: number
          buy_price: number
          coin_name: string
          created_at?: string | null
          current_price?: number | null
          current_value?: number | null
          id?: string
          pnl?: number | null
          pnl_percentage?: number | null
          position_type?: string | null
          status?: string | null
          symbol: string
          total_investment?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_adjustment_pct?: number | null
          admin_price_override?: boolean | null
          amount?: number
          buy_price?: number
          coin_name?: string
          created_at?: string | null
          current_price?: number | null
          current_value?: number | null
          id?: string
          pnl?: number | null
          pnl_percentage?: number | null
          position_type?: string | null
          status?: string | null
          symbol?: string
          total_investment?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          email: string | null
          id: string
          mobile_number: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          mobile_number?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          mobile_number?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quick_deposits: {
        Row: {
          admin_notes: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          id: string
          status: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          coin_name: string | null
          created_at: string | null
          id: string
          price: number
          quantity: number
          status: string | null
          symbol: string
          total_amount: number
          trade_type: string
          user_id: string
        }
        Insert: {
          coin_name?: string | null
          created_at?: string | null
          id?: string
          price: number
          quantity: number
          status?: string | null
          symbol: string
          total_amount: number
          trade_type: string
          user_id: string
        }
        Update: {
          coin_name?: string | null
          created_at?: string | null
          id?: string
          price?: number
          quantity?: number
          status?: string | null
          symbol?: string
          total_amount?: number
          trade_type?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          reference_id: string | null
          status: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          status?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          balance: number | null
          created_at: string | null
          currency: string | null
          id: string
          locked_balance: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          locked_balance?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          locked_balance?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          coin_name: string
          created_at: string | null
          id: string
          symbol: string
          user_id: string
        }
        Insert: {
          coin_name: string
          created_at?: string | null
          id?: string
          symbol: string
          user_id: string
        }
        Update: {
          coin_name?: string
          created_at?: string | null
          id?: string
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          approved_by: string | null
          bank_account_id: string | null
          created_at: string | null
          id: string
          payment_method: string
          processed_at: string | null
          status: string | null
          updated_at: string | null
          upi_id: string | null
          usdt_address: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          approved_by?: string | null
          bank_account_id?: string | null
          created_at?: string | null
          id?: string
          payment_method: string
          processed_at?: string | null
          status?: string | null
          updated_at?: string | null
          upi_id?: string | null
          usdt_address?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          approved_by?: string | null
          bank_account_id?: string | null
          created_at?: string | null
          id?: string
          payment_method?: string
          processed_at?: string | null
          status?: string | null
          updated_at?: string | null
          upi_id?: string | null
          usdt_address?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_user: {
        Args: { admin_id: string; target_user_id: string }
        Returns: Json
      }
      get_public_admin_settings: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      process_deposit_approval: {
        Args: { admin_id: string; deposit_id: string }
        Returns: Json
      }
      process_quick_deposit_approval: {
        Args: { admin_id: string; quick_deposit_id: string }
        Returns: Json
      }
      process_withdrawal_approval: {
        Args: { admin_id: string; withdrawal_id: string }
        Returns: Json
      }
      reject_quick_deposit: {
        Args: { admin_id: string; notes?: string; quick_deposit_id: string }
        Returns: Json
      }
      reject_request: {
        Args: {
          admin_id: string
          notes?: string
          request_id: string
          request_type: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user"
      kyc_status: "pending" | "approved" | "rejected"
      request_status: "pending" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      kyc_status: ["pending", "approved", "rejected"],
      request_status: ["pending", "approved", "rejected"],
    },
  },
} as const
