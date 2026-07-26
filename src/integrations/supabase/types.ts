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
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          hidden_by: Json
          id: string
          introduction_id: string
          last_message_at: string | null
          updated_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          hidden_by?: Json
          id?: string
          introduction_id: string
          last_message_at?: string | null
          updated_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          hidden_by?: Json
          id?: string
          introduction_id?: string
          last_message_at?: string | null
          updated_at?: string
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_introduction_id_fkey"
            columns: ["introduction_id"]
            isOneToOne: true
            referencedRelation: "introductions"
            referencedColumns: ["id"]
          },
        ]
      }
      introductions: {
        Row: {
          ai_opening: string | null
          created_at: string
          id: string
          match_id: string
          user_a: string
          user_b: string
        }
        Insert: {
          ai_opening?: string | null
          created_at?: string
          id?: string
          match_id: string
          user_a: string
          user_b: string
        }
        Update: {
          ai_opening?: string | null
          created_at?: string
          id?: string
          match_id?: string
          user_a?: string
          user_b?: string
        }
        Relationships: [
          {
            foreignKeyName: "introductions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          ai_context: string | null
          ai_why: Json
          compatibility_score: number | null
          created_at: string
          decided_by_a_at: string | null
          decided_by_b_at: string | null
          expires_at: string | null
          id: string
          status: Database["public"]["Enums"]["match_status"]
          updated_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          ai_context?: string | null
          ai_why?: Json
          compatibility_score?: number | null
          created_at?: string
          decided_by_a_at?: string | null
          decided_by_b_at?: string | null
          expires_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          ai_context?: string | null
          ai_why?: Json
          compatibility_score?: number | null
          created_at?: string
          decided_by_a_at?: string | null
          decided_by_b_at?: string | null
          expires_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          flagged_severity:
            | Database["public"]["Enums"]["safety_severity"]
            | null
          id: string
          kind: Database["public"]["Enums"]["message_kind"]
          metadata: Json
          read_at: string | null
          sender_id: string | null
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          flagged_severity?:
            | Database["public"]["Enums"]["safety_severity"]
            | null
          id?: string
          kind?: Database["public"]["Enums"]["message_kind"]
          metadata?: Json
          read_at?: string | null
          sender_id?: string | null
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          flagged_severity?:
            | Database["public"]["Enums"]["safety_severity"]
            | null
          id?: string
          kind?: Database["public"]["Enums"]["message_kind"]
          metadata?: Json
          read_at?: string | null
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          birth_date: string | null
          city: string | null
          country: string | null
          created_at: string
          display_name: string | null
          gender: string | null
          id: string
          is_paused: boolean
          location_lat: number | null
          location_lng: number | null
          onboarding_completed_at: string | null
          onboarding_stage: Database["public"]["Enums"]["onboarding_stage"]
          pronouns: string | null
          region: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          id: string
          is_paused?: boolean
          location_lat?: number | null
          location_lng?: number | null
          onboarding_completed_at?: string | null
          onboarding_stage?: Database["public"]["Enums"]["onboarding_stage"]
          pronouns?: string | null
          region?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          birth_date?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          id?: string
          is_paused?: boolean
          location_lat?: number | null
          location_lng?: number | null
          onboarding_completed_at?: string | null
          onboarding_stage?: Database["public"]["Enums"]["onboarding_stage"]
          pronouns?: string | null
          region?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reflections: {
        Row: {
          ai_summary: string | null
          connection_rating: number | null
          conversation_id: string | null
          created_at: string
          id: string
          met_in_person: boolean | null
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_summary?: string | null
          connection_rating?: number | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          met_in_person?: boolean | null
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_summary?: string | null
          connection_rating?: number | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          met_in_person?: boolean | null
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reflections_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          category: string
          conversation_id: string | null
          created_at: string
          details: string | null
          id: string
          reported_id: string
          reporter_id: string
          severity: Database["public"]["Enums"]["safety_severity"]
        }
        Insert: {
          category: string
          conversation_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reported_id: string
          reporter_id: string
          severity?: Database["public"]["Enums"]["safety_severity"]
        }
        Update: {
          category?: string
          conversation_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reported_id?: string
          reporter_id?: string
          severity?: Database["public"]["Enums"]["safety_severity"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_flags: {
        Row: {
          category: string
          created_at: string
          detail: Json
          id: string
          message_id: string | null
          severity: Database["public"]["Enums"]["safety_severity"]
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          detail?: Json
          id?: string
          message_id?: string | null
          severity: Database["public"]["Enums"]["safety_severity"]
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          detail?: Json
          id?: string
          message_id?: string | null
          severity?: Database["public"]["Enums"]["safety_severity"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_flags_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      user_intelligence: {
        Row: {
          ai_insights: Json
          attachment_style: string | null
          communication_style: string | null
          conflict_style: string | null
          core_values: Json
          created_at: string
          daily_lifestyle: string | null
          emotional_patterns: string | null
          ideal_week: string | null
          last_interview_at: string | null
          life_direction: string | null
          meaning_of_relationship: string | null
          partnership_vision: string | null
          readiness_summary: string | null
          self_understanding: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_insights?: Json
          attachment_style?: string | null
          communication_style?: string | null
          conflict_style?: string | null
          core_values?: Json
          created_at?: string
          daily_lifestyle?: string | null
          emotional_patterns?: string | null
          ideal_week?: string | null
          last_interview_at?: string | null
          life_direction?: string | null
          meaning_of_relationship?: string | null
          partnership_vision?: string | null
          readiness_summary?: string | null
          self_understanding?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_insights?: Json
          attachment_style?: string | null
          communication_style?: string | null
          conflict_style?: string | null
          core_values?: Json
          created_at?: string
          daily_lifestyle?: string | null
          emotional_patterns?: string | null
          ideal_week?: string | null
          last_interview_at?: string | null
          life_direction?: string | null
          meaning_of_relationship?: string | null
          partnership_vision?: string | null
          readiness_summary?: string | null
          self_understanding?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_photos: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          moderation: Database["public"]["Enums"]["moderation_status"]
          position: number
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          moderation?: Database["public"]["Enums"]["moderation_status"]
          position?: number
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          moderation?: Database["public"]["Enums"]["moderation_status"]
          position?: number
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          age_max: number | null
          age_min: number | null
          created_at: string
          deal_breakers: Json
          important_values: Json
          lifestyle_notes: string | null
          max_distance_km: number | null
          relationship_intent: string | null
          seeking_genders: string[]
          updated_at: string
          user_id: string
          wants_children: string | null
        }
        Insert: {
          age_max?: number | null
          age_min?: number | null
          created_at?: string
          deal_breakers?: Json
          important_values?: Json
          lifestyle_notes?: string | null
          max_distance_km?: number | null
          relationship_intent?: string | null
          seeking_genders?: string[]
          updated_at?: string
          user_id: string
          wants_children?: string | null
        }
        Update: {
          age_max?: number | null
          age_min?: number | null
          created_at?: string
          deal_breakers?: Json
          important_values?: Json
          lifestyle_notes?: string | null
          max_distance_km?: number | null
          relationship_intent?: string | null
          seeking_genders?: string[]
          updated_at?: string
          user_id?: string
          wants_children?: string | null
        }
        Relationships: []
      }
      user_prompts: {
        Row: {
          answer: string
          created_at: string
          id: string
          position: number
          prompt_key: string
          prompt_text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          position?: number
          prompt_key: string
          prompt_text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          position?: number
          prompt_key?: string
          prompt_text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_readiness: {
        Row: {
          clarity_of_want: number | null
          created_at: string
          emotional_availability: number | null
          healing_notes: string | null
          overall_score: number | null
          ready_reflection: string | null
          time_availability: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          clarity_of_want?: number | null
          created_at?: string
          emotional_availability?: number | null
          healing_notes?: string | null
          overall_score?: number | null
          ready_reflection?: string | null
          time_availability?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          clarity_of_want?: number | null
          created_at?: string
          emotional_availability?: number | null
          healing_notes?: string | null
          overall_score?: number | null
          ready_reflection?: string | null
          time_availability?: number | null
          updated_at?: string
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
      match_status:
        | "proposed"
        | "accepted_by_a"
        | "accepted_by_b"
        | "mutual"
        | "declined"
        | "expired"
      message_kind: "text" | "system" | "date_proposal" | "safety_notice"
      moderation_status: "pending" | "approved" | "rejected"
      onboarding_stage:
        | "welcome"
        | "identity"
        | "intelligence"
        | "preferences"
        | "readiness"
        | "prompts"
        | "photos"
        | "complete"
      safety_severity: "low" | "medium" | "high" | "critical"
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
      match_status: [
        "proposed",
        "accepted_by_a",
        "accepted_by_b",
        "mutual",
        "declined",
        "expired",
      ],
      message_kind: ["text", "system", "date_proposal", "safety_notice"],
      moderation_status: ["pending", "approved", "rejected"],
      onboarding_stage: [
        "welcome",
        "identity",
        "intelligence",
        "preferences",
        "readiness",
        "prompts",
        "photos",
        "complete",
      ],
      safety_severity: ["low", "medium", "high", "critical"],
    },
  },
} as const
