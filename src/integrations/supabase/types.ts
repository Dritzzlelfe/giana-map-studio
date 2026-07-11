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
      categories: {
        Row: {
          created_at: string
          id: string
          key: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      items: {
        Row: {
          balance_due_on_delivery: number | null
          category_id: string | null
          client_paid_gad: boolean
          client_price: number | null
          created_at: string
          delivery_address: string | null
          delivery_date: string | null
          description: string | null
          design_placement: string | null
          gad_cost: number | null
          gad_paid_vendor: boolean
          id: string
          installer: string | null
          lead_time: string | null
          logistics_location: string | null
          option_source: string | null
          ordered_by: string | null
          priority: string | null
          qty_needed: number | null
          qty_ordered: number | null
          room_id: string | null
          sku: string | null
          status: string | null
          storage_address: string | null
          storage_name: string | null
          title: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          balance_due_on_delivery?: number | null
          category_id?: string | null
          client_paid_gad?: boolean
          client_price?: number | null
          created_at?: string
          delivery_address?: string | null
          delivery_date?: string | null
          description?: string | null
          design_placement?: string | null
          gad_cost?: number | null
          gad_paid_vendor?: boolean
          id?: string
          installer?: string | null
          lead_time?: string | null
          logistics_location?: string | null
          option_source?: string | null
          ordered_by?: string | null
          priority?: string | null
          qty_needed?: number | null
          qty_ordered?: number | null
          room_id?: string | null
          sku?: string | null
          status?: string | null
          storage_address?: string | null
          storage_name?: string | null
          title: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          balance_due_on_delivery?: number | null
          category_id?: string | null
          client_paid_gad?: boolean
          client_price?: number | null
          created_at?: string
          delivery_address?: string | null
          delivery_date?: string | null
          description?: string | null
          design_placement?: string | null
          gad_cost?: number | null
          gad_paid_vendor?: boolean
          id?: string
          installer?: string | null
          lead_time?: string | null
          logistics_location?: string | null
          option_source?: string | null
          ordered_by?: string | null
          priority?: string | null
          qty_needed?: number | null
          qty_ordered?: number | null
          room_id?: string | null
          sku?: string | null
          status?: string | null
          storage_address?: string | null
          storage_name?: string | null
          title?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_installer_fkey"
            columns: ["installer"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_ordered_by_fkey"
            columns: ["ordered_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      map_nodes: {
        Row: {
          category: string | null
          collapsed: boolean
          color: string | null
          created_at: string
          description: string | null
          id: string
          map_id: string
          parent_id: string | null
          pos_x: number | null
          pos_y: number | null
          priority: string | null
          sort_order: number
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          collapsed?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          map_id: string
          parent_id?: string | null
          pos_x?: number | null
          pos_y?: number | null
          priority?: string | null
          sort_order?: number
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          collapsed?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          map_id?: string
          parent_id?: string | null
          pos_x?: number | null
          pos_y?: number | null
          priority?: string | null
          sort_order?: number
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "map_nodes_map_id_fkey"
            columns: ["map_id"]
            isOneToOne: false
            referencedRelation: "maps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "map_nodes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "map_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      maps: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          person_id: string | null
          role_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          person_id?: string | null
          role_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          person_id?: string | null
          role_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          id: string
          is_system: boolean
          key: string
          label: string
          module_rights: Json
          money_visibility: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_system?: boolean
          key: string
          label: string
          module_rights?: Json
          money_visibility?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_system?: boolean
          key?: string
          label?: string
          module_rights?: Json
          money_visibility?: string
          updated_at?: string
        }
        Relationships: []
      }
      rooms: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          account_status: string
          contact_info: string | null
          contact_name: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          trade_account_no: string | null
          updated_at: string
        }
        Insert: {
          account_status?: string
          contact_info?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          trade_account_no?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: string
          contact_info?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          trade_account_no?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      items_visible: {
        Row: {
          balance_due_on_delivery: number | null
          category_id: string | null
          client_paid_gad: boolean | null
          client_price: number | null
          created_at: string | null
          delivery_address: string | null
          delivery_date: string | null
          description: string | null
          design_placement: string | null
          gad_cost: number | null
          gad_paid_vendor: boolean | null
          id: string | null
          installer: string | null
          lead_time: string | null
          logistics_location: string | null
          option_source: string | null
          ordered_by: string | null
          priority: string | null
          qty_needed: number | null
          qty_ordered: number | null
          room_id: string | null
          sku: string | null
          status: string | null
          storage_address: string | null
          storage_name: string | null
          title: string | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          balance_due_on_delivery?: never
          category_id?: string | null
          client_paid_gad?: boolean | null
          client_price?: never
          created_at?: string | null
          delivery_address?: string | null
          delivery_date?: string | null
          description?: string | null
          design_placement?: string | null
          gad_cost?: never
          gad_paid_vendor?: boolean | null
          id?: string | null
          installer?: string | null
          lead_time?: string | null
          logistics_location?: string | null
          option_source?: string | null
          ordered_by?: string | null
          priority?: string | null
          qty_needed?: number | null
          qty_ordered?: number | null
          room_id?: string | null
          sku?: string | null
          status?: string | null
          storage_address?: string | null
          storage_name?: string | null
          title?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          balance_due_on_delivery?: never
          category_id?: string | null
          client_paid_gad?: boolean | null
          client_price?: never
          created_at?: string | null
          delivery_address?: string | null
          delivery_date?: string | null
          description?: string | null
          design_placement?: string | null
          gad_cost?: never
          gad_paid_vendor?: boolean | null
          id?: string | null
          installer?: string | null
          lead_time?: string | null
          logistics_location?: string | null
          option_source?: string | null
          ordered_by?: string | null
          priority?: string | null
          qty_needed?: number | null
          qty_ordered?: number | null
          room_id?: string | null
          sku?: string | null
          status?: string | null
          storage_address?: string | null
          storage_name?: string | null
          title?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_installer_fkey"
            columns: ["installer"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_ordered_by_fkey"
            columns: ["ordered_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      current_money_visibility: { Args: never; Returns: string }
      current_preview_role_key: { Args: never; Returns: string }
      current_role_key: { Args: never; Returns: string }
      has_module_right: {
        Args: { _level: string; _module: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
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
