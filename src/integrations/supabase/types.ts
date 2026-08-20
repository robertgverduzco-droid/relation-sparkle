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
      admin_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string
          created_at: string
          data_class: number
          id: string
          metadata: Json
          purpose: string | null
          resource: string | null
          subject_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string
          created_at?: string
          data_class?: number
          id?: string
          metadata?: Json
          purpose?: string | null
          resource?: string | null
          subject_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string
          created_at?: string
          data_class?: number
          id?: string
          metadata?: Json
          purpose?: string | null
          resource?: string | null
          subject_id?: string | null
        }
        Relationships: []
      }
      athena_outcome_signals: {
        Row: {
          created_at: string
          dedupe_key: string
          id: string
          is_contradictory: boolean
          learning_version: string
          occurred_at: string
          pair_token: string
          reason_category: string | null
          signal_kind: string
          strength: string
          valence: string
        }
        Insert: {
          created_at?: string
          dedupe_key?: string
          id?: string
          is_contradictory?: boolean
          learning_version?: string
          occurred_at?: string
          pair_token: string
          reason_category?: string | null
          signal_kind: string
          strength: string
          valence: string
        }
        Update: {
          created_at?: string
          dedupe_key?: string
          id?: string
          is_contradictory?: boolean
          learning_version?: string
          occurred_at?: string
          pair_token?: string
          reason_category?: string | null
          signal_kind?: string
          strength?: string
          valence?: string
        }
        Relationships: []
      }
      athena_self_evaluations: {
        Row: {
          constitution_version: string
          created_at: string
          dimensions: Json
          duration_seconds: number | null
          id: string
          model: string | null
          next_conversation_intents: string[]
          overall_note: string | null
          prompt_version: string
          self_confidence: number
          session_key: string
          turn_count: number
          user_id: string
        }
        Insert: {
          constitution_version?: string
          created_at?: string
          dimensions?: Json
          duration_seconds?: number | null
          id?: string
          model?: string | null
          next_conversation_intents?: string[]
          overall_note?: string | null
          prompt_version?: string
          self_confidence?: number
          session_key: string
          turn_count?: number
          user_id: string
        }
        Update: {
          constitution_version?: string
          created_at?: string
          dimensions?: Json
          duration_seconds?: number | null
          id?: string
          model?: string | null
          next_conversation_intents?: string[]
          overall_note?: string | null
          prompt_version?: string
          self_confidence?: number
          session_key?: string
          turn_count?: number
          user_id?: string
        }
        Relationships: []
      }
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
      banned_identifiers: {
        Row: {
          action_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          identifier_hash: string
          identifier_kind: string
          reason_category: string
        }
        Insert: {
          action_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          identifier_hash: string
          identifier_kind: string
          reason_category: string
        }
        Update: {
          action_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          identifier_hash?: string
          identifier_kind?: string
          reason_category?: string
        }
        Relationships: [
          {
            foreignKeyName: "banned_identifiers_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "enforcement_actions"
            referencedColumns: ["id"]
          },
        ]
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
          last_message_at: string | null
          updated_at: string
          user_a: string
          user_b: string
        }
        Insert: {
          created_at?: string
          hidden_by?: Json
          id?: string
          last_message_at?: string | null
          updated_at?: string
          user_a: string
          user_b: string
        }
        Update: {
          created_at?: string
          hidden_by?: Json
          id?: string
          last_message_at?: string | null
          updated_at?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      data_export_requests: {
        Row: {
          allowlist_version: string
          byte_size: number | null
          created_at: string
          id: string
          section_counts: Json
          status: string
          user_id: string
        }
        Insert: {
          allowlist_version: string
          byte_size?: number | null
          created_at?: string
          id?: string
          section_counts?: Json
          status?: string
          user_id: string
        }
        Update: {
          allowlist_version?: string
          byte_size?: number | null
          created_at?: string
          id?: string
          section_counts?: Json
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      enforcement_actions: {
        Row: {
          action: string
          appeal_status: string
          behavior_note: string
          conduct_category: string
          created_at: string
          evidence_basis: string
          id: string
          immediate_path: boolean
          initiated_by: string | null
          initiated_by_system: string | null
          level: number
          prior_action_count: number
          report_id: string | null
          restriction_until: string | null
          review_status: string
          severity: Database["public"]["Enums"]["safety_severity"]
          updated_at: string
          user_id: string
        }
        Insert: {
          action: string
          appeal_status?: string
          behavior_note: string
          conduct_category: string
          created_at?: string
          evidence_basis: string
          id?: string
          immediate_path?: boolean
          initiated_by?: string | null
          initiated_by_system?: string | null
          level: number
          prior_action_count?: number
          report_id?: string | null
          restriction_until?: string | null
          review_status?: string
          severity: Database["public"]["Enums"]["safety_severity"]
          updated_at?: string
          user_id: string
        }
        Update: {
          action?: string
          appeal_status?: string
          behavior_note?: string
          conduct_category?: string
          created_at?: string
          evidence_basis?: string
          id?: string
          immediate_path?: boolean
          initiated_by?: string | null
          initiated_by_system?: string | null
          level?: number
          prior_action_count?: number
          report_id?: string | null
          restriction_until?: string | null
          review_status?: string
          severity?: Database["public"]["Enums"]["safety_severity"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enforcement_actions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      enforcement_appeals: {
        Row: {
          action_id: string
          created_at: string
          id: string
          reviewed_at: string | null
          reviewer_id: string | null
          reviewer_note: string | null
          statement: string
          status: string
          user_id: string
        }
        Insert: {
          action_id: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_note?: string | null
          statement: string
          status?: string
          user_id: string
        }
        Update: {
          action_id?: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          reviewer_id?: string | null
          reviewer_note?: string | null
          statement?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enforcement_appeals_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "enforcement_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      entitlement_events: {
        Row: {
          actor: string
          created_at: string
          detail: Json
          environment: string
          event: string
          from_status: string | null
          id: string
          plan_key: string | null
          product_id: string | null
          provider: string
          to_status: string
          user_id: string
        }
        Insert: {
          actor: string
          created_at?: string
          detail?: Json
          environment: string
          event: string
          from_status?: string | null
          id?: string
          plan_key?: string | null
          product_id?: string | null
          provider: string
          to_status: string
          user_id: string
        }
        Update: {
          actor?: string
          created_at?: string
          detail?: Json
          environment?: string
          event?: string
          from_status?: string | null
          id?: string
          plan_key?: string | null
          product_id?: string | null
          provider?: string
          to_status?: string
          user_id?: string
        }
        Relationships: []
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
      founder_dialogue_messages: {
        Row: {
          blocked: boolean
          content: string
          created_at: string
          founder_id: string
          id: string
          role: string
        }
        Insert: {
          blocked?: boolean
          content: string
          created_at?: string
          founder_id: string
          id?: string
          role: string
        }
        Update: {
          blocked?: boolean
          content?: string
          created_at?: string
          founder_id?: string
          id?: string
          role?: string
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
      introduction_attraction: {
        Row: {
          created_at: string
          id: string
          pair_id: string
          response: Database["public"]["Enums"]["attraction_response"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pair_id: string
          response: Database["public"]["Enums"]["attraction_response"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pair_id?: string
          response?: Database["public"]["Enums"]["attraction_response"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "introduction_attraction_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: false
            referencedRelation: "pair_reasoning"
            referencedColumns: ["id"]
          },
        ]
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
      member_consents: {
        Row: {
          consent_key: string
          created_at: string
          granted: boolean
          id: string
          source: string | null
          user_id: string
          version: string
        }
        Insert: {
          consent_key: string
          created_at?: string
          granted?: boolean
          id?: string
          source?: string | null
          user_id: string
          version: string
        }
        Update: {
          consent_key?: string
          created_at?: string
          granted?: boolean
          id?: string
          source?: string | null
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      member_readiness: {
        Row: {
          created_at: string
          hold_kind: string | null
          hold_until: string | null
          last_evaluated_at: string
          last_trigger: string | null
          reason_code: string | null
          reason_text: string | null
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hold_kind?: string | null
          hold_until?: string | null
          last_evaluated_at?: string
          last_trigger?: string | null
          reason_code?: string | null
          reason_text?: string | null
          state?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          hold_kind?: string | null
          hold_until?: string | null
          last_evaluated_at?: string
          last_trigger?: string | null
          reason_code?: string | null
          reason_text?: string | null
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      member_transitions: {
        Row: {
          choice: string | null
          chosen_at: string | null
          connection_id: string | null
          created_at: string
          hold_until: string | null
          id: string
          resolved_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          choice?: string | null
          chosen_at?: string | null
          connection_id?: string | null
          created_at?: string
          hold_until?: string | null
          id?: string
          resolved_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          choice?: string | null
          chosen_at?: string | null
          connection_id?: string | null
          created_at?: string
          hold_until?: string | null
          id?: string
          resolved_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_transitions_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "connections"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_entitlements: {
        Row: {
          billing_period: string | null
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          environment: string
          grace_until: string | null
          grant_reason: string | null
          granted_by: string | null
          last_verified_at: string | null
          original_transaction_id: string | null
          plan_key: string | null
          product_id: string | null
          provider: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_period?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          environment?: string
          grace_until?: string | null
          grant_reason?: string | null
          granted_by?: string | null
          last_verified_at?: string | null
          original_transaction_id?: string | null
          plan_key?: string | null
          product_id?: string | null
          provider?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_period?: string | null
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          environment?: string
          grace_until?: string | null
          grant_reason?: string | null
          granted_by?: string | null
          last_verified_at?: string | null
          original_transaction_id?: string | null
          plan_key?: string | null
          product_id?: string | null
          provider?: string
          status?: string
          updated_at?: string
          user_id?: string
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
      notification_preferences: {
        Row: {
          athena: boolean
          created_at: string
          email_enabled: boolean
          introductions: boolean
          messages: boolean
          product_updates: boolean
          reflection: boolean
          relationship: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          athena?: boolean
          created_at?: string
          email_enabled?: boolean
          introductions?: boolean
          messages?: boolean
          product_updates?: boolean
          reflection?: boolean
          relationship?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          athena?: boolean
          created_at?: string
          email_enabled?: boolean
          introductions?: boolean
          messages?: boolean
          product_updates?: boolean
          reflection?: boolean
          relationship?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_path: string | null
          body: string | null
          category: string
          channel: string
          created_at: string
          dedupe_key: string
          delivery_status: string
          event_type: string
          expires_at: string | null
          id: string
          obsolete_at: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_path?: string | null
          body?: string | null
          category: string
          channel?: string
          created_at?: string
          dedupe_key: string
          delivery_status?: string
          event_type: string
          expires_at?: string | null
          id?: string
          obsolete_at?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_path?: string | null
          body?: string | null
          category?: string
          channel?: string
          created_at?: string
          dedupe_key?: string
          delivery_status?: string
          event_type?: string
          expires_at?: string | null
          id?: string
          obsolete_at?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      ops_alerts: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          dedupe_key: string
          external_delivery: string
          id: string
          level: string
          metric_key: string
          resolved_at: string | null
          summary: string
          threshold: number | null
          value: number | null
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          dedupe_key: string
          external_delivery?: string
          id?: string
          level: string
          metric_key: string
          resolved_at?: string | null
          summary: string
          threshold?: number | null
          value?: number | null
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          dedupe_key?: string
          external_delivery?: string
          id?: string
          level?: string
          metric_key?: string
          resolved_at?: string | null
          summary?: string
          threshold?: number | null
          value?: number | null
        }
        Relationships: []
      }
      ops_snapshots: {
        Row: {
          created_at: string
          id: string
          metrics: Json
          worst_level: string
        }
        Insert: {
          created_at?: string
          id?: string
          metrics?: Json
          worst_level?: string
        }
        Update: {
          created_at?: string
          id?: string
          metrics?: Json
          worst_level?: string
        }
        Relationships: []
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
          learning_opt_out: boolean
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
          learning_opt_out?: boolean
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
          learning_opt_out?: boolean
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
      purge_tombstones: {
        Row: {
          created_at: string
          deleted_at: string
          id: string
          last_replayed_at: string | null
          reason: string
          subject_hash: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string
          id?: string
          last_replayed_at?: string | null
          reason?: string
          subject_hash: string
        }
        Update: {
          created_at?: string
          deleted_at?: string
          id?: string
          last_replayed_at?: string | null
          reason?: string
          subject_hash?: string
        }
        Relationships: []
      }
      rate_limit_counters: {
        Row: {
          bucket_key: string
          count: number
          created_at: string
          id: string
          reset_at: string
          updated_at: string
        }
        Insert: {
          bucket_key: string
          count?: number
          created_at?: string
          id?: string
          reset_at: string
          updated_at?: string
        }
        Update: {
          bucket_key?: string
          count?: number
          created_at?: string
          id?: string
          reset_at?: string
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
      relationship_focus: {
        Row: {
          connection_id: string
          created_at: string
          ended_at: string | null
          ended_reason: string | null
          high_opted_in_at: string | null
          id: string
          last_checkin_at: string | null
          low_opted_in_at: string | null
          started_at: string | null
          updated_at: string
          user_high: string
          user_low: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          ended_at?: string | null
          ended_reason?: string | null
          high_opted_in_at?: string | null
          id?: string
          last_checkin_at?: string | null
          low_opted_in_at?: string | null
          started_at?: string | null
          updated_at?: string
          user_high: string
          user_low: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          ended_at?: string | null
          ended_reason?: string | null
          high_opted_in_at?: string | null
          id?: string
          last_checkin_at?: string | null
          low_opted_in_at?: string | null
          started_at?: string | null
          updated_at?: string
          user_high?: string
          user_low?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationship_focus_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: true
            referencedRelation: "connections"
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
      restore_reconciliations: {
        Row: {
          created_at: string
          duration_ms: number | null
          id: string
          notes: string | null
          rows_removed: Json
          subjects_repurged: number
          tombstones_checked: number
          trigger: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          id?: string
          notes?: string | null
          rows_removed?: Json
          subjects_repurged?: number
          tombstones_checked?: number
          trigger: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          id?: string
          notes?: string | null
          rows_removed?: Json
          subjects_repurged?: number
          tombstones_checked?: number
          trigger?: string
        }
        Relationships: []
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
      security_kill_switches: {
        Row: {
          enabled: boolean
          key: string
          note: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          enabled?: boolean
          key: string
          note?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          enabled?: boolean
          key?: string
          note?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      step_up_grants: {
        Row: {
          consumed_at: string | null
          expires_at: string
          granted_at: string
          id: string
          purpose: string
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          expires_at: string
          granted_at?: string
          id?: string
          purpose: string
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          expires_at?: string
          granted_at?: string
          id?: string
          purpose?: string
          user_id?: string
        }
        Relationships: []
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
          basis: string | null
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
          basis?: string | null
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
          basis?: string | null
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
      understanding_revisions: {
        Row: {
          created_at: string
          facet_key: string
          id: string
          member_statement: string | null
          previous_confidence: number | null
          previous_understanding: string | null
          revision_kind: string
          user_id: string
        }
        Insert: {
          created_at?: string
          facet_key: string
          id?: string
          member_statement?: string | null
          previous_confidence?: number | null
          previous_understanding?: string | null
          revision_kind: string
          user_id: string
        }
        Update: {
          created_at?: string
          facet_key?: string
          id?: string
          member_statement?: string | null
          previous_confidence?: number | null
          previous_understanding?: string | null
          revision_kind?: string
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
          alt_text: string | null
          created_at: string
          id: string
          is_primary: boolean
          moderation: Database["public"]["Enums"]["moderation_status"]
          position: number
          storage_path: string
          user_id: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          moderation?: Database["public"]["Enums"]["moderation_status"]
          position?: number
          storage_path: string
          user_id: string
        }
        Update: {
          alt_text?: string | null
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
      consume_rate_limit: {
        Args: { _key: string; _limit: number; _window_ms: number }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      ops_db_stats: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "founder"
      attraction_response: "drawn" | "curious" | "unsure" | "not_there"
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
      app_role: ["admin", "moderator", "user", "founder"],
      attraction_response: ["drawn", "curious", "unsure", "not_there"],
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
