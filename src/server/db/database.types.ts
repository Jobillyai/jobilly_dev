/**
 * Hand-written to match `supabase/migrations/*.sql` so Phase 0 has real type
 * safety before a live project exists. Once your Supabase project is up and
 * migrations are applied, run:
 *
 *   npm run db:generate-types
 *
 * That calls `supabase gen types typescript` against the live schema and
 * overwrites this file. Do not hand-edit after that point — keep this file
 * and the migrations in sync until then.
 */
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          role:
            | "subscribed_candidate"
            | "free_candidate"
            | "employee"
            | "admin"
            | "institution_admin"
            | "institution_candidate";
          mfa_enabled: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          role?: Database["public"]["Tables"]["users"]["Row"]["role"];
          mfa_enabled?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };
      candidate_profiles: {
        Row: {
          user_id: string;
          education: string | null;
          skills: string[];
          interests: string[];
          career_goals: string | null;
          resume_url: string | null;
          linkedin_url: string | null;
          subscription_status: "none" | "active" | "past_due" | "cancelled";
          assigned_employee_id: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          education?: string | null;
          skills?: string[];
          interests?: string[];
          career_goals?: string | null;
          resume_url?: string | null;
          linkedin_url?: string | null;
          subscription_status?: Database["public"]["Tables"]["candidate_profiles"]["Row"]["subscription_status"];
          assigned_employee_id?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["candidate_profiles"]["Insert"]
        >;
        Relationships: [];
      };
      employee_profiles: {
        Row: {
          user_id: string;
          assigned_candidate_ids: string[];
          department: string | null;
        };
        Insert: {
          user_id: string;
          assigned_candidate_ids?: string[];
          department?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["employee_profiles"]["Insert"]
        >;
        Relationships: [];
      };
      career_advisory_intakes: {
        Row: {
          id: string;
          candidate_id: string;
          name: string;
          email: string;
          phone: string;
          graduation_details: string;
          branch: string;
          is_veteran: boolean;
          interested_technology: string;
          google_meet_link: string | null;
          session_scheduled_at: string | null;
          invite_sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          name: string;
          email: string;
          phone: string;
          graduation_details: string;
          branch: string;
          is_veteran?: boolean;
          interested_technology: string;
          google_meet_link?: string | null;
          session_scheduled_at?: string | null;
          invite_sent_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["career_advisory_intakes"]["Insert"]
        >;
        Relationships: [];
      };
      scraped_jobs: {
        Row: {
          id: string;
          candidate_id: string;
          employee_id: string;
          company: string;
          role: string;
          job_url: string;
          jd_text: string | null;
          relevance_score: number | null;
          selected: boolean;
          scraped_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          employee_id: string;
          company: string;
          role: string;
          job_url: string;
          jd_text?: string | null;
          relevance_score?: number | null;
          selected?: boolean;
          scraped_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["scraped_jobs"]["Insert"]>;
        Relationships: [];
      };
      // Remaining tables (mentor_profiles, institutions, advisory_sessions,
      // learning_*, quiz_*, sandbox_*, company_personas, interview_*,
      // job_*, application_profile, scraped_jobs, recruiter_messages,
      // cover_letter_templates, audit_log) follow the same Row/Insert/Update
      // shape as their columns in supabase/migrations/0002-0007. Add them
      // here as each feature phase starts touching them, or simply run
      // `npm run db:generate-types` against a live project to get all of
      // them generated automatically instead of hand-writing the rest.
    };
    Views: Record<string, never>;
    Functions: {
      current_user_role: {
        Args: Record<string, never>;
        Returns: string;
      };
      is_staff: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role:
        | "subscribed_candidate"
        | "free_candidate"
        | "employee"
        | "admin"
        | "institution_admin"
        | "institution_candidate";
      subscription_status: "none" | "active" | "past_due" | "cancelled";
      session_status: "scheduled" | "completed" | "cancelled" | "no_show";
      application_status:
        | "queued"
        | "applied"
        | "interviewing"
        | "rejected"
        | "offer"
        | "withdrawn";
    };
  };
};

