export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          display_name: string | null
          gender: string | null
          id: string
          interests: string[] | null
          last_seen_at: string
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          username: string | null
          age: number | null
          bio: string | null
          mood: string | null
          is_scholar: boolean | null
          university: string | null
          socials: Json | null
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          id: string
          interests?: string[] | null
          last_seen_at?: string
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          username?: string | null
          age?: number | null
          bio?: string | null
          mood?: string | null
          is_scholar?: boolean | null
          university?: string | null
          socials?: Json | null
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          id?: string
          interests?: string[] | null
          last_seen_at?: string
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          username?: string | null
          age?: number | null
          bio?: string | null
          mood?: string | null
          is_scholar?: boolean | null
          university?: string | null
          socials?: Json | null
        }
        Relationships: []
      }
      chat_threads: {
        Row: {
          id: string
          user_a: string
          user_b: string
          last_message: string | null
          last_at: string
          kind: string
          unread_a: number | null
          unread_b: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_a: string
          user_b: string
          last_message?: string | null
          last_at?: string
          kind?: string
          unread_a?: number | null
          unread_b?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_a?: string
          user_b?: string
          last_message?: string | null
          last_at?: string
          kind?: string
          unread_a?: number | null
          unread_b?: number | null
          created_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          id: string
          thread_id: string
          sender_id: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          thread_id: string
          sender_id: string
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          thread_id?: string
          sender_id?: string
          body?: string
          created_at?: string
        }
        Relationships: []
      }
      recent_connects: {
        Row: {
          id: string
          user_id: string
          other_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          other_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          other_id?: string
          created_at?: string
        }
        Relationships: []
      }
      moments: {
        Row: {
          id: string
          user_id: string
          caption: string | null
          media_url: string | null
          duration_sec: number | null
          views: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          caption?: string | null
          media_url?: string | null
          duration_sec?: number | null
          views?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          caption?: string | null
          media_url?: string | null
          duration_sec?: number | null
          views?: number | null
          created_at?: string
        }
        Relationships: []
      }
      card_swipes: {
        Row: {
          id: string
          user_id: string
          other_id: string
          action: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          other_id: string
          action: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          other_id?: string
          action?: string
          created_at?: string
        }
        Relationships: []
      }
      coin_transactions: {
        Row: {
          id: string
          user_id: string
          delta: number
          reason: string
          reference_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          delta: number
          reason: string
          reference_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          delta?: number
          reason?: string
          reference_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      gifts_sent: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          gift_id: string
          cost: number
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          gift_id: string
          cost: number
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          receiver_id?: string
          gift_id?: string
          cost?: number
          created_at?: string
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
      subscription_tier: "free" | "plus" | "vip"
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
      subscription_tier: ["free", "plus", "vip"],
    },
  },
} as const
