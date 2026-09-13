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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      holdings: {
        Row: {
          cost_basis: number
          country: string | null
          created_at: string | null
          id: string
          name: string
          shares: number
          symbol: string
          type: string | null
          user_id: string
        }
        Insert: {
          cost_basis: number
          country?: string | null
          created_at?: string | null
          id?: string
          name: string
          shares: number
          symbol: string
          type?: string | null
          user_id: string
        }
        Update: {
          cost_basis?: number
          country?: string | null
          created_at?: string | null
          id?: string
          name?: string
          shares?: number
          symbol?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      portfolio_snapshots: {
        Row: {
          cash_balance: number
          cost_basis: number
          created_at: string
          currency: string
          holdings_json: Json | null
          id: string
          snapshot_date: string
          total_value: number
          user_id: string
        }
        Insert: {
          cash_balance?: number
          cost_basis?: number
          created_at?: string
          currency?: string
          holdings_json?: Json | null
          id?: string
          snapshot_date?: string
          total_value?: number
          user_id: string
        }
        Update: {
          cash_balance?: number
          cost_basis?: number
          created_at?: string
          currency?: string
          holdings_json?: Json | null
          id?: string
          snapshot_date?: string
          total_value?: number
          user_id?: string
        }
        Relationships: []
      }
      portfolio_transactions: {
        Row: {
          created_at: string
          currency: string
          executed_at: string
          fees: number
          id: string
          notes: string | null
          price: number
          shares: number
          symbol: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          executed_at?: string
          fees?: number
          id?: string
          notes?: string | null
          price: number
          shares: number
          symbol: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          executed_at?: string
          fees?: number
          id?: string
          notes?: string | null
          price?: number
          shares?: number
          symbol?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          currency: string | null
          email: string | null
          full_name: string | null
          id: string
          timezone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          timezone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          currency?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          timezone?: string | null
        }
        Relationships: []
      }
      user_api_keys: {
        Row: {
          created_at: string
          id: string
          key_value: string
          last_tested_at: string | null
          provider: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          key_value: string
          last_tested_at?: string | null
          provider: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          key_value?: string
          last_tested_at?: string | null
          provider?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          id: string
          settings: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          settings?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          settings?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      watchlist_items: {
        Row: {
          added_at: string | null
          id: string
          symbol: string
          user_id: string
        }
        Insert: {
          added_at?: string | null
          id?: string
          symbol: string
          user_id: string
        }
        Update: {
          added_at?: string | null
          id?: string
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
      price_history: { Row: { symbol: string; ts: string; interval: string; open: number | null; high: number | null; low: number | null; close: number; volume: number | null; source: string }; Insert: { symbol: string; ts: string; interval?: string; open?: number | null; high?: number | null; low?: number | null; close: number; volume?: number | null; source: string }; Update: { symbol?: string; ts?: string; interval?: string; open?: number | null; high?: number | null; low?: number | null; close?: number; volume?: number | null; source?: string }; Relationships: [] }
      symbols_meta: { Row: { symbol: string; name: string; exchange: string; country: string | null; sector: string | null; industry: string | null; currency: string | null; market_cap: number | null; pe_ratio: number | null; dividend_yield: number | null; beta: number | null; week52_high: number | null; week52_low: number | null; is_sharia_compliant: boolean | null; logo_url: string | null; updated_at: string | null }; Insert: { symbol: string; name: string; exchange: string; country?: string | null; sector?: string | null; industry?: string | null; currency?: string | null; market_cap?: number | null; pe_ratio?: number | null; dividend_yield?: number | null; beta?: number | null; week52_high?: number | null; week52_low?: number | null; is_sharia_compliant?: boolean | null; logo_url?: string | null; updated_at?: string | null }; Update: { symbol?: string; name?: string; exchange?: string; country?: string | null; sector?: string | null; industry?: string | null; currency?: string | null; market_cap?: number | null; pe_ratio?: number | null; dividend_yield?: number | null; beta?: number | null; week52_high?: number | null; week52_low?: number | null; is_sharia_compliant?: boolean | null; logo_url?: string | null; updated_at?: string | null }; Relationships: [] }
      corporate_actions: { Row: { id: string; symbol: string; action_type: string; ex_date: string | null; record_date: string | null; payment_date: string | null; amount: number | null; details: Json | null; source: string | null; created_at: string | null }; Insert: { id?: string; symbol: string; action_type: string; ex_date?: string | null; record_date?: string | null; payment_date?: string | null; amount?: number | null; details?: Json | null; source?: string | null; created_at?: string | null }; Update: { id?: string; symbol?: string; action_type?: string; ex_date?: string | null; record_date?: string | null; payment_date?: string | null; amount?: number | null; details?: Json | null; source?: string | null; created_at?: string | null }; Relationships: [] }
      key_moments: { Row: { id: string; symbol: string; change_pct: number; summary: string; sources: Json; generated_at: string | null }; Insert: { id?: string; symbol: string; change_pct: number; summary: string; sources?: Json; generated_at?: string | null }; Update: { id?: string; symbol?: string; change_pct?: number; summary?: string; sources?: Json; generated_at?: string | null }; Relationships: [] }
      news_cache: { Row: { id: string; symbol: string; title: string; url: string; publisher: string | null; published_at: string | null }; Insert: { id?: string; symbol: string; title: string; url: string; publisher?: string | null; published_at?: string | null }; Update: { id?: string; symbol?: string; title?: string; url?: string; publisher?: string | null; published_at?: string | null }; Relationships: [] }
      scheduled_briefings: { Row: { id: string; user_id: string; prompt: string; schedule_cron: string; scope: string; delivery: string; active: boolean | null; last_run_at: string | null; created_at: string | null }; Insert: { id?: string; user_id: string; prompt: string; schedule_cron: string; scope?: string; delivery?: string; active?: boolean | null; last_run_at?: string | null; created_at?: string | null }; Update: { id?: string; user_id?: string; prompt?: string; schedule_cron?: string; scope?: string; delivery?: string; active?: boolean | null; last_run_at?: string | null; created_at?: string | null }; Relationships: [] }
      briefing_results: { Row: { id: string; briefing_id: string; user_id: string; content: string; sources: Json | null; generated_at: string | null }; Insert: { id?: string; briefing_id: string; user_id: string; content: string; sources?: Json | null; generated_at?: string | null }; Update: { id?: string; briefing_id?: string; user_id?: string; content?: string; sources?: Json | null; generated_at?: string | null }; Relationships: [] }
      screener_presets: { Row: { id: string; user_id: string; name: string; filters: Json; created_at: string | null }; Insert: { id?: string; user_id: string; name: string; filters?: Json; created_at?: string | null }; Update: { id?: string; user_id?: string; name?: string; filters?: Json; created_at?: string | null }; Relationships: [] }
      kenya_rates: { Row: { id: string; instrument: string; rate_pct: number; as_of: string; source: string }; Insert: { id?: string; instrument: string; rate_pct: number; as_of: string; source: string }; Update: { id?: string; instrument?: string; rate_pct?: number; as_of?: string; source?: string }; Relationships: [] }
      price_alerts: { Row: { id: string; user_id: string; symbol: string; condition: string; threshold: number; active: boolean | null; triggered_at: string | null; created_at: string | null }; Insert: { id?: string; user_id: string; symbol: string; condition: string; threshold: number; active?: boolean | null; triggered_at?: string | null; created_at?: string | null }; Update: { id?: string; user_id?: string; symbol?: string; condition?: string; threshold?: number; active?: boolean | null; triggered_at?: string | null; created_at?: string | null }; Relationships: [] }
      push_subscriptions: { Row: { id: string; user_id: string; endpoint: string; keys: Json; created_at: string | null }; Insert: { id?: string; user_id: string; endpoint: string; keys: Json; created_at?: string | null }; Update: { id?: string; user_id?: string; endpoint?: string; keys?: Json; created_at?: string | null }; Relationships: [] }
      public_track_records: { Row: { user_id: string; display_name: string; opted_in: boolean | null; ytd_return_pct: number | null; updated_at: string | null }; Insert: { user_id: string; display_name: string; opted_in?: boolean | null; ytd_return_pct?: number | null; updated_at?: string | null }; Update: { user_id?: string; display_name?: string; opted_in?: boolean | null; ytd_return_pct?: number | null; updated_at?: string | null }; Relationships: [] }
      learning_progress: { Row: { id: string; user_id: string; module_id: string; completed: boolean | null; score: number | null; completed_at: string | null }; Insert: { id?: string; user_id: string; module_id: string; completed?: boolean | null; score?: number | null; completed_at?: string | null }; Update: { id?: string; user_id?: string; module_id?: string; completed?: boolean | null; score?: number | null; completed_at?: string | null }; Relationships: [] }
      symbol_sentiment: { Row: { symbol: string; avg_score: number | null; label: string | null; updated_at: string | null }; Insert: { symbol: string; avg_score?: number | null; label?: string | null; updated_at?: string | null }; Update: { symbol?: string; avg_score?: number | null; label?: string | null; updated_at?: string | null }; Relationships: [] }
      fees_ledger: { Row: { id: string; user_id: string; holding_id: string | null; fee_type: string; amount: number; currency: string | null; incurred_at: string | null }; Insert: { id?: string; user_id: string; holding_id?: string | null; fee_type: string; amount: number; currency?: string | null; incurred_at?: string | null }; Update: { id?: string; user_id?: string; holding_id?: string | null; fee_type?: string; amount?: number; currency?: string | null; incurred_at?: string | null }; Relationships: [] }
      investment_goals: { Row: { id: string; user_id: string; title: string; target_amount: number; current_amount: number | null; currency: string | null; deadline: string | null; created_at: string | null }; Insert: { id?: string; user_id: string; title: string; target_amount: number; current_amount?: number | null; currency?: string | null; deadline?: string | null; created_at?: string | null }; Update: { id?: string; user_id?: string; title?: string; target_amount?: number; current_amount?: number | null; currency?: string | null; deadline?: string | null; created_at?: string | null }; Relationships: [] }
      transactions: { Row: { id: string; user_id: string; symbol: string; side: string; shares: number; price: number; fees: number | null; executed_at: string | null }; Insert: { id?: string; user_id: string; symbol: string; side: string; shares: number; price: number; fees?: number | null; executed_at?: string | null }; Update: { id?: string; user_id?: string; symbol?: string; side?: string; shares?: number; price?: number; fees?: number | null; executed_at?: string | null }; Relationships: [] }
      ideas: { Row: { id: string; user_id: string; symbol: string; title: string; body: string; sentiment: string | null; created_at: string | null }; Insert: { id?: string; user_id: string; symbol: string; title: string; body: string; sentiment?: string | null; created_at?: string | null }; Update: { id?: string; user_id?: string; symbol?: string; title?: string; body?: string; sentiment?: string | null; created_at?: string | null }; Relationships: [] }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
