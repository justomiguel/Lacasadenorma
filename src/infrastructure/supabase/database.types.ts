/**
 * Generado por scripts/gen-types.mjs a partir de las migraciones. No editar a
 * mano: `npm run db:types` lo reescribe, y CI verifica que coincida con el
 * esquema (`npm run db:verify`).
 */

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
    PostgrestVersion: "13"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          diff: Json | null
          entity_id: string | null
          entity_table: string
          id: number
          occurred_at: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          diff?: Json | null
          entity_id?: string | null
          entity_table: string
          id?: never
          occurred_at?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          diff?: Json | null
          entity_id?: string | null
          entity_table?: string
          id?: never
          occurred_at?: string
        }
        Relationships: []
      }
      budget_items: {
        Row: {
          campaign_id: string
          created_at: string
          currency: string
          description: string | null
          estimated_amount_minor: number | null
          id: string
          published_at: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          currency?: string
          description?: string | null
          estimated_amount_minor?: number | null
          id?: string
          published_at?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          estimated_amount_minor?: number | null
          id?: string
          published_at?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_items_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_totals"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "budget_items_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          goal_amount_minor: number | null
          goal_currency: string
          id: string
          published_at: string | null
          reconciled_at: string | null
          slug: string
          status: Database["public"]["Enums"]["campaign_status"]
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          goal_amount_minor?: number | null
          goal_currency?: string
          id?: string
          published_at?: string | null
          reconciled_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["campaign_status"]
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          goal_amount_minor?: number | null
          goal_currency?: string
          id?: string
          published_at?: string | null
          reconciled_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["campaign_status"]
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      contributions: {
        Row: {
          amount_minor: number
          campaign_id: string
          contributor_display_name: string | null
          created_at: string
          currency: string
          id: string
          is_anonymous: boolean
          payment_method_id: string | null
          received_at: string
          recorded_by: string | null
          source_note: string | null
          updated_at: string
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          amount_minor: number
          campaign_id: string
          contributor_display_name?: string | null
          created_at?: string
          currency: string
          id?: string
          is_anonymous?: boolean
          payment_method_id?: string | null
          received_at: string
          recorded_by?: string | null
          source_note?: string | null
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          amount_minor?: number
          campaign_id?: string
          contributor_display_name?: string | null
          created_at?: string
          currency?: string
          id?: string
          is_anonymous?: boolean
          payment_method_id?: string | null
          received_at?: string
          recorded_by?: string | null
          source_note?: string | null
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contributions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_totals"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "contributions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributions_payment_method_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_receipts: {
        Row: {
          created_at: string
          expense_id: string
          file_name: string
          id: string
          mime_type: string
          size_bytes: number
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          expense_id: string
          file_name: string
          id?: string
          mime_type: string
          size_bytes: number
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          expense_id?: string
          file_name?: string
          id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_receipts_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount_minor: number
          budget_item_id: string | null
          campaign_id: string
          category: Database["public"]["Enums"]["expense_category"]
          concept: string
          created_at: string
          currency: string
          id: string
          published_at: string | null
          recorded_by: string | null
          spent_at: string
          supplier: string | null
          updated_at: string
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          amount_minor: number
          budget_item_id?: string | null
          campaign_id: string
          category: Database["public"]["Enums"]["expense_category"]
          concept: string
          created_at?: string
          currency: string
          id?: string
          published_at?: string | null
          recorded_by?: string | null
          spent_at: string
          supplier?: string | null
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          amount_minor?: number
          budget_item_id?: string | null
          campaign_id?: string
          category?: Database["public"]["Enums"]["expense_category"]
          concept?: string
          created_at?: string
          currency?: string
          id?: string
          published_at?: string | null
          recorded_by?: string | null
          spent_at?: string
          supplier?: string | null
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_budget_item_id_fkey"
            columns: ["budget_item_id"]
            isOneToOne: false
            referencedRelation: "budget_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_totals"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "expenses_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      media: {
        Row: {
          alt_text: string
          caption: string | null
          created_at: string
          credit: string | null
          height: number
          id: string
          storage_path: string
          taken_on: string | null
          updated_at: string
          uploaded_by: string | null
          width: number
        }
        Insert: {
          alt_text: string
          caption?: string | null
          created_at?: string
          credit?: string | null
          height: number
          id?: string
          storage_path: string
          taken_on?: string | null
          updated_at?: string
          uploaded_by?: string | null
          width: number
        }
        Update: {
          alt_text?: string
          caption?: string | null
          created_at?: string
          credit?: string | null
          height?: number
          id?: string
          storage_path?: string
          taken_on?: string | null
          updated_at?: string
          uploaded_by?: string | null
          width?: number
        }
        Relationships: []
      }
      milestones: {
        Row: {
          campaign_id: string
          created_at: string
          description: string | null
          happened_on: string | null
          id: string
          published_at: string | null
          sort_order: number
          status: Database["public"]["Enums"]["milestone_status"]
          title: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          description?: string | null
          happened_on?: string | null
          id?: string
          published_at?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["milestone_status"]
          title: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          description?: string | null
          happened_on?: string | null
          id?: string
          published_at?: string | null
          sort_order?: number
          status?: Database["public"]["Enums"]["milestone_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "milestones_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_totals"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "milestones_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          campaign_id: string
          country_code: string
          created_at: string
          currency: string
          fields: NonNullable<Json>
          id: string
          instructions: string | null
          kind: Database["public"]["Enums"]["payment_method_kind"]
          label: string
          published_at: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          campaign_id: string
          country_code: string
          created_at?: string
          currency: string
          fields?: NonNullable<Json>
          id?: string
          instructions?: string | null
          kind?: Database["public"]["Enums"]["payment_method_kind"]
          label: string
          published_at?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          country_code?: string
          created_at?: string
          currency?: string
          fields?: NonNullable<Json>
          id?: string
          instructions?: string | null
          kind?: Database["public"]["Enums"]["payment_method_kind"]
          label?: string
          published_at?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_totals"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "payment_methods_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          bio: string | null
          born_on: string | null
          created_at: string
          died_on: string | null
          full_name: string
          id: string
          portrait_media_id: string | null
          published_at: string | null
          role_label: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          bio?: string | null
          born_on?: string | null
          created_at?: string
          died_on?: string | null
          full_name: string
          id?: string
          portrait_media_id?: string | null
          published_at?: string | null
          role_label?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          born_on?: string | null
          created_at?: string
          died_on?: string | null
          full_name?: string
          id?: string
          portrait_media_id?: string | null
          published_at?: string | null
          role_label?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_portrait_media_id_fkey"
            columns: ["portrait_media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      update_media: {
        Row: {
          media_id: string
          sort_order: number
          update_id: string
        }
        Insert: {
          media_id: string
          sort_order?: number
          update_id: string
        }
        Update: {
          media_id?: string
          sort_order?: number
          update_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "update_media_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_media_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "updates"
            referencedColumns: ["id"]
          },
        ]
      }
      updates: {
        Row: {
          author_id: string | null
          body: string
          campaign_id: string
          created_at: string
          id: string
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          body: string
          campaign_id: string
          created_at?: string
          id?: string
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          body?: string
          campaign_id?: string
          created_at?: string
          id?: string
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "updates_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign_totals"
            referencedColumns: ["campaign_id"]
          },
          {
            foreignKeyName: "updates_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      campaign_totals: {
        Row: {
          balance_minor: number | null
          campaign_id: string | null
          currency: string | null
          expense_count: number | null
          goal_amount_minor: number | null
          goal_currency: string | null
          receipt_count: number | null
          received_minor: number | null
          reconciled_at: string | null
          spent_minor: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
    }
    Enums: {
      app_role: "auditor" | "editor" | "admin" | "owner"
      campaign_status: "draft" | "active" | "paused" | "completed"
      expense_category:
        | "materiales"
        | "mano_de_obra"
        | "servicios"
        | "transporte"
        | "herramientas"
        | "otros"
      milestone_status: "pendiente" | "en_curso" | "completado"
      payment_method_kind:
        | "bank_transfer"
        | "mercado_pago"
        | "stripe"
        | "paypal"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["auditor", "editor", "admin", "owner"],
      campaign_status: ["draft", "active", "paused", "completed"],
      expense_category: [
        "materiales",
        "mano_de_obra",
        "servicios",
        "transporte",
        "herramientas",
        "otros",
      ],
      milestone_status: ["pendiente", "en_curso", "completado"],
      payment_method_kind: [
        "bank_transfer",
        "mercado_pago",
        "stripe",
        "paypal",
      ],
    },
  },
} as const
