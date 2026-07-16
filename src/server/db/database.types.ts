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
          first_name: string | null;
          last_name: string | null;
          role:
            | "subscribed_candidate"
            | "free_candidate"
            | "employee"
            | "admin"
            | "manager"
            | "institution_admin"
            | "institution_candidate";
          mfa_enabled: boolean;
          created_at: string;
          member_id: string | null;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          first_name?: string | null;
          last_name?: string | null;
          role?: Database["public"]["Tables"]["users"]["Row"]["role"];
          mfa_enabled?: boolean;
          member_id?: string | null;
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
          job_search_role: string | null;
          experience_years: number | null;
          gender: string | null;
          graduation_college: string | null;
          graduation_year: number | null;
          specialization: string | null;
          work_experience: string | null;
          location: string | null;
          timezone: string | null;
          analyzed_resume_text: string | null;
          last_applications_digest_date: string | null;
          welcome_email_sent_at: string | null;
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
          job_search_role?: string | null;
          experience_years?: number | null;
          gender?: string | null;
          graduation_college?: string | null;
          graduation_year?: number | null;
          specialization?: string | null;
          work_experience?: string | null;
          location?: string | null;
          timezone?: string | null;
          analyzed_resume_text?: string | null;
          last_applications_digest_date?: string | null;
          welcome_email_sent_at?: string | null;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["candidate_profiles"]["Insert"]
        >;
        Relationships: [];
      };
      job_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan: "mock-interviews" | "job-applications" | "mock-and-job";
          start_date: string;
          end_date: string | null;
          recruiter_id: string | null;
          status: "active" | "past_due" | "cancelled";
          billing_name: string | null;
          billing_email: string | null;
          billing_phone: string | null;
          billing_address_line1: string | null;
          billing_address_line2: string | null;
          billing_city: string | null;
          billing_state: string | null;
          billing_postal_code: string | null;
          billing_country: string;
          source: string;
          paid_at: string | null;
          transaction_reference: string | null;
          receipt_number: string | null;
          amount_usd: number | null;
          currency: string;
          receipt_emailed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan: Database["public"]["Tables"]["job_subscriptions"]["Row"]["plan"];
          start_date?: string;
          end_date?: string | null;
          recruiter_id?: string | null;
          status?: Database["public"]["Tables"]["job_subscriptions"]["Row"]["status"];
          billing_name?: string | null;
          billing_email?: string | null;
          billing_phone?: string | null;
          billing_address_line1?: string | null;
          billing_address_line2?: string | null;
          billing_city?: string | null;
          billing_state?: string | null;
          billing_postal_code?: string | null;
          billing_country?: string;
          source?: string;
          paid_at?: string | null;
          transaction_reference?: string | null;
          receipt_number?: string | null;
          amount_usd?: number | null;
          currency?: string;
          receipt_emailed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["job_subscriptions"]["Insert"]
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
      resume_ats_checks: {
        Row: {
          id: string;
          candidate_id: string;
          target_role: string;
          job_description: string | null;
          resume_text: string;
          resume_url: string | null;
          ats_score: number | null;
          grade: string | null;
          result_json: Record<string, unknown>;
          status: "pending" | "processing" | "completed" | "failed";
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          target_role: string;
          job_description?: string | null;
          resume_text: string;
          resume_url?: string | null;
          ats_score?: number | null;
          grade?: string | null;
          result_json?: Record<string, unknown>;
          status?: "pending" | "processing" | "completed" | "failed";
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["resume_ats_checks"]["Insert"]
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
          apply_url: string | null;
          jd_text: string | null;
          relevance_score: number | null;
          selected: boolean;
          applied: boolean;
          applied_at: string | null;
          location: string | null;
          source: string;
          search_role: string;
          scraped_at: string;
          posted_at: string | null;
          preparation_tips: string | null;
          candidate_viewed_at: string | null;
          application_resume_path: string | null;
          application_resume_file_name: string | null;
        };
        Insert: {
          id?: string;
          candidate_id: string;
          employee_id: string;
          company: string;
          role: string;
          job_url: string;
          apply_url?: string | null;
          jd_text?: string | null;
          relevance_score?: number | null;
          selected?: boolean;
          applied?: boolean;
          applied_at?: string | null;
          location?: string | null;
          source?: string;
          search_role?: string;
          scraped_at?: string;
          posted_at?: string | null;
          preparation_tips?: string | null;
          candidate_viewed_at?: string | null;
          application_resume_path?: string | null;
          application_resume_file_name?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["scraped_jobs"]["Insert"]>;
        Relationships: [];
      };
      job_role_scrapes: {
        Row: {
          candidate_id: string;
          search_role: string;
          source: string;
          last_scraped_at: string;
        };
        Insert: {
          candidate_id: string;
          search_role: string;
          source: string;
          last_scraped_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["job_role_scrapes"]["Insert"]>;
        Relationships: [];
      };
      service_requests: {
        Row: {
          id: string;
          request_type: "contact" | "new_candidate";
          candidate_user_id: string | null;
          first_name: string;
          last_name: string;
          email: string;
          phone: string;
          enquiry: string;
          status: "open" | "assigned" | "closed";
          assigned_mentor_id: string | null;
          assigned_at: string | null;
          assigned_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          request_type?: "contact" | "new_candidate";
          candidate_user_id?: string | null;
          first_name: string;
          last_name: string;
          email: string;
          phone: string;
          enquiry: string;
          status?: "open" | "assigned" | "closed";
          assigned_mentor_id?: string | null;
          assigned_at?: string | null;
          assigned_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["service_requests"]["Insert"]>;
        Relationships: [];
      };
      job_scrape_runs: {
        Row: {
          id: string;
          triggered_by: string | null;
          trigger_type: string;
          candidates_processed: number;
          candidates_scraped: number;
          new_jobs_added: number;
          errors: string[];
          started_at: string;
          finished_at: string | null;
        };
        Insert: {
          id?: string;
          triggered_by?: string | null;
          trigger_type: string;
          candidates_processed?: number;
          candidates_scraped?: number;
          new_jobs_added?: number;
          errors?: string[];
          started_at?: string;
          finished_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["job_scrape_runs"]["Insert"]>;
        Relationships: [];
      };
      admin_daily_updates: {
        Row: {
          id: string;
          employee_id: string;
          work_date: string;
          remarks: string;
          activity_snapshot: Record<string, unknown>;
          submitted_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          work_date: string;
          remarks?: string;
          activity_snapshot?: Record<string, unknown>;
          submitted_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["admin_daily_updates"]["Insert"]>;
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
      is_manager: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      has_managed_applications_plan: {
        Args: { target_candidate_id: string };
        Returns: boolean;
      };
      complete_mock_checkout_transaction: {
        Args: {
          p_user_id: string;
          p_plan: string;
          p_billing_name: string;
          p_billing_email: string;
          p_billing_phone: string;
          p_billing_address_line1: string;
          p_billing_address_line2: string;
          p_billing_city: string;
          p_billing_state: string;
          p_billing_postal_code: string;
          p_billing_country: string;
          p_transaction_reference: string;
          p_receipt_number: string;
          p_amount_usd: number;
          p_paid_at: string;
        };
        Returns: string;
      };
    };
    Enums: {
      user_role:
        | "subscribed_candidate"
        | "free_candidate"
        | "employee"
        | "admin"
        | "manager"
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

