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
      access_codes: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          code: string
          created_at: string
          created_by: string | null
          department_id: string
          duration_days: number
          expires_at: string | null
          id: string
          is_active: boolean
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          department_id: string
          duration_days?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          department_id?: string
          duration_days?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "access_codes_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      code_activation_attempts: {
        Row: {
          attempted_at: string
          id: string
          success: boolean
          user_id: string
        }
        Insert: {
          attempted_at?: string
          id?: string
          success?: boolean
          user_id: string
        }
        Update: {
          attempted_at?: string
          id?: string
          success?: boolean
          user_id?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          created_at: string
          description_ar: string | null
          description_en: string | null
          icon: string | null
          id: string
          name_ar: string
          name_en: string
          order_index: number
          slug: Database["public"]["Enums"]["department_slug"]
          theme_color: string
        }
        Insert: {
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          icon?: string | null
          id?: string
          name_ar: string
          name_en: string
          order_index?: number
          slug: Database["public"]["Enums"]["department_slug"]
          theme_color?: string
        }
        Update: {
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          icon?: string | null
          id?: string
          name_ar?: string
          name_en?: string
          order_index?: number
          slug?: Database["public"]["Enums"]["department_slug"]
          theme_color?: string
        }
        Relationships: []
      }
      lectures: {
        Row: {
          created_at: string
          description_ar: string | null
          description_en: string | null
          id: string
          order_index: number
          subject_id: string
          title_ar: string
          title_en: string
          uploaded_by: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          order_index?: number
          subject_id: string
          title_ar: string
          title_en: string
          uploaded_by?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          order_index?: number
          subject_id?: string
          title_ar?: string
          title_en?: string
          uploaded_by?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lectures_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
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
          preferred_language: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          preferred_language?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          preferred_language?: string
          updated_at?: string
        }
        Relationships: []
      }
      sections: {
        Row: {
          content_ar: string | null
          content_en: string | null
          content_url: string | null
          created_at: string
          id: string
          order_index: number
          subject_id: string
          title_ar: string
          title_en: string
          uploaded_by: string | null
        }
        Insert: {
          content_ar?: string | null
          content_en?: string | null
          content_url?: string | null
          created_at?: string
          id?: string
          order_index?: number
          subject_id: string
          title_ar: string
          title_en: string
          uploaded_by?: string | null
        }
        Update: {
          content_ar?: string | null
          content_en?: string | null
          content_url?: string | null
          created_at?: string
          id?: string
          order_index?: number
          subject_id?: string
          title_ar?: string
          title_en?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sections_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      student_access: {
        Row: {
          activated_at: string
          code_id: string | null
          created_at: string
          department_id: string
          expires_at: string
          id: string
          revoked: boolean
          student_id: string
        }
        Insert: {
          activated_at?: string
          code_id?: string | null
          created_at?: string
          department_id: string
          expires_at: string
          id?: string
          revoked?: boolean
          student_id: string
        }
        Update: {
          activated_at?: string
          code_id?: string | null
          created_at?: string
          department_id?: string
          expires_at?: string
          id?: string
          revoked?: boolean
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_access_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "access_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_access_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      student_progress: {
        Row: {
          completed: boolean
          id: string
          last_accessed: string
          lecture_id: string
          student_id: string
        }
        Insert: {
          completed?: boolean
          id?: string
          last_accessed?: string
          lecture_id: string
          student_id: string
        }
        Update: {
          completed?: boolean
          id?: string
          last_accessed?: string
          lecture_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_progress_lecture_id_fkey"
            columns: ["lecture_id"]
            isOneToOne: false
            referencedRelation: "lectures"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          created_by: string | null
          department_id: string
          description_ar: string | null
          description_en: string | null
          id: string
          name_ar: string
          name_en: string
          order_index: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department_id: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          name_ar: string
          name_en: string
          order_index?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department_id?: string
          description_ar?: string | null
          description_en?: string | null
          id?: string
          name_ar?: string
          name_en?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "subjects_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      summaries: {
        Row: {
          content_ar: string | null
          content_en: string | null
          created_at: string
          file_url: string | null
          id: string
          order_index: number
          subject_id: string
          title_ar: string
          title_en: string
          uploaded_by: string | null
        }
        Insert: {
          content_ar?: string | null
          content_en?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          order_index?: number
          subject_id: string
          title_ar: string
          title_en: string
          uploaded_by?: string | null
        }
        Update: {
          content_ar?: string | null
          content_en?: string | null
          created_at?: string
          file_url?: string | null
          id?: string
          order_index?: number
          subject_id?: string
          title_ar?: string
          title_en?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "summaries_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          department_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          department_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
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
      has_valid_access: {
        Args: { _department_id: string; _user_id: string }
        Returns: boolean
      }
      is_admin_of_department: {
        Args: { _department_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "student"
      department_slug: "food-safety" | "biotechnology"
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
      app_role: ["super_admin", "admin", "student"],
      department_slug: ["food-safety", "biotechnology"],
    },
  },
} as const
