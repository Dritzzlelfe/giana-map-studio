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
      approvals: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          item_id: string
          logged_by: string | null
          mode: string
          note: string | null
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          item_id: string
          logged_by?: string | null
          mode: string
          note?: string | null
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          item_id?: string
          logged_by?: string | null
          mode?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approvals_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_visible"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          construction_budget: number | null
          created_at: string
          ffe_budget: number | null
          id: string
          per_unit_rates: Json
          project_id: string
          scope: string
          updated_at: string
        }
        Insert: {
          construction_budget?: number | null
          created_at?: string
          ffe_budget?: number | null
          id?: string
          per_unit_rates?: Json
          project_id: string
          scope?: string
          updated_at?: string
        }
        Update: {
          construction_budget?: number | null
          created_at?: string
          ffe_budget?: number | null
          id?: string
          per_unit_rates?: Json
          project_id?: string
          scope?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          axis: string | null
          created_at: string
          id: string
          key: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          axis?: string | null
          created_at?: string
          id?: string
          key: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          axis?: string | null
          created_at?: string
          id?: string
          key?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          expires_on: string | null
          file_url: string | null
          id: string
          project_id: string | null
          related_party: string | null
          room_id: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_on?: string | null
          file_url?: string | null
          id?: string
          project_id?: string | null
          related_party?: string | null
          room_id?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_on?: string | null
          file_url?: string | null
          id?: string
          project_id?: string | null
          related_party?: string | null
          room_id?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_related_party_fkey"
            columns: ["related_party"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "room_targets_visible"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "documents_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_records: {
        Row: {
          created_at: string
          id: string
          listed_chairish: boolean
          listed_website: boolean
          location: string | null
          notes: string | null
          ownership: string
          product_id: string
          resale_status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          listed_chairish?: boolean
          listed_website?: boolean
          location?: string | null
          notes?: string | null
          ownership: string
          product_id: string
          resale_status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          listed_chairish?: boolean
          listed_website?: boolean
          location?: string | null
          notes?: string | null
          ownership?: string
          product_id?: string
          resale_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_records_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          balance_due_on_delivery: number | null
          category_id: string | null
          client_paid_gad: boolean
          client_price: number | null
          created_at: string
          delivery_address: string | null
          delivery_address_pending: boolean
          delivery_date: string | null
          description: string | null
          design_placement: string | null
          gad_cost: number | null
          gad_paid_vendor: boolean
          id: string
          import_source: string | null
          installer: string | null
          is_fee: boolean
          lead_time: string | null
          logistics_location: string | null
          option_source: string | null
          ordered_by: string | null
          priority: string | null
          product_id: string
          programa_status: string | null
          project_id: string
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
          delivery_address_pending?: boolean
          delivery_date?: string | null
          description?: string | null
          design_placement?: string | null
          gad_cost?: number | null
          gad_paid_vendor?: boolean
          id?: string
          import_source?: string | null
          installer?: string | null
          is_fee?: boolean
          lead_time?: string | null
          logistics_location?: string | null
          option_source?: string | null
          ordered_by?: string | null
          priority?: string | null
          product_id: string
          programa_status?: string | null
          project_id: string
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
          delivery_address_pending?: boolean
          delivery_date?: string | null
          description?: string | null
          design_placement?: string | null
          gad_cost?: number | null
          gad_paid_vendor?: boolean
          id?: string
          import_source?: string | null
          installer?: string | null
          is_fee?: boolean
          lead_time?: string | null
          logistics_location?: string | null
          option_source?: string | null
          ordered_by?: string | null
          priority?: string | null
          product_id?: string
          programa_status?: string | null
          project_id?: string
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
            foreignKeyName: "items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "room_targets_visible"
            referencedColumns: ["room_id"]
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
      library_entries: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          price_per_unit: number | null
          price_unit: string | null
          product_id: string
          project_id: string | null
          room_id: string | null
          scope: string
          source_contact: string | null
          stock_on_hand: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          price_per_unit?: number | null
          price_unit?: string | null
          product_id: string
          project_id?: string | null
          room_id?: string | null
          scope: string
          source_contact?: string | null
          stock_on_hand?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          price_per_unit?: number | null
          price_unit?: string | null
          product_id?: string
          project_id?: string | null
          room_id?: string | null
          scope?: string
          source_contact?: string | null
          stock_on_hand?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_entries_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "room_targets_visible"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "library_entries_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
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
      media: {
        Row: {
          created_at: string
          file_url: string
          id: string
          item_id: string | null
          kind: string
          lookbook_section: string | null
          product_id: string | null
          room_id: string | null
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: string
          item_id?: string | null
          kind: string
          lookbook_section?: string | null
          product_id?: string | null
          room_id?: string | null
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: string
          item_id?: string | null
          kind?: string
          lookbook_section?: string | null
          product_id?: string | null
          room_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_visible"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "room_targets_visible"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "media_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number | null
          created_at: string
          direction: string
          due_date: string | null
          id: string
          item_id: string
          notes: string | null
          phase_id: string | null
          state: string
          updated_at: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          direction: string
          due_date?: string | null
          id?: string
          item_id: string
          notes?: string | null
          phase_id?: string | null
          state: string
          updated_at?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          direction?: string
          due_date?: string | null
          id?: string
          item_id?: string
          notes?: string | null
          phase_id?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_visible"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
        ]
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
      phases: {
        Row: {
          axis: string
          created_at: string
          id: string
          name: string
          project_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          axis: string
          created_at?: string
          id?: string
          name: string
          project_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          axis?: string
          created_at?: string
          id?: string
          name?: string
          project_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "phases_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          colour: string | null
          created_at: string
          default_vendor_id: string | null
          depth_in: number | null
          depth_text: string | null
          doc_code: string | null
          finish: string | null
          height_in: number | null
          height_text: string | null
          id: string
          length_in: number | null
          length_text: string | null
          material: string | null
          name: string
          sku: string | null
          updated_at: string
          width_in: number | null
          width_text: string | null
        }
        Insert: {
          brand?: string | null
          colour?: string | null
          created_at?: string
          default_vendor_id?: string | null
          depth_in?: number | null
          depth_text?: string | null
          doc_code?: string | null
          finish?: string | null
          height_in?: number | null
          height_text?: string | null
          id?: string
          length_in?: number | null
          length_text?: string | null
          material?: string | null
          name: string
          sku?: string | null
          updated_at?: string
          width_in?: number | null
          width_text?: string | null
        }
        Update: {
          brand?: string | null
          colour?: string | null
          created_at?: string
          default_vendor_id?: string | null
          depth_in?: number | null
          depth_text?: string | null
          doc_code?: string | null
          finish?: string | null
          height_in?: number | null
          height_text?: string | null
          id?: string
          length_in?: number | null
          length_text?: string | null
          material?: string | null
          name?: string
          sku?: string | null
          updated_at?: string
          width_in?: number | null
          width_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_default_vendor_id_fkey"
            columns: ["default_vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
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
      projects: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
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
          ceiling_height: string | null
          created_at: string
          id: string
          length: string | null
          name: string
          notes: string | null
          plan_name: string | null
          project_id: string
          sort_order: number
          target_amount: number | null
          updated_at: string
          width: string | null
        }
        Insert: {
          active?: boolean
          ceiling_height?: string | null
          created_at?: string
          id?: string
          length?: string | null
          name: string
          notes?: string | null
          plan_name?: string | null
          project_id: string
          sort_order?: number
          target_amount?: number | null
          updated_at?: string
          width?: string | null
        }
        Update: {
          active?: boolean
          ceiling_height?: string | null
          created_at?: string
          id?: string
          length?: string | null
          name?: string
          notes?: string | null
          plan_name?: string | null
          project_id?: string
          sort_order?: number
          target_amount?: number | null
          updated_at?: string
          width?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      budgets_visible: {
        Row: {
          construction_budget: number | null
          created_at: string | null
          ffe_budget: number | null
          id: string | null
          per_unit_rates: Json | null
          project_id: string | null
          updated_at: string | null
        }
        Insert: {
          construction_budget?: never
          created_at?: string | null
          ffe_budget?: never
          id?: string | null
          per_unit_rates?: never
          project_id?: string | null
          updated_at?: string | null
        }
        Update: {
          construction_budget?: never
          created_at?: string | null
          ffe_budget?: never
          id?: string | null
          per_unit_rates?: never
          project_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budgets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
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
            referencedRelation: "room_targets_visible"
            referencedColumns: ["room_id"]
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
      library_entries_visible: {
        Row: {
          created_at: string | null
          id: string | null
          notes: string | null
          price_per_unit: number | null
          price_unit: string | null
          product_id: string | null
          project_id: string | null
          room_id: string | null
          scope: string | null
          source_contact: string | null
          stock_on_hand: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          notes?: string | null
          price_per_unit?: never
          price_unit?: string | null
          product_id?: string | null
          project_id?: string | null
          room_id?: string | null
          scope?: string | null
          source_contact?: string | null
          stock_on_hand?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          notes?: string | null
          price_per_unit?: never
          price_unit?: string | null
          product_id?: string | null
          project_id?: string | null
          room_id?: string | null
          scope?: string | null
          source_contact?: string | null
          stock_on_hand?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "library_entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_entries_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "room_targets_visible"
            referencedColumns: ["room_id"]
          },
          {
            foreignKeyName: "library_entries_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      payments_visible: {
        Row: {
          amount: number | null
          created_at: string | null
          direction: string | null
          due_date: string | null
          id: string | null
          item_id: string | null
          phase_id: string | null
          state: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: never
          created_at?: string | null
          direction?: string | null
          due_date?: string | null
          id?: string | null
          item_id?: string | null
          phase_id?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: never
          created_at?: string | null
          direction?: string | null
          due_date?: string | null
          id?: string | null
          item_id?: string | null
          phase_id?: string | null
          state?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items_visible"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
        ]
      }
      room_targets_visible: {
        Row: {
          room_id: string | null
          target_amount: number | null
        }
        Insert: {
          room_id?: string | null
          target_amount?: never
        }
        Update: {
          room_id?: string | null
          target_amount?: never
        }
        Relationships: []
      }
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
