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
      ai_credits: {
        Row: {
          business_id: string
          created_at: string
          credits_remaining: number
          free_credits_granted: boolean | null
          id: string
          total_credits_purchased: number
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          credits_remaining?: number
          free_credits_granted?: boolean | null
          id?: string
          total_credits_purchased?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          credits_remaining?: number
          free_credits_granted?: boolean | null
          id?: string
          total_credits_purchased?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_credits_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_generated_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_selected: boolean | null
          job_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_selected?: boolean | null
          job_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_selected?: boolean | null
          job_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_generated_images_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ai_image_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_image_jobs: {
        Row: {
          business_id: string
          created_at: string
          credits_used: number
          error_message: string | null
          id: string
          original_image_url: string
          product_id: string | null
          product_type: string
          status: string
          style_type: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          credits_used?: number
          error_message?: string | null
          id?: string
          original_image_url: string
          product_id?: string | null
          product_type: string
          status?: string
          style_type: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          credits_used?: number
          error_message?: string | null
          id?: string
          original_image_url?: string
          product_id?: string | null
          product_type?: string
          status?: string
          style_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_image_jobs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_image_jobs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      banners: {
        Row: {
          active: boolean | null
          business_id: string
          created_at: string
          cta_text: string | null
          cta_url: string | null
          end_date: string | null
          id: string
          image_url: string | null
          sort_order: number | null
          start_date: string | null
          text: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          business_id: string
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          sort_order?: number | null
          start_date?: string | null
          text?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          business_id?: string
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          end_date?: string | null
          id?: string
          image_url?: string | null
          sort_order?: number | null
          start_date?: string | null
          text?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "banners_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_usage: {
        Row: {
          business_id: string
          created_at: string
          id: string
          products_count: number | null
          stored_images_count: number | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          products_count?: number | null
          stored_images_count?: number | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          products_count?: number | null
          stored_images_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_usage_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          about_text: string | null
          about_page_body: string | null
          about_page_contact: string | null
          about_page_title: string | null
          about_page_body_align: string | null
          brand_style: string | null
          business_category: string | null
          color_palette: Json | null
          created_at: string
          cta_text: string | null
          custom_category_name: string | null
          delivery_fee: number | null
          delivery_mode: string | null
          email: string | null
          hero_badge: string | null
          hero_benefits: Json | null
          hero_image_url: string | null
          hero_title: string | null
          id: string
          is_published: boolean
          logo_url: string | null
          marquee_bar_enabled: boolean | null
          name: string
          owner_id: string
          payment_api_key: string | null
          payment_enabled: boolean | null
          payment_provider: string | null
          phone: string | null
          primary_color: string | null
          promo_text: string | null
          slug: string | null
          tagline: string | null
          template_id: string | null
          updated_at: string
          whatsapp_enabled: boolean | null
          whatsapp_message: string | null
        }
        Insert: {
          about_text?: string | null
          about_page_body?: string | null
          about_page_contact?: string | null
          about_page_title?: string | null
          about_page_body_align?: string | null
          brand_style?: string | null
          business_category?: string | null
          color_palette?: Json | null
          created_at?: string
          cta_text?: string | null
          custom_category_name?: string | null
          delivery_fee?: number | null
          delivery_mode?: string | null
          email?: string | null
          hero_badge?: string | null
          hero_benefits?: Json | null
          hero_image_url?: string | null
          hero_title?: string | null
          id?: string
          is_published?: boolean
          logo_url?: string | null
          marquee_bar_enabled?: boolean | null
          name: string
          owner_id: string
          payment_api_key?: string | null
          payment_enabled?: boolean | null
          payment_provider?: string | null
          phone?: string | null
          primary_color?: string | null
          promo_text?: string | null
          slug?: string | null
          tagline?: string | null
          template_id?: string | null
          updated_at?: string
          whatsapp_enabled?: boolean | null
          whatsapp_message?: string | null
        }
        Update: {
          about_text?: string | null
          about_page_body?: string | null
          about_page_contact?: string | null
          about_page_title?: string | null
          about_page_body_align?: string | null
          brand_style?: string | null
          business_category?: string | null
          color_palette?: Json | null
          created_at?: string
          cta_text?: string | null
          custom_category_name?: string | null
          delivery_fee?: number | null
          delivery_mode?: string | null
          email?: string | null
          hero_badge?: string | null
          hero_benefits?: Json | null
          hero_image_url?: string | null
          hero_title?: string | null
          id?: string
          is_published?: boolean
          logo_url?: string | null
          marquee_bar_enabled?: boolean | null
          name?: string
          owner_id?: string
          payment_api_key?: string | null
          payment_enabled?: boolean | null
          payment_provider?: string | null
          phone?: string | null
          primary_color?: string | null
          promo_text?: string | null
          slug?: string | null
          tagline?: string | null
          template_id?: string | null
          updated_at?: string
          whatsapp_enabled?: boolean | null
          whatsapp_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      publish_checkout_sessions: {
        Row: {
          amount_ils: number | null
          business_id: string
          created_at: string
          external_transaction_id: string | null
          id: string
          payment_verified_at: string | null
          provider: string
          session_token: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_ils?: number | null
          business_id: string
          created_at?: string
          external_transaction_id?: string | null
          id?: string
          payment_verified_at?: string | null
          provider?: string
          session_token: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_ils?: number | null
          business_id?: string
          created_at?: string
          external_transaction_id?: string | null
          id?: string
          payment_verified_at?: string | null
          provider?: string
          session_token?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publish_checkout_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_banners: {
        Row: {
          active: boolean | null
          campaign_id: string
          created_at: string
          cta_text: string | null
          cta_url: string | null
          id: string
          image_url: string | null
          sort_order: number | null
          text: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          campaign_id: string
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          id?: string
          image_url?: string | null
          sort_order?: number | null
          text?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          campaign_id?: string
          created_at?: string
          cta_text?: string | null
          cta_url?: string | null
          id?: string
          image_url?: string | null
          sort_order?: number | null
          text?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_banners_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_products: {
        Row: {
          active: boolean | null
          campaign_id: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_campaign_only: boolean
          name: string | null
          price: number | null
          product_id: string | null
          sale_price: number | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          campaign_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_campaign_only?: boolean
          name?: string | null
          price?: number | null
          product_id?: string | null
          sale_price?: number | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          campaign_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_campaign_only?: boolean
          name?: string | null
          price?: number | null
          product_id?: string | null
          sale_price?: number | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_products_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          display_mode: string
          end_date: string | null
          id: string
          is_active: boolean
          name: string
          start_date: string | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          display_mode?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          name: string
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          display_mode?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean | null
          business_id: string
          code: string
          created_at: string
          current_uses: number
          discount_type: string
          discount_value: number
          end_date: string | null
          id: string
          max_uses: number | null
          min_order_amount: number | null
          start_date: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          business_id: string
          code: string
          created_at?: string
          current_uses?: number
          discount_type?: string
          discount_value?: number
          end_date?: string | null
          id?: string
          max_uses?: number | null
          min_order_amount?: number | null
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          business_id?: string
          code?: string
          created_at?: string
          current_uses?: number
          discount_type?: string
          discount_value?: number
          end_date?: string | null
          id?: string
          max_uses?: number | null
          min_order_amount?: number | null
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupons_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          price_at_order: number
          product_id: string | null
          product_name: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          price_at_order: number
          product_id?: string | null
          product_name: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          price_at_order?: number
          product_id?: string | null
          product_name?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          business_id: string
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          delivery_address: string | null
          delivery_fee: number | null
          delivery_method: string | null
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["order_status"]
          total_price: number
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone: string
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_method?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_price?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          delivery_address?: string | null
          delivery_fee?: number | null
          delivery_method?: string | null
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      page_views: {
        Row: {
          business_id: string
          created_at: string
          id: string
          page_path: string
          referrer: string | null
          user_agent: string | null
          visitor_id: string | null
        }
        Insert: {
          business_id: string
          created_at?: string
          id?: string
          page_path?: string
          referrer?: string | null
          user_agent?: string | null
          visitor_id?: string | null
        }
        Update: {
          business_id?: string
          created_at?: string
          id?: string
          page_path?: string
          referrer?: string | null
          user_agent?: string | null
          visitor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_views_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          order_id: string | null
          payment_provider: string | null
          provider_transaction_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount?: number
          business_id: string
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          payment_provider?: string | null
          provider_transaction_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          payment_provider?: string | null
          provider_transaction_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          business_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      product_custom_fields: {
        Row: {
          created_at: string
          field_name: string
          field_value: string | null
          id: string
          product_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          field_name: string
          field_value?: string | null
          id?: string
          product_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          field_name?: string
          field_value?: string | null
          id?: string
          product_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_custom_fields_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean | null
          business_id: string
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          video_url: string | null
          is_hot: boolean | null
          is_on_sale: boolean | null
          name: string
          price: number
          sale_end_date: string | null
          sale_price: number | null
          sku: string | null
          sort_order: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          business_id: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          video_url?: string | null
          is_hot?: boolean | null
          is_on_sale?: boolean | null
          name: string
          price?: number
          sale_end_date?: string | null
          sale_price?: number | null
          sku?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          business_id?: string
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          video_url?: string | null
          is_hot?: boolean | null
          is_on_sale?: boolean | null
          name?: string
          price?: number
          sale_end_date?: string | null
          sale_price?: number | null
          sku?: string | null
          sort_order?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_provider: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          onboarding_completed_at: string | null
          phone: string | null
          referral_code: string | null
          referred_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_provider?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          onboarding_completed_at?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_provider?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          onboarding_completed_at?: string | null
          phone?: string | null
          referral_code?: string | null
          referred_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_logs: {
        Row: {
          created_at: string
          id: string
          referred_user_id: string
          referrer_user_id: string
          reward_days: number | null
          reward_given: boolean
          rewarded_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          referred_user_id: string
          referrer_user_id: string
          reward_days?: number | null
          reward_given?: boolean
          rewarded_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          referred_user_id?: string
          referrer_user_id?: string
          reward_days?: number | null
          reward_given?: boolean
          rewarded_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          id: string
          image_limit: number | null
          image_storage_package: string | null
          image_storage_price: number | null
          monthly_total: number | null
          paid_until: string | null
          plan_name: string
          product_addon_enabled: boolean | null
          product_addon_price: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_limit?: number | null
          image_storage_package?: string | null
          image_storage_price?: number | null
          monthly_total?: number | null
          paid_until?: string | null
          plan_name?: string
          product_addon_enabled?: boolean | null
          product_addon_price?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_limit?: number | null
          image_storage_package?: string | null
          image_storage_price?: number | null
          monthly_total?: number | null
          paid_until?: string | null
          plan_name?: string
          product_addon_enabled?: boolean | null
          product_addon_price?: number | null
          status?: string
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
      admin_payment_stats: {
        Row: {
          failed_payments: number | null
          pending_payments: number | null
          refunded_payments: number | null
          revenue_last_30_days: number | null
          revenue_last_7_days: number | null
          revenue_this_month: number | null
          successful_payments: number | null
          total_payments: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
      admin_platform_stats: {
        Row: {
          total_businesses: number | null
          total_orders: number | null
          total_page_views: number | null
          total_products: number | null
          total_revenue: number | null
          total_unique_visitors: number | null
          total_users: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_ai_credits: {
        Args: { p_amount: number; p_business_id: string }
        Returns: number
      }
      admin_grant_referral_reward: {
        Args: { referred_user_email: string }
        Returns: boolean
      }
      can_upload_image: { Args: { p_business_id: string }; Returns: boolean }
      consume_ai_credits: {
        Args: { p_amount?: number; p_business_id: string }
        Returns: boolean
      }
      generate_referral_code: { Args: never; Returns: string }
      get_business_for_order: { Args: { order_uuid: string }; Returns: string }
      get_current_profile_id: { Args: never; Returns: string }
      get_image_usage_percentage: {
        Args: { p_business_id: string }
        Returns: number
      }
      grant_free_ai_credits: {
        Args: { p_business_id: string }
        Returns: boolean
      }
      grant_referral_reward: {
        Args: { referred_user_uuid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_business_owner: { Args: { business_uuid: string }; Returns: boolean }
      is_campaign_owner: { Args: { campaign_uuid: string }; Returns: boolean }
      is_product_owner: { Args: { product_uuid: string }; Returns: boolean }
      recalculate_business_usage: {
        Args: { p_business_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      order_status: "pending" | "confirmed" | "paid" | "completed" | "cancelled"
      payment_status:
        | "pending"
        | "success"
        | "failed"
        | "refunded"
        | "cancelled"
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
      app_role: ["admin", "user"],
      order_status: ["pending", "confirmed", "paid", "completed", "cancelled"],
      payment_status: ["pending", "success", "failed", "refunded", "cancelled"],
    },
  },
} as const
