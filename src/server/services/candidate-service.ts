import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/db/database.types";

/**
 * Services hold business logic and own all direct table queries for their
 * domain. Routers (in `api/routers/`) call into services — they never
 * write `.from("table")` themselves. This is the boundary the architecture
 * plan calls out: it lets us swap the router transport (tRPC -> REST -> a
 * standalone service) without touching the logic underneath, and it keeps
 * Zod-validated inputs as the only thing that reaches the database.
 */

type DB = SupabaseClient<Database>;

export async function getCandidateProfile(db: DB, userId: string) {
  const { data, error } = await db
    .from("candidate_profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateCandidateProfile(
  db: DB,
  userId: string,
  input: {
    education?: string;
    skills?: string[];
    interests?: string[];
    careerGoals?: string;
  },
) {
  const { data, error } = await db
    .from("candidate_profiles")
    .update({
      education: input.education,
      skills: input.skills,
      interests: input.interests,
      career_goals: input.careerGoals,
    })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
