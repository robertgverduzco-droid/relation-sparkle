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
      athena_usage_log: {
        Row: {
          billed_at: string | null
          created_at: string
          id: string
          input_tokens: number | null
          kind: string
          metadata: Json
          model: string | null
          output_tokens: number | null
          seconds: number | null
          user_id: string
        }
        Insert: {
          billed_at?: string | null
          created_at?: string
          id?: string
          input_tokens?: number | null
          kind: string
          metadata?: Json
          model?: string | null
          output_tokens?: number | null
          seconds?: number | null
          user_id: string
        }
        Update: {
          billed_at?: string | null
          created_at?: string
          id?: string
          input_tokens?: number | null
          kind?: string
          metadata?: Json
          model?: string | null
          output_tokens?: number | null
          seconds?: number | null
          user_id?: string
        }
        Relationships: []
      }
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
      connections: {
        Row: {
          close_reason: string | null
          closed_at: string | null
          created_at: string
          id: string
          opened_at: string
          pair_id: string
          status: string
          updated_at: string
          user_high: string
          user_low: string
        }
        Insert: {
          close_reason?: string | null
          closed_at?: string | null
          created_at?: string
          id?: string
          opened_at?: string
          pair_id: string
          status?: string
          updated_at?: string
          user_high: string
          user_low: string
        }
        Update: {
          close_reason?: string | null
          closed_at?: string | null
          created_at?: string
          id?: string
          opened_at?: string
          pair_id?: string
          status?: string
          updated_at?: string
          user_high?: string
          user_low?: string
        }
        Relationships: [
          {
            foreignKeyName: "connections_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: true
            referencedRelation: "pair_reasoning"
            referencedColumns: ["id"]
          },
        ]
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
      facet_history: {
        Row: {
          confidence: number
          evidence: Json
          facet_key: string
          id: string
          reasoning: string | null
          refined_at: string
          understanding: string | null
          user_id: string
        }
        Insert: {
          confidence?: number
          evidence?: Json
          facet_key: string
          id?: string
          reasoning?: string | null
          refined_at?: string
          understanding?: string | null
          user_id: string
        }
        Update: {
          confidence?: number
          evidence?: Json
          facet_key?: string
          id?: string
          reasoning?: string | null
          refined_at?: string
          understanding?: string | null
          user_id?: string
        }
        Relationships: []
      }
      interview_sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          messages: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          messages?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          messages?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      interview_shares: {
        Row: {
          created_at: string
          expires_at: string | null
          expiry_notified_at: string | null
          id: string
          revoked_at: string | null
          revoked_by: string | null
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          expiry_notified_at?: string | null
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          token?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          expiry_notified_at?: string | null
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      introduction_feedback: {
        Row: {
          created_at: string
          id: string
          kind: string
          pair_id: string
          perspective: string | null
          signals: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          pair_id: string
          perspective?: string | null
          signals?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          pair_id?: string
          perspective?: string | null
          signals?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "introduction_feedback_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: false
            referencedRelation: "pair_reasoning"
            referencedColumns: ["id"]
          },
        ]
      }
      introduction_responses: {
        Row: {
          created_at: string
          id: string
          note: string | null
          pair_id: string
          response: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          pair_id: string
          response: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          pair_id?: string
          response?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "introduction_responses_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: false
            referencedRelation: "pair_reasoning"
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
      meeting_proposals: {
        Row: {
          completed_at: string | null
          confirmed_at: string | null
          connection_id: string
          created_at: string
          id: string
          notes: string | null
          proposed_by: string
          scheduled_for: string | null
          status: string
          updated_at: string
          when_text: string | null
          where_text: string | null
        }
        Insert: {
          completed_at?: string | null
          confirmed_at?: string | null
          connection_id: string
          created_at?: string
          id?: string
          notes?: string | null
          proposed_by: string
          scheduled_for?: string | null
          status?: string
          updated_at?: string
          when_text?: string | null
          where_text?: string | null
        }
        Update: {
          completed_at?: string | null
          confirmed_at?: string | null
          connection_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          proposed_by?: string
          scheduled_for?: string | null
          status?: string
          updated_at?: string
          when_text?: string | null
          where_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_proposals_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
        ]
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
      pair_reasoning: {
        Row: {
          alignments: Json
          complementary: Json
          confidence: number
          created_at: string
          frictions: Json
          hard_conflicts: Json
          id: string
          is_stale: boolean
          last_reasoned_at: string
          presentation_a: string | null
          presentation_b: string | null
          presented_to_a_at: string | null
          presented_to_b_at: string | null
          reasoning: string | null
          stale_reason: string | null
          status: string
          updated_at: string
          user_high: string
          user_low: string
        }
        Insert: {
          alignments?: Json
          complementary?: Json
          confidence?: number
          created_at?: string
          frictions?: Json
          hard_conflicts?: Json
          id?: string
          is_stale?: boolean
          last_reasoned_at?: string
          presentation_a?: string | null
          presentation_b?: string | null
          presented_to_a_at?: string | null
          presented_to_b_at?: string | null
          reasoning?: string | null
          stale_reason?: string | null
          status?: string
          updated_at?: string
          user_high: string
          user_low: string
        }
        Update: {
          alignments?: Json
          complementary?: Json
          confidence?: number
          created_at?: string
          frictions?: Json
          hard_conflicts?: Json
          id?: string
          is_stale?: boolean
          last_reasoned_at?: string
          presentation_a?: string | null
          presentation_b?: string | null
          presented_to_a_at?: string | null
          presented_to_b_at?: string | null
          reasoning?: string | null
          stale_reason?: string | null
          status?: string
          updated_at?: string
          user_high?: string
          user_low?: string
        }
        Relationships: []
      }
      pair_reasoning_history: {
        Row: {
          confidence: number
          id: string
          pair_id: string
          reasoned_at: string
          reasoning: string | null
          snapshot: Json
          status: string
          user_high: string
          user_low: string
        }
        Insert: {
          confidence: number
          id?: string
          pair_id: string
          reasoned_at?: string
          reasoning?: string | null
          snapshot?: Json
          status: string
          user_high: string
          user_low: string
        }
        Update: {
          confidence?: number
          id?: string
          pair_id?: string
          reasoned_at?: string
          reasoning?: string | null
          snapshot?: Json
          status?: string
          user_high?: string
          user_low?: string
        }
        Relationships: [
          {
            foreignKeyName: "pair_reasoning_history_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: false
            referencedRelation: "pair_reasoning"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_perception: {
        Row: {
          author_id: string
          chemistry: number | null
          concerns: string | null
          connection_id: string
          created_at: string
          honesty: number | null
          id: string
          notes: string | null
          safety: number | null
          subject_id: string
          surprised_by: string | null
          updated_at: string
          warmth: number | null
          would_meet_again: boolean | null
        }
        Insert: {
          author_id: string
          chemistry?: number | null
          concerns?: string | null
          connection_id: string
          created_at?: string
          honesty?: number | null
          id?: string
          notes?: string | null
          safety?: number | null
          subject_id: string
          surprised_by?: string | null
          updated_at?: string
          warmth?: number | null
          would_meet_again?: boolean | null
        }
        Update: {
          author_id?: string
          chemistry?: number | null
          concerns?: string | null
          connection_id?: string
          created_at?: string
          honesty?: number | null
          id?: string
          notes?: string | null
          safety?: number | null
          subject_id?: string
          surprised_by?: string | null
          updated_at?: string
          warmth?: number | null
          would_meet_again?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_perception_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
        ]
      }
      post_meeting_reflections: {
        Row: {
          anything_else: string | null
          athena_acknowledgement: string | null
          connection_id: string
          continue_decision: string | null
          created_at: string
          decision_reason: string | null
          feeling_other: string | null
          feeling_tags: string[]
          greatest_difference: string | null
          id: string
          last_checkin_at: string | null
          most_genuine: string | null
          refined_at: string | null
          reflection_required: boolean
          required_since: string | null
          self_understanding: string | null
          sentiment: string | null
          submitted_at: string | null
          summary: string | null
          transcript: Json
          updated_at: string
          user_id: string
          would_meet_again: boolean | null
        }
        Insert: {
          anything_else?: string | null
          athena_acknowledgement?: string | null
          connection_id: string
          continue_decision?: string | null
          created_at?: string
          decision_reason?: string | null
          feeling_other?: string | null
          feeling_tags?: string[]
          greatest_difference?: string | null
          id?: string
          last_checkin_at?: string | null
          most_genuine?: string | null
          refined_at?: string | null
          reflection_required?: boolean
          required_since?: string | null
          self_understanding?: string | null
          sentiment?: string | null
          submitted_at?: string | null
          summary?: string | null
          transcript?: Json
          updated_at?: string
          user_id: string
          would_meet_again?: boolean | null
        }
        Update: {
          anything_else?: string | null
          athena_acknowledgement?: string | null
          connection_id?: string
          continue_decision?: string | null
          created_at?: string
          decision_reason?: string | null
          feeling_other?: string | null
          feeling_tags?: string[]
          greatest_difference?: string | null
          id?: string
          last_checkin_at?: string | null
          most_genuine?: string | null
          refined_at?: string | null
          reflection_required?: boolean
          required_since?: string | null
          self_understanding?: string | null
          sentiment?: string | null
          submitted_at?: string | null
          summary?: string | null
          transcript?: Json
          updated_at?: string
          user_id?: string
          would_meet_again?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "post_meeting_reflections_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
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
      reflection_submissions: {
        Row: {
          anything_else: string | null
          athena_acknowledgement: string | null
          connection_id: string
          continue_decision: string | null
          created_at: string
          decision_reason: string | null
          feeling_other: string | null
          feeling_tags: string[]
          greatest_difference: string | null
          id: string
          most_genuine: string | null
          self_understanding: string | null
          sequence: number
          submitted_at: string
          user_id: string
        }
        Insert: {
          anything_else?: string | null
          athena_acknowledgement?: string | null
          connection_id: string
          continue_decision?: string | null
          created_at?: string
          decision_reason?: string | null
          feeling_other?: string | null
          feeling_tags?: string[]
          greatest_difference?: string | null
          id?: string
          most_genuine?: string | null
          self_understanding?: string | null
          sequence?: number
          submitted_at?: string
          user_id: string
        }
        Update: {
          anything_else?: string | null
          athena_acknowledgement?: string | null
          connection_id?: string
          continue_decision?: string | null
          created_at?: string
          decision_reason?: string | null
          feeling_other?: string | null
          feeling_tags?: string[]
          greatest_difference?: string | null
          id?: string
          most_genuine?: string | null
          self_understanding?: string | null
          sequence?: number
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reflection_submissions_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
        ]
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
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["safety_severity"]
          status: string
        }
        Insert: {
          category: string
          conversation_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reported_id: string
          reporter_id: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["safety_severity"]
          status?: string
        }
        Update: {
          category?: string
          conversation_id?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reported_id?: string
          reporter_id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["safety_severity"]
          status?: string
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
      topic_map: {
        Row: {
          clarification_note: string | null
          confidence: number
          conversation_count: number
          created_at: string
          first_discussed_at: string | null
          id: string
          importance: number
          last_discussed_at: string | null
          needs_clarification: boolean
          observations: Json
          open_questions: string[]
          question_count: number
          related_topics: string[]
          status: string
          topic_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clarification_note?: string | null
          confidence?: number
          conversation_count?: number
          created_at?: string
          first_discussed_at?: string | null
          id?: string
          importance?: number
          last_discussed_at?: string | null
          needs_clarification?: boolean
          observations?: Json
          open_questions?: string[]
          question_count?: number
          related_topics?: string[]
          status?: string
          topic_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clarification_note?: string | null
          confidence?: number
          conversation_count?: number
          created_at?: string
          first_discussed_at?: string | null
          id?: string
          importance?: number
          last_discussed_at?: string | null
          needs_clarification?: boolean
          observations?: Json
          open_questions?: string[]
          question_count?: number
          related_topics?: string[]
          status?: string
          topic_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      understanding_facets: {
        Row: {
          clarification_note: string | null
          confidence: number
          created_at: string
          evidence: Json
          facet_key: string
          id: string
          needs_clarification: boolean
          reasoning: string | null
          refined_at: string
          understanding: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          clarification_note?: string | null
          confidence?: number
          created_at?: string
          evidence?: Json
          facet_key: string
          id?: string
          needs_clarification?: boolean
          reasoning?: string | null
          refined_at?: string
          understanding?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          clarification_note?: string | null
          confidence?: number
          created_at?: string
          evidence?: Json
          facet_key?: string
          id?: string
          needs_clarification?: boolean
          reasoning?: string | null
          refined_at?: string
          understanding?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          interview_target_turns: number
          last_interview_at: string | null
          last_matchmaking_at: string | null
          life_direction: string | null
          meaning_of_relationship: string | null
          partnership_vision: string | null
          profile_approved_at: string | null
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
          interview_target_turns?: number
          last_interview_at?: string | null
          last_matchmaking_at?: string | null
          life_direction?: string | null
          meaning_of_relationship?: string | null
          partnership_vision?: string | null
          profile_approved_at?: string | null
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
          interview_target_turns?: number
          last_interview_at?: string | null
          last_matchmaking_at?: string | null
          life_direction?: string | null
          meaning_of_relationship?: string | null
          partnership_vision?: string | null
          profile_approved_at?: string | null
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
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
