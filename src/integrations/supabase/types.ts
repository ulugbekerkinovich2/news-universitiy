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
      media_assets: {
        Row: {
          created_at: string
          height: number | null
          id: string
          original_url: string
          post_id: string | null
          provider: string | null
          stored_url: string | null
          type: Database["public"]["Enums"]["media_type"]
          width: number | null
        }
        Insert: {
          created_at?: string
          height?: number | null
          id?: string
          original_url: string
          post_id?: string | null
          provider?: string | null
          stored_url?: string | null
          type?: Database["public"]["Enums"]["media_type"]
          width?: number | null
        }
        Update: {
          created_at?: string
          height?: number | null
          id?: string
          original_url?: string
          post_id?: string | null
          provider?: string | null
          stored_url?: string | null
          type?: Database["public"]["Enums"]["media_type"]
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "news_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      news_posts: {
        Row: {
          canonical_url: string | null
          content_html: string | null
          content_text: string | null
          cover_image_id: string | null
          created_at: string
          hash_fingerprint: string | null
          id: string
          language: string | null
          published_at: string | null
          slug: string
          source_url: string
          summary: string | null
          title: string
          university_id: string
          updated_at: string
        }
        Insert: {
          canonical_url?: string | null
          content_html?: string | null
          content_text?: string | null
          cover_image_id?: string | null
          created_at?: string
          hash_fingerprint?: string | null
          id?: string
          language?: string | null
          published_at?: string | null
          slug: string
          source_url: string
          summary?: string | null
          title: string
          university_id: string
          updated_at?: string
        }
        Update: {
          canonical_url?: string | null
          content_html?: string | null
          content_text?: string | null
          cover_image_id?: string | null
          created_at?: string
          hash_fingerprint?: string | null
          id?: string
          language?: string | null
          published_at?: string | null
          slug?: string
          source_url?: string
          summary?: string | null
          title?: string
          university_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_cover_image"
            columns: ["cover_image_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "news_posts_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scrape_job_events: {
        Row: {
          counters_json: Json | null
          id: string
          job_id: string
          message: string | null
          stage: Database["public"]["Enums"]["scrape_stage"]
          timestamp: string
          university_id: string | null
        }
        Insert: {
          counters_json?: Json | null
          id?: string
          job_id: string
          message?: string | null
          stage: Database["public"]["Enums"]["scrape_stage"]
          timestamp?: string
          university_id?: string | null
        }
        Update: {
          counters_json?: Json | null
          id?: string
          job_id?: string
          message?: string | null
          stage?: Database["public"]["Enums"]["scrape_stage"]
          timestamp?: string
          university_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scrape_job_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "scrape_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scrape_job_events_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      scrape_jobs: {
        Row: {
          created_at: string
          finished_at: string | null
          id: string
          scope: Database["public"]["Enums"]["job_scope"]
          started_at: string | null
          status: Database["public"]["Enums"]["job_status"]
          totals_json: Json | null
          university_id: string | null
        }
        Insert: {
          created_at?: string
          finished_at?: string | null
          id?: string
          scope?: Database["public"]["Enums"]["job_scope"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          totals_json?: Json | null
          university_id?: string | null
        }
        Update: {
          created_at?: string
          finished_at?: string | null
          id?: string
          scope?: Database["public"]["Enums"]["job_scope"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          totals_json?: Json | null
          university_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scrape_jobs_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "universities"
            referencedColumns: ["id"]
          },
        ]
      }
      universities: {
        Row: {
          created_at: string
          id: string
          last_error_message: string | null
          last_scraped_at: string | null
          name_en: string | null
          name_ru: string | null
          name_uz: string
          region_id: string | null
          scrape_status: Database["public"]["Enums"]["scrape_status"]
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          id: string
          last_error_message?: string | null
          last_scraped_at?: string | null
          name_en?: string | null
          name_ru?: string | null
          name_uz: string
          region_id?: string | null
          scrape_status?: Database["public"]["Enums"]["scrape_status"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          last_error_message?: string | null
          last_scraped_at?: string | null
          name_en?: string | null
          name_ru?: string | null
          name_uz?: string
          region_id?: string | null
          scrape_status?: Database["public"]["Enums"]["scrape_status"]
          updated_at?: string
          website?: string | null
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
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      job_scope: "ALL_UNIVERSITIES" | "SINGLE_UNIVERSITY"
      job_status: "QUEUED" | "RUNNING" | "DONE" | "FAILED" | "CANCELLED"
      media_type: "image" | "video"
      scrape_stage:
        | "DISCOVER"
        | "CRAWL"
        | "PARSE"
        | "SAVE_POSTS"
        | "SAVE_MEDIA"
        | "DONE"
      scrape_status:
        | "IDLE"
        | "IN_PROGRESS"
        | "DONE"
        | "FAILED"
        | "NO_SOURCE"
        | "NO_NEWS"
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
      job_scope: ["ALL_UNIVERSITIES", "SINGLE_UNIVERSITY"],
      job_status: ["QUEUED", "RUNNING", "DONE", "FAILED", "CANCELLED"],
      media_type: ["image", "video"],
      scrape_stage: [
        "DISCOVER",
        "CRAWL",
        "PARSE",
        "SAVE_POSTS",
        "SAVE_MEDIA",
        "DONE",
      ],
      scrape_status: [
        "IDLE",
        "IN_PROGRESS",
        "DONE",
        "FAILED",
        "NO_SOURCE",
        "NO_NEWS",
      ],
    },
  },
} as const
