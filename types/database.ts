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
      activity_log: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          organization_id: string | null
          page_id: string | null
          site_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          organization_id?: string | null
          page_id?: string | null
          site_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          organization_id?: string | null
          page_id?: string | null
          site_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          allowed_sites: string[] | null
          created_at: string | null
          created_by: string | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          last_used_ip: unknown
          name: string
          organization_id: string
          permissions: string[] | null
          rate_limit: number | null
          rate_limit_reset_at: string | null
          requests_this_hour: number | null
        }
        Insert: {
          allowed_sites?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          last_used_ip?: unknown
          name: string
          organization_id: string
          permissions?: string[] | null
          rate_limit?: number | null
          rate_limit_reset_at?: string | null
          requests_this_hour?: number | null
        }
        Update: {
          allowed_sites?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          last_used_ip?: unknown
          name?: string
          organization_id?: string
          permissions?: string[] | null
          rate_limit?: number | null
          rate_limit_reset_at?: string | null
          requests_this_hour?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      api_request_logs: {
        Row: {
          api_key_id: string | null
          created_at: string | null
          error_message: string | null
          id: string
          ip_address: unknown
          method: string
          path: string
          query_params: Json | null
          response_time_ms: number | null
          status_code: number
          user_agent: string | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          method: string
          path: string
          query_params?: Json | null
          response_time_ms?: number | null
          status_code: number
          user_agent?: string | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          ip_address?: unknown
          method?: string
          path?: string
          query_params?: Json | null
          response_time_ms?: number | null
          status_code?: number
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_request_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          alt_text: string | null
          created_at: string | null
          file_path: string
          file_type: string
          file_url: string
          folder: string | null
          height: number | null
          id: string
          mime_type: string | null
          name: string
          site_id: string
          size_bytes: number | null
          tags: string[] | null
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          file_path: string
          file_type: string
          file_url: string
          folder?: string | null
          height?: number | null
          id?: string
          mime_type?: string | null
          name: string
          site_id: string
          size_bytes?: number | null
          tags?: string[] | null
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          file_path?: string
          file_type?: string
          file_url?: string
          folder?: string | null
          height?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          site_id?: string
          size_bytes?: number | null
          tags?: string[] | null
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          generated_html: string | null
          id: string
          model: string | null
          page_id: string | null
          role: string
          site_id: string | null
          tokens_used: number | null
        }
        Insert: {
          content: string
          created_at?: string | null
          generated_html?: string | null
          id?: string
          model?: string | null
          page_id?: string | null
          role: string
          site_id?: string | null
          tokens_used?: number | null
        }
        Update: {
          content?: string
          created_at?: string | null
          generated_html?: string | null
          id?: string
          model?: string | null
          page_id?: string | null
          role?: string
          site_id?: string | null
          tokens_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_components: {
        Row: {
          category: string | null
          created_at: string | null
          default_variant: string | null
          description: string | null
          html: string
          id: string
          name: string
          props: Json | null
          site_id: string
          tags: string[] | null
          thumbnail_url: string | null
          type: string
          updated_at: string | null
          usage_count: number | null
          variants: Json | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          default_variant?: string | null
          description?: string | null
          html: string
          id?: string
          name: string
          props?: Json | null
          site_id: string
          tags?: string[] | null
          thumbnail_url?: string | null
          type: string
          updated_at?: string | null
          usage_count?: number | null
          variants?: Json | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          default_variant?: string | null
          description?: string | null
          html?: string
          id?: string
          name?: string
          props?: Json | null
          site_id?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          type?: string
          updated_at?: string | null
          usage_count?: number | null
          variants?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_components_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      components: {
        Row: {
          category: string | null
          content: Json
          created_at: string | null
          description: string | null
          id: string
          name: string
          site_id: string
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          content: Json
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          site_id: string
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          content?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          site_id?: string
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "components_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      content_types: {
        Row: {
          color: string | null
          created_at: string | null
          default_sort_field: string | null
          default_sort_order: string | null
          description: string | null
          has_archive: boolean | null
          has_author: boolean | null
          has_content: boolean | null
          has_excerpt: boolean | null
          has_featured_image: boolean | null
          has_published_date: boolean | null
          has_seo: boolean | null
          has_single: boolean | null
          has_slug: boolean | null
          has_title: boolean | null
          icon: string | null
          id: string
          label_plural: string
          label_singular: string
          menu_position: number | null
          name: string
          seo_template: Json | null
          show_in_menu: boolean | null
          site_id: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          default_sort_field?: string | null
          default_sort_order?: string | null
          description?: string | null
          has_archive?: boolean | null
          has_author?: boolean | null
          has_content?: boolean | null
          has_excerpt?: boolean | null
          has_featured_image?: boolean | null
          has_published_date?: boolean | null
          has_seo?: boolean | null
          has_single?: boolean | null
          has_slug?: boolean | null
          has_title?: boolean | null
          icon?: string | null
          id?: string
          label_plural: string
          label_singular: string
          menu_position?: number | null
          name: string
          seo_template?: Json | null
          show_in_menu?: boolean | null
          site_id: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          default_sort_field?: string | null
          default_sort_order?: string | null
          description?: string | null
          has_archive?: boolean | null
          has_author?: boolean | null
          has_content?: boolean | null
          has_excerpt?: boolean | null
          has_featured_image?: boolean | null
          has_published_date?: boolean | null
          has_seo?: boolean | null
          has_single?: boolean | null
          has_slug?: boolean | null
          has_title?: boolean | null
          icon?: string | null
          id?: string
          label_plural?: string
          label_singular?: string
          menu_position?: number | null
          name?: string
          seo_template?: Json | null
          show_in_menu?: boolean | null
          site_id?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_types_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      design_variables: {
        Row: {
          borders: Json | null
          colors: Json | null
          created_at: string | null
          id: string
          shadows: Json | null
          site_id: string
          spacing: Json | null
          typography: Json | null
          updated_at: string | null
        }
        Insert: {
          borders?: Json | null
          colors?: Json | null
          created_at?: string | null
          id?: string
          shadows?: Json | null
          site_id: string
          spacing?: Json | null
          typography?: Json | null
          updated_at?: string | null
        }
        Update: {
          borders?: Json | null
          colors?: Json | null
          created_at?: string | null
          id?: string
          shadows?: Json | null
          site_id?: string
          spacing?: Json | null
          typography?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_variables_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      entries: {
        Row: {
          author_id: string | null
          content: string | null
          content_type_id: string
          created_at: string | null
          data: Json | null
          excerpt: string | null
          featured_image_id: string | null
          id: string
          published_at: string | null
          scheduled_at: string | null
          seo: Json | null
          site_id: string
          slug: string | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          author_id?: string | null
          content?: string | null
          content_type_id: string
          created_at?: string | null
          data?: Json | null
          excerpt?: string | null
          featured_image_id?: string | null
          id?: string
          published_at?: string | null
          scheduled_at?: string | null
          seo?: Json | null
          site_id: string
          slug?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string | null
          content?: string | null
          content_type_id?: string
          created_at?: string | null
          data?: Json | null
          excerpt?: string | null
          featured_image_id?: string | null
          id?: string
          published_at?: string | null
          scheduled_at?: string | null
          seo?: Json | null
          site_id?: string
          slug?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "entries_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_content_type_id_fkey"
            columns: ["content_type_id"]
            isOneToOne: false
            referencedRelation: "content_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_featured_image_id_fkey"
            columns: ["featured_image_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entries_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_terms: {
        Row: {
          entry_id: string
          term_id: string
        }
        Insert: {
          entry_id: string
          term_id: string
        }
        Update: {
          entry_id?: string
          term_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_terms_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_terms_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      fields: {
        Row: {
          conditions: Json | null
          content_type_id: string
          created_at: string | null
          id: string
          instructions: string | null
          label: string
          layouts: Json | null
          name: string
          placeholder: string | null
          position: number | null
          required: boolean | null
          settings: Json | null
          site_id: string
          sub_fields: Json | null
          type: string
          updated_at: string | null
          width: string | null
        }
        Insert: {
          conditions?: Json | null
          content_type_id: string
          created_at?: string | null
          id?: string
          instructions?: string | null
          label: string
          layouts?: Json | null
          name: string
          placeholder?: string | null
          position?: number | null
          required?: boolean | null
          settings?: Json | null
          site_id: string
          sub_fields?: Json | null
          type: string
          updated_at?: string | null
          width?: string | null
        }
        Update: {
          conditions?: Json | null
          content_type_id?: string
          created_at?: string | null
          id?: string
          instructions?: string | null
          label?: string
          layouts?: Json | null
          name?: string
          placeholder?: string | null
          position?: number | null
          required?: boolean | null
          settings?: Json | null
          site_id?: string
          sub_fields?: Json | null
          type?: string
          updated_at?: string | null
          width?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fields_content_type_id_fkey"
            columns: ["content_type_id"]
            isOneToOne: false
            referencedRelation: "content_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fields_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          created_at: string | null
          data: Json
          form_name: string | null
          id: string
          ip_address: unknown
          page_id: string | null
          referrer: string | null
          site_id: string
          status: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          data: Json
          form_name?: string | null
          id?: string
          ip_address?: unknown
          page_id?: string | null
          referrer?: string | null
          site_id: string
          status?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json
          form_name?: string | null
          id?: string
          ip_address?: unknown
          page_id?: string | null
          referrer?: string | null
          site_id?: string
          status?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          plan: string | null
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          plan?: string | null
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          plan?: string | null
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pages: {
        Row: {
          content: Json
          created_at: string | null
          html_content: string | null
          id: string
          is_home: boolean | null
          is_published: boolean | null
          name: string
          published_at: string | null
          seo: Json | null
          settings: Json | null
          site_id: string
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          content?: Json
          created_at?: string | null
          html_content?: string | null
          id?: string
          is_home?: boolean | null
          is_published?: boolean | null
          name: string
          published_at?: string | null
          seo?: Json | null
          settings?: Json | null
          site_id: string
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          content?: Json
          created_at?: string | null
          html_content?: string | null
          id?: string
          is_home?: boolean | null
          is_published?: boolean | null
          name?: string
          published_at?: string | null
          seo?: Json | null
          settings?: Json | null
          site_id?: string
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pages_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          organization_id: string | null
          preferences: Json | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          organization_id?: string | null
          preferences?: Json | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          organization_id?: string | null
          preferences?: Json | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_templates: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          example_output: string | null
          id: string
          is_public: boolean | null
          name: string
          organization_id: string | null
          prompt_template: string
          thumbnail_url: string | null
          updated_at: string | null
          variables: Json | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          example_output?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          organization_id?: string | null
          prompt_template: string
          thumbnail_url?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          example_output?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          organization_id?: string | null
          prompt_template?: string
          thumbnail_url?: string | null
          updated_at?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "prompt_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          created_at: string | null
          custom_domain: string | null
          description: string | null
          id: string
          integrations: Json | null
          name: string
          organization_id: string
          published_at: string | null
          seo: Json | null
          seo_settings: Json | null
          settings: Json | null
          slug: string
          status: string | null
          subdomain: string | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          custom_domain?: string | null
          description?: string | null
          id?: string
          integrations?: Json | null
          name: string
          organization_id: string
          published_at?: string | null
          seo?: Json | null
          seo_settings?: Json | null
          settings?: Json | null
          slug: string
          status?: string | null
          subdomain?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          custom_domain?: string | null
          description?: string | null
          id?: string
          integrations?: Json | null
          name?: string
          organization_id?: string
          published_at?: string | null
          seo?: Json | null
          seo_settings?: Json | null
          settings?: Json | null
          slug?: string
          status?: string | null
          subdomain?: string | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      taxonomies: {
        Row: {
          content_type_ids: string[] | null
          created_at: string | null
          hierarchical: boolean | null
          id: string
          label_plural: string
          label_singular: string
          name: string
          site_id: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          content_type_ids?: string[] | null
          created_at?: string | null
          hierarchical?: boolean | null
          id?: string
          label_plural: string
          label_singular: string
          name: string
          site_id: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          content_type_ids?: string[] | null
          created_at?: string | null
          hierarchical?: boolean | null
          id?: string
          label_plural?: string
          label_singular?: string
          name?: string
          site_id?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "taxonomies_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          conditions: Json | null
          created_at: string | null
          description: string | null
          html: string
          id: string
          is_default: boolean | null
          name: string
          priority: number | null
          site_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          html: string
          id?: string
          is_default?: boolean | null
          name: string
          priority?: number | null
          site_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          html?: string
          id?: string
          is_default?: boolean | null
          name?: string
          priority?: number | null
          site_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "templates_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      terms: {
        Row: {
          created_at: string | null
          data: Json | null
          description: string | null
          id: string
          image_id: string | null
          name: string
          parent_id: string | null
          position: number | null
          slug: string
          taxonomy_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          description?: string | null
          id?: string
          image_id?: string | null
          name: string
          parent_id?: string | null
          position?: number | null
          slug: string
          taxonomy_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          description?: string | null
          id?: string
          image_id?: string | null
          name?: string
          parent_id?: string | null
          position?: number | null
          slug?: string
          taxonomy_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "terms_image_id_fkey"
            columns: ["image_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "terms_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "terms_taxonomy_id_fkey"
            columns: ["taxonomy_id"]
            isOneToOne: false
            referencedRelation: "taxonomies"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          attempt: number | null
          created_at: string | null
          error_message: string | null
          event: string
          id: string
          next_retry_at: string | null
          payload: Json
          response_body: string | null
          response_headers: Json | null
          response_time_ms: number | null
          status_code: number | null
          success: boolean | null
          webhook_id: string
        }
        Insert: {
          attempt?: number | null
          created_at?: string | null
          error_message?: string | null
          event: string
          id?: string
          next_retry_at?: string | null
          payload: Json
          response_body?: string | null
          response_headers?: Json | null
          response_time_ms?: number | null
          status_code?: number | null
          success?: boolean | null
          webhook_id: string
        }
        Update: {
          attempt?: number | null
          created_at?: string | null
          error_message?: string | null
          event?: string
          id?: string
          next_retry_at?: string | null
          payload?: Json
          response_body?: string | null
          response_headers?: Json | null
          response_time_ms?: number | null
          status_code?: number | null
          success?: boolean | null
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string | null
          events: string[]
          failure_count: number | null
          headers: Json | null
          id: string
          is_active: boolean | null
          last_status_code: number | null
          last_triggered_at: string | null
          max_retries: number | null
          retry_delay_seconds: number | null
          secret: string
          site_id: string
          success_count: number | null
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          events: string[]
          failure_count?: number | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          last_status_code?: number | null
          last_triggered_at?: string | null
          max_retries?: number | null
          retry_delay_seconds?: number | null
          secret: string
          site_id: string
          success_count?: number | null
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          events?: string[]
          failure_count?: number | null
          headers?: Json | null
          id?: string
          is_active?: boolean | null
          last_status_code?: number | null
          last_triggered_at?: string | null
          max_retries?: number | null
          retry_delay_seconds?: number | null
          secret?: string
          site_id?: string
          success_count?: number | null
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_api_rate_limit: {
        Args: { target_api_key_id: string }
        Returns: boolean
      }
      cleanup_old_logs: { Args: never; Returns: undefined }
      count_unread_submissions: {
        Args: { target_site_id: string }
        Returns: number
      }
      create_default_design_variables: {
        Args: { target_site_id: string }
        Returns: string
      }
      delete_site_cascade: {
        Args: { target_site_id: string }
        Returns: undefined
      }
      duplicate_content_type: {
        Args: {
          new_name: string
          new_slug: string
          source_content_type_id: string
        }
        Returns: string
      }
      duplicate_page: {
        Args: { new_name?: string; source_page_id: string }
        Returns: string
      }
      duplicate_site: {
        Args: { new_name: string; new_slug: string; source_site_id: string }
        Returns: string
      }
      generate_api_key_prefix: { Args: never; Returns: string }
      get_active_webhooks: {
        Args: { event_type: string; target_site_id: string }
        Returns: {
          created_at: string | null
          events: string[]
          failure_count: number | null
          headers: Json | null
          id: string
          is_active: boolean | null
          last_status_code: number | null
          last_triggered_at: string | null
          max_retries: number | null
          retry_delay_seconds: number | null
          secret: string
          site_id: string
          success_count: number | null
          updated_at: string | null
          url: string
        }[]
        SetofOptions: {
          from: "*"
          to: "webhooks"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_content_type_fields: {
        Args: { target_content_type_id: string }
        Returns: {
          conditions: Json | null
          content_type_id: string
          created_at: string | null
          id: string
          instructions: string | null
          label: string
          layouts: Json | null
          name: string
          placeholder: string | null
          position: number | null
          required: boolean | null
          settings: Json | null
          site_id: string
          sub_fields: Json | null
          type: string
          updated_at: string | null
          width: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "fields"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_entries_count: {
        Args: { target_content_type_id: string }
        Returns: number
      }
      get_recent_activity: {
        Args: { limit_count?: number; target_site_id: string }
        Returns: {
          action: string
          created_at: string
          details: Json
          id: string
          user_avatar: string
          user_name: string
        }[]
      }
      get_site_stats: { Args: { target_site_id: string }; Returns: Json }
      increment_component_usage: {
        Args: { component_id: string }
        Returns: undefined
      }
      log_activity: {
        Args: {
          p_action: string
          p_details?: Json
          p_organization_id: string
          p_page_id: string
          p_site_id: string
          p_user_id: string
        }
        Returns: string
      }
      mark_submissions_read: {
        Args: { submission_ids: string[] }
        Returns: undefined
      }
      publish_entry: { Args: { target_entry_id: string }; Returns: undefined }
      publish_page: { Args: { target_page_id: string }; Returns: undefined }
      publish_site: { Args: { target_site_id: string }; Returns: undefined }
      reorder_fields: {
        Args: { field_order: string[]; target_content_type_id: string }
        Returns: undefined
      }
      reorder_pages: {
        Args: { page_order: string[]; target_site_id: string }
        Returns: undefined
      }
      set_home_page: {
        Args: { target_page_id: string; target_site_id: string }
        Returns: undefined
      }
      unpublish_entry: { Args: { target_entry_id: string }; Returns: undefined }
      unpublish_page: { Args: { target_page_id: string }; Returns: undefined }
      unpublish_site: { Args: { target_site_id: string }; Returns: undefined }
      update_api_key_usage: {
        Args: { client_ip?: unknown; target_api_key_id: string }
        Returns: undefined
      }
      update_webhook_stats: {
        Args: {
          http_status: number
          target_webhook_id: string
          was_success: boolean
        }
        Returns: undefined
      }
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
