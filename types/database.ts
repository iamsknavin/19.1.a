/**
 * Auto-generated types for Supabase database schema.
 * Regenerate with: npx supabase gen types typescript --project-id uuridzmajcooiwcpoyyt
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      assets_declarations: {
        Row: {
          agricultural_land: number | null
          bank_deposits: number | null
          bonds_debentures: number | null
          buildings: number | null
          cash_in_hand: number | null
          created_at: string | null
          declaration_year: number
          election_id: string | null
          id: string
          jewelry_gold: number | null
          lic_policies: number | null
          motor_vehicles: number | null
          net_worth: number | null
          non_agricultural_land: number | null
          nsc_postal: number | null
          other_immovable: number | null
          other_movable: number | null
          personal_loans_given: number | null
          politician_id: string
          raw_affidavit_url: string | null
          source_type: string | null
          source_url: string | null
          spouse_total_assets: number | null
          spouse_total_liabilities: number | null
          total_assets: number | null
          total_immovable_assets: number | null
          total_liabilities: number | null
          total_movable_assets: number | null
          verified: boolean | null
        }
        Insert: {
          agricultural_land?: number | null
          bank_deposits?: number | null
          bonds_debentures?: number | null
          buildings?: number | null
          cash_in_hand?: number | null
          created_at?: string | null
          declaration_year: number
          election_id?: string | null
          id?: string
          jewelry_gold?: number | null
          lic_policies?: number | null
          motor_vehicles?: number | null
          net_worth?: number | null
          non_agricultural_land?: number | null
          nsc_postal?: number | null
          other_immovable?: number | null
          other_movable?: number | null
          personal_loans_given?: number | null
          politician_id: string
          raw_affidavit_url?: string | null
          source_type?: string | null
          source_url?: string | null
          spouse_total_assets?: number | null
          spouse_total_liabilities?: number | null
          total_assets?: number | null
          total_immovable_assets?: number | null
          total_liabilities?: number | null
          total_movable_assets?: number | null
          verified?: boolean | null
        }
        Update: {
          agricultural_land?: number | null
          bank_deposits?: number | null
          bonds_debentures?: number | null
          buildings?: number | null
          cash_in_hand?: number | null
          created_at?: string | null
          declaration_year?: number
          election_id?: string | null
          id?: string
          jewelry_gold?: number | null
          lic_policies?: number | null
          motor_vehicles?: number | null
          net_worth?: number | null
          non_agricultural_land?: number | null
          nsc_postal?: number | null
          other_immovable?: number | null
          other_movable?: number | null
          personal_loans_given?: number | null
          politician_id?: string
          raw_affidavit_url?: string | null
          source_type?: string | null
          source_url?: string | null
          spouse_total_assets?: number | null
          spouse_total_liabilities?: number | null
          total_assets?: number | null
          total_immovable_assets?: number | null
          total_liabilities?: number | null
          total_movable_assets?: number | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "assets_declarations_election_id_fkey"
            columns: ["election_id"]
            isOneToOne: false
            referencedRelation: "election_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_declarations_politician_id_fkey"
            columns: ["politician_id"]
            isOneToOne: false
            referencedRelation: "politicians"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          attendance_percent: number | null
          bills_introduced: number | null
          created_at: string | null
          days_present: number | null
          debates_participated: number | null
          id: string
          politician_id: string
          questions_asked: number | null
          session_name: string | null
          session_year: number | null
          source_url: string | null
          total_days: number | null
        }
        Insert: {
          attendance_percent?: number | null
          bills_introduced?: number | null
          created_at?: string | null
          days_present?: number | null
          debates_participated?: number | null
          id?: string
          politician_id: string
          questions_asked?: number | null
          session_name?: string | null
          session_year?: number | null
          source_url?: string | null
          total_days?: number | null
        }
        Update: {
          attendance_percent?: number | null
          bills_introduced?: number | null
          created_at?: string | null
          days_present?: number | null
          debates_participated?: number | null
          id?: string
          politician_id?: string
          questions_asked?: number | null
          session_name?: string | null
          session_year?: number | null
          source_url?: string | null
          total_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_politician_id_fkey"
            columns: ["politician_id"]
            isOneToOne: false
            referencedRelation: "politicians"
            referencedColumns: ["id"]
          },
        ]
      }
      company_interests: {
        Row: {
          cin: string | null
          company_name: string | null
          company_status: string | null
          company_type: string | null
          created_at: string | null
          has_govt_contracts: boolean | null
          id: string
          mca_data_url: string | null
          politician_id: string
          role: string | null
          share_percentage: number | null
        }
        Insert: {
          cin?: string | null
          company_name?: string | null
          company_status?: string | null
          company_type?: string | null
          created_at?: string | null
          has_govt_contracts?: boolean | null
          id?: string
          mca_data_url?: string | null
          politician_id: string
          role?: string | null
          share_percentage?: number | null
        }
        Update: {
          cin?: string | null
          company_name?: string | null
          company_status?: string | null
          company_type?: string | null
          created_at?: string | null
          has_govt_contracts?: boolean | null
          id?: string
          mca_data_url?: string | null
          politician_id?: string
          role?: string | null
          share_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_interests_politician_id_fkey"
            columns: ["politician_id"]
            isOneToOne: false
            referencedRelation: "politicians"
            referencedColumns: ["id"]
          },
        ]
      }
      controversies: {
        Row: {
          controversy_type: string | null
          created_at: string | null
          date_of_incident: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          news_links: string[] | null
          politician_id: string
          severity: string | null
          title: string
        }
        Insert: {
          controversy_type?: string | null
          created_at?: string | null
          date_of_incident?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          news_links?: string[] | null
          politician_id: string
          severity?: string | null
          title: string
        }
        Update: {
          controversy_type?: string | null
          created_at?: string | null
          date_of_incident?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          news_links?: string[] | null
          politician_id?: string
          severity?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "controversies_politician_id_fkey"
            columns: ["politician_id"]
            isOneToOne: false
            referencedRelation: "politicians"
            referencedColumns: ["id"]
          },
        ]
      }
      corruption_signals: {
        Row: {
          auto_generated: boolean | null
          created_at: string | null
          evidence_links: string[] | null
          id: string
          is_dismissed: boolean | null
          politician_id: string
          signal_description: string | null
          signal_severity: string | null
          signal_type: string | null
        }
        Insert: {
          auto_generated?: boolean | null
          created_at?: string | null
          evidence_links?: string[] | null
          id?: string
          is_dismissed?: boolean | null
          politician_id: string
          signal_description?: string | null
          signal_severity?: string | null
          signal_type?: string | null
        }
        Update: {
          auto_generated?: boolean | null
          created_at?: string | null
          evidence_links?: string[] | null
          id?: string
          is_dismissed?: boolean | null
          politician_id?: string
          signal_description?: string | null
          signal_severity?: string | null
          signal_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corruption_signals_politician_id_fkey"
            columns: ["politician_id"]
            isOneToOne: false
            referencedRelation: "politicians"
            referencedColumns: ["id"]
          },
        ]
      }
      criminal_cases: {
        Row: {
          case_description: string | null
          case_number: string | null
          case_year: number | null
          conviction_year: number | null
          court_name: string | null
          court_type: string | null
          created_at: string | null
          current_status: string | null
          date_of_filing: string | null
          declaration_year: number | null
          ecourts_case_id: string | null
          id: string
          ipc_sections: string[] | null
          is_heinous: boolean | null
          judge_name: string | null
          last_hearing_date: string | null
          next_hearing_date: string | null
          politician_id: string
          sentence_description: string | null
          source_url: string | null
          state: string | null
        }
        Insert: {
          case_description?: string | null
          case_number?: string | null
          case_year?: number | null
          conviction_year?: number | null
          court_name?: string | null
          court_type?: string | null
          created_at?: string | null
          current_status?: string | null
          date_of_filing?: string | null
          declaration_year?: number | null
          ecourts_case_id?: string | null
          id?: string
          ipc_sections?: string[] | null
          is_heinous?: boolean | null
          judge_name?: string | null
          last_hearing_date?: string | null
          next_hearing_date?: string | null
          politician_id: string
          sentence_description?: string | null
          source_url?: string | null
          state?: string | null
        }
        Update: {
          case_description?: string | null
          case_number?: string | null
          case_year?: number | null
          conviction_year?: number | null
          court_name?: string | null
          court_type?: string | null
          created_at?: string | null
          current_status?: string | null
          date_of_filing?: string | null
          declaration_year?: number | null
          ecourts_case_id?: string | null
          id?: string
          ipc_sections?: string[] | null
          is_heinous?: boolean | null
          judge_name?: string | null
          last_hearing_date?: string | null
          next_hearing_date?: string | null
          politician_id?: string
          sentence_description?: string | null
          source_url?: string | null
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "criminal_cases_politician_id_fkey"
            columns: ["politician_id"]
            isOneToOne: false
            referencedRelation: "politicians"
            referencedColumns: ["id"]
          },
        ]
      }
      election_terms: {
        Row: {
          constituency: string | null
          created_at: string | null
          election_year: number
          house: string | null
          id: string
          margin: number | null
          politician_id: string
          result: string | null
          state: string | null
          vote_share_percent: number | null
          votes_received: number | null
        }
        Insert: {
          constituency?: string | null
          created_at?: string | null
          election_year: number
          house?: string | null
          id?: string
          margin?: number | null
          politician_id: string
          result?: string | null
          state?: string | null
          vote_share_percent?: number | null
          votes_received?: number | null
        }
        Update: {
          constituency?: string | null
          created_at?: string | null
          election_year?: number
          house?: string | null
          id?: string
          margin?: number | null
          politician_id?: string
          result?: string | null
          state?: string | null
          vote_share_percent?: number | null
          votes_received?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "election_terms_politician_id_fkey"
            columns: ["politician_id"]
            isOneToOne: false
            referencedRelation: "politicians"
            referencedColumns: ["id"]
          },
        ]
      }
      fund_usage: {
        Row: {
          created_at: string | null
          financial_year: string | null
          fund_type: string | null
          id: string
          politician_id: string
          projects: Json | null
          source_url: string | null
          total_allocated: number | null
          total_released: number | null
          total_utilized: number | null
          utilization_percent: number | null
        }
        Insert: {
          created_at?: string | null
          financial_year?: string | null
          fund_type?: string | null
          id?: string
          politician_id: string
          projects?: Json | null
          source_url?: string | null
          total_allocated?: number | null
          total_released?: number | null
          total_utilized?: number | null
          utilization_percent?: number | null
        }
        Update: {
          created_at?: string | null
          financial_year?: string | null
          fund_type?: string | null
          id?: string
          politician_id?: string
          projects?: Json | null
          source_url?: string | null
          total_allocated?: number | null
          total_released?: number | null
          total_utilized?: number | null
          utilization_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fund_usage_politician_id_fkey"
            columns: ["politician_id"]
            isOneToOne: false
            referencedRelation: "politicians"
            referencedColumns: ["id"]
          },
        ]
      }
      govt_tenders: {
        Row: {
          award_date: string | null
          company_id: string | null
          conflict_of_interest_flag: boolean | null
          contract_value: number | null
          created_at: string | null
          id: string
          politician_id: string
          source: string | null
          source_url: string | null
          tender_id: string | null
          tender_title: string | null
          tendering_authority: string | null
        }
        Insert: {
          award_date?: string | null
          company_id?: string | null
          conflict_of_interest_flag?: boolean | null
          contract_value?: number | null
          created_at?: string | null
          id?: string
          politician_id: string
          source?: string | null
          source_url?: string | null
          tender_id?: string | null
          tender_title?: string | null
          tendering_authority?: string | null
        }
        Update: {
          award_date?: string | null
          company_id?: string | null
          conflict_of_interest_flag?: boolean | null
          contract_value?: number | null
          created_at?: string | null
          id?: string
          politician_id?: string
          source?: string | null
          source_url?: string | null
          tender_id?: string | null
          tender_title?: string | null
          tendering_authority?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "govt_tenders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_interests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "govt_tenders_politician_id_fkey"
            columns: ["politician_id"]
            isOneToOne: false
            referencedRelation: "politicians"
            referencedColumns: ["id"]
          },
        ]
      }
      parties: {
        Row: {
          abbreviation: string | null
          created_at: string | null
          founded_year: number | null
          id: string
          ideology: string | null
          logo_url: string | null
          name: string
          parent_party_id: string | null
        }
        Insert: {
          abbreviation?: string | null
          created_at?: string | null
          founded_year?: number | null
          id?: string
          ideology?: string | null
          logo_url?: string | null
          name: string
          parent_party_id?: string | null
        }
        Update: {
          abbreviation?: string | null
          created_at?: string | null
          founded_year?: number | null
          id?: string
          ideology?: string | null
          logo_url?: string | null
          name?: string
          parent_party_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parties_parent_party_id_fkey"
            columns: ["parent_party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      politicians: {
        Row: {
          aadhaar_masked: string | null
          constituency: string | null
          contact_email: string | null
          created_at: string | null
          date_of_birth: string | null
          education: string | null
          election_status: string | null
          gender: string | null
          house: string | null
          id: string
          is_active: boolean | null
          latest_net_worth: number | null
          name: string
          name_hindi: string | null
          official_website: string | null
          pan_card_last4: string | null
          party_id: string | null
          profile_image_url: string | null
          slug: string
          social_facebook: string | null
          social_twitter: string | null
          state: string | null
          term_end: string | null
          term_start: string | null
          updated_at: string | null
        }
        Insert: {
          aadhaar_masked?: string | null
          constituency?: string | null
          contact_email?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          education?: string | null
          election_status?: string | null
          gender?: string | null
          house?: string | null
          id?: string
          is_active?: boolean | null
          latest_net_worth?: number | null
          name: string
          name_hindi?: string | null
          official_website?: string | null
          pan_card_last4?: string | null
          party_id?: string | null
          profile_image_url?: string | null
          slug: string
          social_facebook?: string | null
          social_twitter?: string | null
          state?: string | null
          term_end?: string | null
          term_start?: string | null
          updated_at?: string | null
        }
        Update: {
          aadhaar_masked?: string | null
          constituency?: string | null
          contact_email?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          education?: string | null
          election_status?: string | null
          gender?: string | null
          house?: string | null
          id?: string
          is_active?: boolean | null
          latest_net_worth?: number | null
          name?: string
          name_hindi?: string | null
          official_website?: string | null
          pan_card_last4?: string | null
          party_id?: string | null
          profile_image_url?: string | null
          slug?: string
          social_facebook?: string | null
          social_twitter?: string | null
          state?: string | null
          term_end?: string | null
          term_start?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "politicians_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
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

type DatabaseWithoutInternals = Database

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
