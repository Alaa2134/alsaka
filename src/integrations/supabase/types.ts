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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          account_code: string
          account_name: string
          account_type: string
          balance: number | null
          created_at: string
          id: string
          is_active: boolean | null
          parent_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          account_code: string
          account_name: string
          account_type: string
          balance?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          parent_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          account_code?: string
          account_name?: string
          account_type?: string
          balance?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          parent_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      app_users: {
        Row: {
          access_code_hash: string | null
          auth_id: string | null
          backup_codes: string[] | null
          created_at: string
          device_id: string | null
          device_locked_at: string | null
          failed_login_attempts: number | null
          id: string
          is_active: boolean
          last_activity_at: string | null
          locked_until: string | null
          name: string
          role: Database["public"]["Enums"]["app_role"]
          session_expires_at: string | null
          tenant_id: string | null
          two_factor_enabled: boolean | null
          two_factor_secret: string | null
          two_factor_verified_at: string | null
          updated_at: string
        }
        Insert: {
          access_code_hash?: string | null
          auth_id?: string | null
          backup_codes?: string[] | null
          created_at?: string
          device_id?: string | null
          device_locked_at?: string | null
          failed_login_attempts?: number | null
          id?: string
          is_active?: boolean
          last_activity_at?: string | null
          locked_until?: string | null
          name: string
          role?: Database["public"]["Enums"]["app_role"]
          session_expires_at?: string | null
          tenant_id?: string | null
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          two_factor_verified_at?: string | null
          updated_at?: string
        }
        Update: {
          access_code_hash?: string | null
          auth_id?: string | null
          backup_codes?: string[] | null
          created_at?: string
          device_id?: string | null
          device_locked_at?: string | null
          failed_login_attempts?: number | null
          id?: string
          is_active?: boolean
          last_activity_at?: string | null
          locked_until?: string | null
          name?: string
          role?: Database["public"]["Enums"]["app_role"]
          session_expires_at?: string | null
          tenant_id?: string | null
          two_factor_enabled?: boolean | null
          two_factor_secret?: string | null
          two_factor_verified_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          tenant_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          parent_id: string | null
          sort_order: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          sort_order?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          sort_order?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address: string | null
          client_number: string
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          client_number: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          client_number?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          accounting_enabled: boolean | null
          allowed_link_types: string[] | null
          animation_speed: string | null
          bank_account_name: string | null
          bank_account_number_encrypted: string | null
          bank_name: string | null
          created_at: string
          currency: string | null
          custom_domain: string | null
          depth_intensity: number | null
          enable_3d_effects: boolean | null
          enable_glassmorphism: boolean | null
          enable_particles: boolean | null
          id: string
          inventory_enabled: boolean | null
          link_default_expiry_days: number | null
          links_enabled: boolean | null
          max_links_per_month: number | null
          payment_bank_enabled: boolean | null
          payment_cod_enabled: boolean | null
          payment_stripe_enabled: boolean | null
          payment_vodafone_enabled: boolean | null
          sound_alerts_enabled: boolean | null
          store_access_blocked: boolean | null
          store_enabled: boolean | null
          stripe_account_id_encrypted: string | null
          subdomain: string | null
          subscription_expires_at: string | null
          subscription_type: string | null
          tax_percentage: number | null
          tenant_id: string
          updated_at: string
          vodafone_number_encrypted: string | null
        }
        Insert: {
          accounting_enabled?: boolean | null
          allowed_link_types?: string[] | null
          animation_speed?: string | null
          bank_account_name?: string | null
          bank_account_number_encrypted?: string | null
          bank_name?: string | null
          created_at?: string
          currency?: string | null
          custom_domain?: string | null
          depth_intensity?: number | null
          enable_3d_effects?: boolean | null
          enable_glassmorphism?: boolean | null
          enable_particles?: boolean | null
          id?: string
          inventory_enabled?: boolean | null
          link_default_expiry_days?: number | null
          links_enabled?: boolean | null
          max_links_per_month?: number | null
          payment_bank_enabled?: boolean | null
          payment_cod_enabled?: boolean | null
          payment_stripe_enabled?: boolean | null
          payment_vodafone_enabled?: boolean | null
          sound_alerts_enabled?: boolean | null
          store_access_blocked?: boolean | null
          store_enabled?: boolean | null
          stripe_account_id_encrypted?: string | null
          subdomain?: string | null
          subscription_expires_at?: string | null
          subscription_type?: string | null
          tax_percentage?: number | null
          tenant_id: string
          updated_at?: string
          vodafone_number_encrypted?: string | null
        }
        Update: {
          accounting_enabled?: boolean | null
          allowed_link_types?: string[] | null
          animation_speed?: string | null
          bank_account_name?: string | null
          bank_account_number_encrypted?: string | null
          bank_name?: string | null
          created_at?: string
          currency?: string | null
          custom_domain?: string | null
          depth_intensity?: number | null
          enable_3d_effects?: boolean | null
          enable_glassmorphism?: boolean | null
          enable_particles?: boolean | null
          id?: string
          inventory_enabled?: boolean | null
          link_default_expiry_days?: number | null
          links_enabled?: boolean | null
          max_links_per_month?: number | null
          payment_bank_enabled?: boolean | null
          payment_cod_enabled?: boolean | null
          payment_stripe_enabled?: boolean | null
          payment_vodafone_enabled?: boolean | null
          sound_alerts_enabled?: boolean | null
          store_access_blocked?: boolean | null
          store_enabled?: boolean | null
          stripe_account_id_encrypted?: string | null
          subdomain?: string | null
          subscription_expires_at?: string | null
          subscription_type?: string | null
          tax_percentage?: number | null
          tenant_id?: string
          updated_at?: string
          vodafone_number_encrypted?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_roles: {
        Row: {
          color: string
          created_at: string
          description: string | null
          icon: string
          id: string
          is_system_role: boolean
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_system_role?: boolean
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          is_system_role?: boolean
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_wishlist: {
        Row: {
          client_id: string
          created_at: string
          id: string
          product_id: string
          tenant_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          product_id: string
          tenant_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          product_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_wishlist_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_wishlist_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_wishlist_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      email_notification_settings: {
        Row: {
          created_at: string
          email_address: string
          id: string
          notify_on_account_lock: boolean | null
          notify_on_critical_events: boolean | null
          notify_on_failed_logins: boolean | null
          tenant_id: string
          updated_at: string
          user_id: string | null
          weekly_report_enabled: boolean | null
        }
        Insert: {
          created_at?: string
          email_address: string
          id?: string
          notify_on_account_lock?: boolean | null
          notify_on_critical_events?: boolean | null
          notify_on_failed_logins?: boolean | null
          tenant_id: string
          updated_at?: string
          user_id?: string | null
          weekly_report_enabled?: boolean | null
        }
        Update: {
          created_at?: string
          email_address?: string
          id?: string
          notify_on_account_lock?: boolean | null
          notify_on_critical_events?: boolean | null
          notify_on_failed_logins?: boolean | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
          weekly_report_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "email_notification_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message_content: string
          message_type: string | null
          recipient_name: string | null
          recipient_phone: string | null
          reference_id: string | null
          sender_id: string | null
          sender_type: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message_content: string
          message_type?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          reference_id?: string | null
          sender_id?: string | null
          sender_type: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message_content?: string
          message_type?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          reference_id?: string | null
          sender_id?: string | null
          sender_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          id: string
          invoice_id: string
          item_name: string
          item_number: string
          min_price: number
          price: number
          product_id: string | null
          quantity: number
          total: number
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          invoice_id: string
          item_name: string
          item_number: string
          min_price?: number
          price?: number
          product_id?: string | null
          quantity?: number
          total?: number
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          invoice_id?: string
          item_name?: string
          item_number?: string
          min_price?: number
          price?: number
          product_id?: string | null
          quantity?: number
          total?: number
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_templates: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          settings: Json
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          settings?: Json
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          settings?: Json
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          payment_method: string
          status: string
          store_order_id: string | null
          tenant_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          invoice_date?: string
          invoice_number: string
          notes?: string | null
          payment_method?: string
          status?: string
          store_order_id?: string | null
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          payment_method?: string
          status?: string
          store_order_id?: string | null
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_store_order_id_fkey"
            columns: ["store_order_id"]
            isOneToOne: false
            referencedRelation: "store_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          entry_date: string
          entry_number: string
          id: string
          posted_at: string | null
          posted_by: string | null
          reference_id: string | null
          reference_type: string | null
          status: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          entry_number: string
          id?: string
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          entry_number?: string
          id?: string
          posted_at?: string | null
          posted_by?: string | null
          reference_id?: string | null
          reference_type?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_posted_by_fkey"
            columns: ["posted_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entry_lines: {
        Row: {
          account_id: string
          created_at: string
          credit: number | null
          debit: number | null
          description: string | null
          id: string
          journal_entry_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          journal_entry_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          journal_entry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entry_lines_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      label_templates: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          settings: Json
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          settings?: Json
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          settings?: Json
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "label_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      link_access_logs: {
        Row: {
          accessed_at: string
          converted: boolean | null
          id: string
          ip_address: string | null
          link_id: string
          order_id: string | null
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          accessed_at?: string
          converted?: boolean | null
          id?: string
          ip_address?: string | null
          link_id: string
          order_id?: string | null
          tenant_id: string
          user_agent?: string | null
        }
        Update: {
          accessed_at?: string
          converted?: boolean | null
          id?: string
          ip_address?: string | null
          link_id?: string
          order_id?: string | null
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "link_access_logs_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "store_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_access_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "store_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_access_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          tenant_id: string
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          tenant_id: string
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          tenant_id?: string
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id: string
          status: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "store_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          client_id: string
          created_at: string
          id: string
          invoice_id: string | null
          notes: string | null
          payment_date: string
          payment_method: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          client_id: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category: string | null
          category_id: string | null
          created_at: string
          id: string
          image_url: string | null
          item_number: string
          min_price: number
          name: string
          price: number
          stock_quantity: number
          tenant_id: string | null
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          barcode?: string | null
          category?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          item_number: string
          min_price?: number
          name: string
          price?: number
          stock_quantity?: number
          tenant_id?: string | null
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          barcode?: string | null
          category?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          item_number?: string
          min_price?: number
          name?: string
          price?: number
          stock_quantity?: number
          tenant_id?: string | null
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action_type: string
          attempt_count: number | null
          blocked_until: string | null
          first_attempt_at: string | null
          id: string
          identifier: string
          last_attempt_at: string | null
        }
        Insert: {
          action_type: string
          attempt_count?: number | null
          blocked_until?: string | null
          first_attempt_at?: string | null
          id?: string
          identifier: string
          last_attempt_at?: string | null
        }
        Update: {
          action_type?: string
          attempt_count?: number | null
          blocked_until?: string | null
          first_attempt_at?: string | null
          id?: string
          identifier?: string
          last_attempt_at?: string | null
        }
        Relationships: []
      }
      return_items: {
        Row: {
          created_at: string
          id: string
          item_name: string
          item_number: string
          price: number
          product_id: string | null
          quantity: number
          return_id: string
          total: number
        }
        Insert: {
          created_at?: string
          id?: string
          item_name: string
          item_number: string
          price?: number
          product_id?: string | null
          quantity?: number
          return_id: string
          total?: number
        }
        Update: {
          created_at?: string
          id?: string
          item_name?: string
          item_number?: string
          price?: number
          product_id?: string | null
          quantity?: number
          return_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "return_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          client_id: string | null
          created_at: string
          id: string
          invoice_id: string | null
          notes: string | null
          reason: string | null
          return_date: string
          return_number: string
          status: string
          tenant_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          reason?: string | null
          return_date?: string
          return_number: string
          status?: string
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          notes?: string | null
          reason?: string | null
          return_date?: string
          return_number?: string
          status?: string
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role_id: string | null
          role_name: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role_id?: string | null
          role_name?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role_id?: string | null
          role_name?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          latitude: number | null
          longitude: number | null
          severity: string
          tenant_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          severity?: string
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          latitude?: number | null
          longitude?: number | null
          severity?: string
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      security_reports: {
        Row: {
          created_at: string
          id: string
          period_end: string
          period_start: string
          report_data: Json
          report_type: string
          sent_at: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          report_data?: Json
          report_type?: string
          sent_at?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          report_data?: Json
          report_type?: string
          sent_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_links: {
        Row: {
          created_at: string
          created_by: string | null
          current_uses: number
          description: string | null
          discount_type: string | null
          discount_value: number | null
          expires_at: string | null
          id: string
          is_active: boolean
          link_code: string
          link_data: Json
          link_type: Database["public"]["Enums"]["store_link_type"]
          max_uses: number | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          link_code: string
          link_data?: Json
          link_type: Database["public"]["Enums"]["store_link_type"]
          max_uses?: number | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_uses?: number
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          link_code?: string
          link_data?: Json
          link_type?: Database["public"]["Enums"]["store_link_type"]
          max_uses?: number | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      store_order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "store_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_orders: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          customer_address: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          delivered_at: string | null
          discount_amount: number | null
          estimated_delivery: string | null
          id: string
          invoice_approved_at: string | null
          invoice_approved_by: string | null
          invoice_id: string | null
          notes: string | null
          order_number: string
          order_status: string | null
          payment_method: string
          payment_proof_url: string | null
          payment_status: string | null
          shipping_amount: number | null
          shipping_notes: string | null
          shipping_status: string | null
          subtotal: number
          tax_amount: number | null
          tenant_id: string
          total_amount: number
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          customer_address: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          delivered_at?: string | null
          discount_amount?: number | null
          estimated_delivery?: string | null
          id?: string
          invoice_approved_at?: string | null
          invoice_approved_by?: string | null
          invoice_id?: string | null
          notes?: string | null
          order_number: string
          order_status?: string | null
          payment_method: string
          payment_proof_url?: string | null
          payment_status?: string | null
          shipping_amount?: number | null
          shipping_notes?: string | null
          shipping_status?: string | null
          subtotal: number
          tax_amount?: number | null
          tenant_id: string
          total_amount: number
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          customer_address?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          delivered_at?: string | null
          discount_amount?: number | null
          estimated_delivery?: string | null
          id?: string
          invoice_approved_at?: string | null
          invoice_approved_by?: string | null
          invoice_id?: string | null
          notes?: string | null
          order_number?: string
          order_status?: string | null
          payment_method?: string
          payment_proof_url?: string | null
          payment_status?: string | null
          shipping_amount?: number | null
          shipping_notes?: string | null
          shipping_status?: string | null
          subtotal?: number
          tax_amount?: number | null
          tenant_id?: string
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_orders_confirmed_by_fkey"
            columns: ["confirmed_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_orders_invoice_approved_by_fkey"
            columns: ["invoice_approved_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_orders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          primary_color: string | null
          secondary_color: string | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          primary_color?: string | null
          secondary_color?: string | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      two_factor_codes: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string
          id: string
          used: boolean | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at: string
          id?: string
          used?: boolean | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          used?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "two_factor_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string
          id: string
          permission: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_invoice_sends: {
        Row: {
          client_phone: string
          id: string
          invoice_id: string
          message_sent: string
          sent_at: string
          sent_via: string | null
          tenant_id: string
        }
        Insert: {
          client_phone: string
          id?: string
          invoice_id: string
          message_sent: string
          sent_at?: string
          sent_via?: string | null
          tenant_id: string
        }
        Update: {
          client_phone?: string
          id?: string
          invoice_id?: string
          message_sent?: string
          sent_at?: string
          sent_via?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_invoice_sends_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_invoice_sends_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_notifications_log: {
        Row: {
          client_id: string | null
          client_phone: string
          id: string
          message_content: string
          notification_type: string
          reference_id: string | null
          sent_at: string
          status: string | null
          tenant_id: string
        }
        Insert: {
          client_id?: string | null
          client_phone: string
          id?: string
          message_content: string
          notification_type: string
          reference_id?: string | null
          sent_at?: string
          status?: string | null
          tenant_id: string
        }
        Update: {
          client_id?: string | null
          client_phone?: string
          id?: string
          message_content?: string
          notification_type?: string
          reference_id?: string | null
          sent_at?: string
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_notifications_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_notifications_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_settings: {
        Row: {
          auto_send_invoices: boolean | null
          auto_send_order_notifications: boolean | null
          auto_send_order_tracking: boolean | null
          bot_phone: string | null
          connection_status: string | null
          created_at: string
          id: string
          invoice_message_template: string | null
          is_verified: boolean | null
          last_connected_at: string | null
          last_disconnected_at: string | null
          qr_session_id: string | null
          tenant_id: string
          updated_at: string
          whatsapp_access_token_encrypted: string | null
          whatsapp_number: string
          whatsapp_phone_id: string | null
        }
        Insert: {
          auto_send_invoices?: boolean | null
          auto_send_order_notifications?: boolean | null
          auto_send_order_tracking?: boolean | null
          bot_phone?: string | null
          connection_status?: string | null
          created_at?: string
          id?: string
          invoice_message_template?: string | null
          is_verified?: boolean | null
          last_connected_at?: string | null
          last_disconnected_at?: string | null
          qr_session_id?: string | null
          tenant_id: string
          updated_at?: string
          whatsapp_access_token_encrypted?: string | null
          whatsapp_number: string
          whatsapp_phone_id?: string | null
        }
        Update: {
          auto_send_invoices?: boolean | null
          auto_send_order_notifications?: boolean | null
          auto_send_order_tracking?: boolean | null
          bot_phone?: string | null
          connection_status?: string | null
          created_at?: string
          id?: string
          invoice_message_template?: string | null
          is_verified?: boolean | null
          last_connected_at?: string | null
          last_disconnected_at?: string | null
          qr_session_id?: string | null
          tenant_id?: string
          updated_at?: string
          whatsapp_access_token_encrypted?: string | null
          whatsapp_number?: string
          whatsapp_phone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_store_settings: {
        Row: {
          currency: string | null
          custom_domain: string | null
          depth_intensity: number | null
          enable_3d_effects: boolean | null
          enable_glassmorphism: boolean | null
          enable_particles: boolean | null
          payment_bank_enabled: boolean | null
          payment_cod_enabled: boolean | null
          payment_stripe_enabled: boolean | null
          payment_vodafone_enabled: boolean | null
          store_access_blocked: boolean | null
          store_enabled: boolean | null
          subdomain: string | null
          subscription_active: boolean | null
          tax_percentage: number | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      safe_app_users: {
        Row: {
          created_at: string | null
          device_locked_at: string | null
          id: string | null
          is_active: boolean | null
          name: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          tenant_id: string | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      auth_can_view_orders: { Args: never; Returns: boolean }
      auth_has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      auth_in_tenant: { Args: { _tenant_id: string }; Returns: boolean }
      auth_is_admin: { Args: never; Returns: boolean }
      auth_is_system_manager: { Args: never; Returns: boolean }
      auth_user_tenant_id: { Args: never; Returns: string }
      check_rate_limit: {
        Args: {
          p_action_type: string
          p_block_minutes?: number
          p_identifier: string
          p_max_attempts?: number
          p_window_minutes?: number
        }
        Returns: boolean
      }
      check_session_valid: { Args: never; Returns: boolean }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      decrypt_company_data: {
        Args: { encrypted_text: string; tenant_uuid: string }
        Returns: string
      }
      decrypt_sensitive_data: {
        Args: { encrypted_text: string; encryption_key: string }
        Returns: string
      }
      encrypt_company_data: {
        Args: { plain_text: string; tenant_uuid: string }
        Returns: string
      }
      encrypt_sensitive_data: {
        Args: { encryption_key: string; plain_text: string }
        Returns: string
      }
      generate_weekly_security_report: {
        Args: { _tenant_id: string }
        Returns: string
      }
      get_app_user_from_auth: {
        Args: never
        Returns: {
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
        }[]
      }
      get_clients_secure: {
        Args: never
        Returns: {
          address: string
          client_number: string
          created_at: string
          email: string
          id: string
          name: string
          notes: string
          phone: string
          tenant_id: string
          updated_at: string
        }[]
      }
      get_decrypted_company_settings: {
        Args: { tenant_uuid: string }
        Returns: {
          bank_account_name: string
          bank_account_number: string
          bank_name: string
          currency: string
          custom_domain: string
          id: string
          payment_bank_enabled: boolean
          payment_cod_enabled: boolean
          payment_stripe_enabled: boolean
          payment_vodafone_enabled: boolean
          store_access_blocked: boolean
          store_enabled: boolean
          stripe_account_id: string
          subdomain: string
          subscription_expires_at: string
          subscription_type: string
          tax_percentage: number
          tenant_id: string
          vodafone_number: string
        }[]
      }
      get_next_journal_entry_number: {
        Args: { _tenant_id: string }
        Returns: string
      }
      get_next_order_number: { Args: { _tenant_id: string }; Returns: string }
      get_public_store_settings: {
        Args: { tenant_slug?: string }
        Returns: {
          currency: string
          custom_domain: string
          depth_intensity: number
          enable_3d_effects: boolean
          enable_glassmorphism: boolean
          enable_particles: boolean
          payment_bank_enabled: boolean
          payment_cod_enabled: boolean
          payment_stripe_enabled: boolean
          payment_vodafone_enabled: boolean
          store_access_blocked: boolean
          store_enabled: boolean
          subdomain: string
          subscription_active: boolean
          tax_percentage: number
          tenant_id: string
        }[]
      }
      get_safe_app_users: {
        Args: never
        Returns: {
          created_at: string
          device_locked_at: string
          id: string
          is_active: boolean
          name: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          updated_at: string
        }[]
      }
      get_safe_user_profile: {
        Args: never
        Returns: {
          created_at: string
          device_locked_at: string
          id: string
          is_active: boolean
          name: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          two_factor_enabled: boolean
          updated_at: string
        }[]
      }
      get_store_orders_secure: {
        Args: never
        Returns: {
          created_at: string
          customer_address: string
          customer_email: string
          customer_name: string
          customer_phone: string
          id: string
          notes: string
          order_number: string
          order_status: string
          payment_method: string
          payment_status: string
          shipping_status: string
          tenant_id: string
          total_amount: number
          updated_at: string
        }[]
      }
      get_tenant_clients: {
        Args: { tenant_id_param: string }
        Returns: {
          address: string
          client_number: string
          created_at: string
          email: string
          id: string
          name: string
          notes: string
          phone: string
        }[]
      }
      get_user_for_login: {
        Args: { user_uuid: string }
        Returns: {
          auth_id: string
          backup_codes: string[]
          device_id: string
          device_locked_at: string
          failed_login_attempts: number
          id: string
          is_active: boolean
          locked_until: string
          name: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          two_factor_enabled: boolean
          two_factor_secret: string
        }[]
      }
      get_user_tenant_id: {
        Args: { user_access_code: string }
        Returns: string
      }
      hash_access_code: { Args: { plain_code: string }; Returns: string }
      hash_backup_code: { Args: { plain_code: string }; Returns: string }
      is_admin_user: { Args: never; Returns: boolean }
      is_authenticated_user: { Args: never; Returns: boolean }
      is_system_manager: { Args: { _access_code: string }; Returns: boolean }
      log_security_event:
        | { Args: { _action: string; _details?: Json }; Returns: undefined }
        | {
            Args: { _details?: Json; _event_type: string; _severity?: string }
            Returns: string
          }
      log_security_event_with_location: {
        Args: {
          _city?: string
          _country?: string
          _details?: Json
          _event_type: string
          _ip_address?: string
          _latitude?: number
          _longitude?: number
          _severity?: string
        }
        Returns: string
      }
      mask_sensitive_data: { Args: { data: Json }; Returns: Json }
      record_failed_login: {
        Args: { _access_code: string; _ip_address?: string }
        Returns: Json
      }
      record_logout: { Args: never; Returns: undefined }
      record_successful_login: {
        Args: { _ip_address?: string; _user_id: string }
        Returns: undefined
      }
      safe_search_products: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_search_term: string
          p_tenant_id: string
        }
        Returns: {
          barcode: string | null
          category: string | null
          category_id: string | null
          created_at: string
          id: string
          image_url: string | null
          item_number: string
          min_price: number
          name: string
          price: number
          stock_quantity: number
          tenant_id: string | null
          updated_at: string
          warehouse_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      update_session_activity: { Args: never; Returns: undefined }
      user_has_role: {
        Args: {
          _access_code: string
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: boolean
      }
      user_in_tenant: {
        Args: { _access_code: string; _tenant_id: string }
        Returns: boolean
      }
      verify_access_code: {
        Args: { hashed_code: string; plain_code: string }
        Returns: boolean
      }
      verify_and_consume_backup_code: {
        Args: { plain_code: string; user_id_param: string }
        Returns: boolean
      }
      verify_backup_code: {
        Args: { plain_code: string; user_id_param: string }
        Returns: boolean
      }
      verify_user_login: {
        Args: { p_access_code: string }
        Returns: {
          is_active: boolean
          two_factor_enabled: boolean
          user_id: string
          user_name: string
          user_role: Database["public"]["Enums"]["app_role"]
          user_tenant_id: string
        }[]
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "cashier"
        | "viewer"
        | "system_manager"
        | "company_admin"
      store_link_type: "product" | "cart" | "invoice" | "payment" | "offer"
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
      app_role: [
        "admin",
        "manager",
        "cashier",
        "viewer",
        "system_manager",
        "company_admin",
      ],
      store_link_type: ["product", "cart", "invoice", "payment", "offer"],
    },
  },
} as const
