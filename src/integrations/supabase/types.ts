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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      call_attempts: {
        Row: {
          auto_triggered: boolean
          business_name: string
          created_at: string
          error_message: string | null
          id: string
          job_id: string | null
          payload: Json | null
          phone_number: string
          status: string
          user_id: string
        }
        Insert: {
          auto_triggered?: boolean
          business_name: string
          created_at?: string
          error_message?: string | null
          id?: string
          job_id?: string | null
          payload?: Json | null
          phone_number: string
          status?: string
          user_id: string
        }
        Update: {
          auto_triggered?: boolean
          business_name?: string
          created_at?: string
          error_message?: string | null
          id?: string
          job_id?: string | null
          payload?: Json | null
          phone_number?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_attempts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "scraping_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          job_id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "scraping_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          currency: string
          id: string
          metadata: Json | null
          payment_link_id: string
          plan_name: string
          square_environment: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          payment_link_id: string
          plan_name: string
          square_environment?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json | null
          payment_link_id?: string
          plan_name?: string
          square_environment?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      scraping_jobs: {
        Row: {
          ai_instructions: string | null
          api_key_id: string | null
          auto_paginate: boolean | null
          created_at: string
          extraction_config: Json | null
          fields_count: number | null
          id: string
          last_run_at: string | null
          max_pages: number | null
          next_run_at: string | null
          pages_scraped: number | null
          proxy_enabled: boolean | null
          results: Json | null
          results_count: number | null
          schedule_enabled: boolean | null
          schedule_frequency: string | null
          schedule_interval: number | null
          scrape_type: string
          search_limit: number | null
          status: string
          target_country: string | null
          target_state: string | null
          template_id: string | null
          updated_at: string
          url: string
          user_id: string
          webhook_url: string | null
        }
        Insert: {
          ai_instructions?: string | null
          api_key_id?: string | null
          auto_paginate?: boolean | null
          created_at?: string
          extraction_config?: Json | null
          fields_count?: number | null
          id?: string
          last_run_at?: string | null
          max_pages?: number | null
          next_run_at?: string | null
          pages_scraped?: number | null
          proxy_enabled?: boolean | null
          results?: Json | null
          results_count?: number | null
          schedule_enabled?: boolean | null
          schedule_frequency?: string | null
          schedule_interval?: number | null
          scrape_type: string
          search_limit?: number | null
          status?: string
          target_country?: string | null
          target_state?: string | null
          template_id?: string | null
          updated_at?: string
          url: string
          user_id: string
          webhook_url?: string | null
        }
        Update: {
          ai_instructions?: string | null
          api_key_id?: string | null
          auto_paginate?: boolean | null
          created_at?: string
          extraction_config?: Json | null
          fields_count?: number | null
          id?: string
          last_run_at?: string | null
          max_pages?: number | null
          next_run_at?: string | null
          pages_scraped?: number | null
          proxy_enabled?: boolean | null
          results?: Json | null
          results_count?: number | null
          schedule_enabled?: boolean | null
          schedule_frequency?: string | null
          schedule_interval?: number | null
          scrape_type?: string
          search_limit?: number | null
          status?: string
          target_country?: string | null
          target_state?: string | null
          template_id?: string | null
          updated_at?: string
          url?: string
          user_id?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      scraping_templates: {
        Row: {
          ai_instructions: string | null
          category: string
          created_at: string
          description: string | null
          extraction_config: Json | null
          icon: string | null
          id: string
          is_system: boolean
          name: string
          scrape_type: string
          user_id: string | null
        }
        Insert: {
          ai_instructions?: string | null
          category: string
          created_at?: string
          description?: string | null
          extraction_config?: Json | null
          icon?: string | null
          id?: string
          is_system?: boolean
          name: string
          scrape_type: string
          user_id?: string | null
        }
        Update: {
          ai_instructions?: string | null
          category?: string
          created_at?: string
          description?: string | null
          extraction_config?: Json | null
          icon?: string | null
          id?: string
          is_system?: boolean
          name?: string
          scrape_type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          auto_call_on_scrape_complete: boolean
          created_at: string
          email_on_job_complete: boolean
          email_on_job_failure: boolean
          email_on_scheduled_job_complete: boolean
          email_on_scheduled_job_failure: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_call_on_scrape_complete?: boolean
          created_at?: string
          email_on_job_complete?: boolean
          email_on_job_failure?: boolean
          email_on_scheduled_job_complete?: boolean
          email_on_scheduled_job_failure?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_call_on_scrape_complete?: boolean
          created_at?: string
          email_on_job_complete?: boolean
          email_on_job_failure?: boolean
          email_on_scheduled_job_complete?: boolean
          email_on_scheduled_job_failure?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhooks: {
        Row: {
          created_at: string
          events: string[]
          id: string
          is_active: boolean
          last_triggered_at: string | null
          name: string
          secret: string | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name: string
          secret?: string | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name?: string
          secret?: string | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
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
