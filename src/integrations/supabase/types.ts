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
      agent_applications: {
        Row: {
          business_name: string
          contact_person: string
          created_at: string
          email: string
          id: string
          message: string | null
          phone: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          business_name: string
          contact_person: string
          created_at?: string
          email: string
          id?: string
          message?: string | null
          phone: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          business_name?: string
          contact_person?: string
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          phone?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      agent_clients: {
        Row: {
          agent_id: string
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string
          gender: string | null
          id: string
          notes: string | null
          passport_expiry: string | null
          passport_number: string | null
          phone: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          gender?: string | null
          id?: string
          notes?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          phone: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          notes?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_clients_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          agent_code: string
          business_name: string
          commission_rate: number
          contact_person: string
          created_at: string
          email: string
          id: string
          phone: string
          status: Database["public"]["Enums"]["agent_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_code: string
          business_name: string
          commission_rate?: number
          contact_person: string
          created_at?: string
          email: string
          id?: string
          phone: string
          status?: Database["public"]["Enums"]["agent_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_code?: string
          business_name?: string
          commission_rate?: number
          contact_person?: string
          created_at?: string
          email?: string
          id?: string
          phone?: string
          status?: Database["public"]["Enums"]["agent_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          agent_client_id: string | null
          agent_id: string | null
          created_at: string
          date_of_birth: string | null
          departure_city: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          full_name: string
          gender: string | null
          id: string
          package_date_id: string | null
          package_id: string
          passport_expiry: string | null
          passport_number: string | null
          reference: string | null
          room_preference: string | null
          special_requests: string | null
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_client_id?: string | null
          agent_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          departure_city?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          full_name: string
          gender?: string | null
          id?: string
          package_date_id?: string | null
          package_id: string
          passport_expiry?: string | null
          passport_number?: string | null
          reference?: string | null
          room_preference?: string | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_client_id?: string | null
          agent_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          departure_city?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          package_date_id?: string | null
          package_id?: string
          passport_expiry?: string | null
          passport_number?: string | null
          reference?: string | null
          room_preference?: string | null
          special_requests?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_agent_client_id_fkey"
            columns: ["agent_client_id"]
            isOneToOne: false
            referencedRelation: "agent_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_package_date_id_fkey"
            columns: ["package_date_id"]
            isOneToOne: false
            referencedRelation: "package_dates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          booking_id: string | null
          file_name: string | null
          file_url: string
          id: string
          type: Database["public"]["Enums"]["document_type"]
          uploaded_at: string
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          file_name?: string | null
          file_url: string
          id?: string
          type: Database["public"]["Enums"]["document_type"]
          uploaded_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string | null
          file_name?: string | null
          file_url?: string
          id?: string
          type?: Database["public"]["Enums"]["document_type"]
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      package_accommodations: {
        Row: {
          city: string
          distance_from_haram: string | null
          distance_from_masjid: string | null
          hotel: string
          id: string
          package_id: string
          rating: number
          room_types: string[] | null
        }
        Insert: {
          city: string
          distance_from_haram?: string | null
          distance_from_masjid?: string | null
          hotel: string
          id?: string
          package_id: string
          rating?: number
          room_types?: string[] | null
        }
        Update: {
          city?: string
          distance_from_haram?: string | null
          distance_from_masjid?: string | null
          hotel?: string
          id?: string
          package_id?: string
          rating?: number
          room_types?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "package_accommodations_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      package_dates: {
        Row: {
          airline: string | null
          id: string
          islamic_date: string | null
          islamic_return_date: string | null
          outbound: string
          outbound_route: string | null
          package_id: string
          return_date: string
          return_route: string | null
        }
        Insert: {
          airline?: string | null
          id?: string
          islamic_date?: string | null
          islamic_return_date?: string | null
          outbound: string
          outbound_route?: string | null
          package_id: string
          return_date: string
          return_route?: string | null
        }
        Update: {
          airline?: string | null
          id?: string
          islamic_date?: string | null
          islamic_return_date?: string | null
          outbound?: string
          outbound_route?: string | null
          package_id?: string
          return_date?: string
          return_route?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "package_dates_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          agent_discount: number
          airlines: string[] | null
          available: number
          capacity: number
          category: Database["public"]["Enums"]["package_category"]
          created_at: string
          currency: string
          departure_cities: string[] | null
          deposit_allowed: boolean
          description: string | null
          duration: string | null
          featured: boolean
          id: string
          image_url: string | null
          inclusions: string[] | null
          minimum_deposit: number | null
          name: string
          price: number
          season: string | null
          status: Database["public"]["Enums"]["package_status"]
          type: Database["public"]["Enums"]["package_type"]
          updated_at: string
          year: number
        }
        Insert: {
          agent_discount?: number
          airlines?: string[] | null
          available?: number
          capacity?: number
          category: Database["public"]["Enums"]["package_category"]
          created_at?: string
          currency?: string
          departure_cities?: string[] | null
          deposit_allowed?: boolean
          description?: string | null
          duration?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          inclusions?: string[] | null
          minimum_deposit?: number | null
          name: string
          price: number
          season?: string | null
          status?: Database["public"]["Enums"]["package_status"]
          type: Database["public"]["Enums"]["package_type"]
          updated_at?: string
          year: number
        }
        Update: {
          agent_discount?: number
          airlines?: string[] | null
          available?: number
          capacity?: number
          category?: Database["public"]["Enums"]["package_category"]
          created_at?: string
          currency?: string
          departure_cities?: string[] | null
          deposit_allowed?: boolean
          description?: string | null
          duration?: string | null
          featured?: boolean
          id?: string
          image_url?: string | null
          inclusions?: string[] | null
          minimum_deposit?: number | null
          name?: string
          price?: number
          season?: string | null
          status?: Database["public"]["Enums"]["package_status"]
          type?: Database["public"]["Enums"]["package_type"]
          updated_at?: string
          year?: number
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          paystack_reference: string | null
          proof_of_payment_url: string | null
          status: Database["public"]["Enums"]["payment_status"]
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paystack_reference?: string | null
          proof_of_payment_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paystack_reference?: string | null
          proof_of_payment_url?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          language_preference: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          language_preference?: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          language_preference?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      agent_status: "active" | "suspended" | "pending"
      app_role: "admin" | "moderator" | "agent" | "user"
      booking_status: "pending" | "confirmed" | "cancelled" | "completed"
      document_type:
        | "passport"
        | "vaccine_certificate"
        | "visa"
        | "flight_ticket"
        | "hotel_voucher"
        | "booking_confirmation"
        | "payment_receipt"
        | "pre_departure_guide"
      package_category: "premium" | "standard" | "budget"
      package_status: "active" | "draft" | "archived"
      package_type: "hajj" | "umrah"
      payment_method: "paystack" | "bank_transfer" | "ussd"
      payment_status: "pending" | "verified" | "rejected" | "refunded"
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
      agent_status: ["active", "suspended", "pending"],
      app_role: ["admin", "moderator", "agent", "user"],
      booking_status: ["pending", "confirmed", "cancelled", "completed"],
      document_type: [
        "passport",
        "vaccine_certificate",
        "visa",
        "flight_ticket",
        "hotel_voucher",
        "booking_confirmation",
        "payment_receipt",
        "pre_departure_guide",
      ],
      package_category: ["premium", "standard", "budget"],
      package_status: ["active", "draft", "archived"],
      package_type: ["hajj", "umrah"],
      payment_method: ["paystack", "bank_transfer", "ussd"],
      payment_status: ["pending", "verified", "rejected", "refunded"],
    },
  },
} as const
