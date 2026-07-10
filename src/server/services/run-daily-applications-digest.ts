import {
  getApplicationsDigestTimezone,
  getLocalDateString,
  getLocalDayBoundsUtc,
} from "@/lib/timezone-day-bounds";
import { createAdminClient } from "@/server/db/supabase-admin";
import {
  resolveDigestRecipientName,
  sendDailyApplicationsDigestEmail,
  type DailyApplicationsDigestJob,
} from "@/server/services/daily-applications-digest-email";
import { isJobrightListing } from "@/server/services/job-market-search";

type AppliedJobRow = {
  candidate_id: string;
  company: string;
  role: string;
  applied_at: string | null;
  source: string | null;
  job_url: string;
};

type CandidateUserRow = {
  email: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
};

type CandidateProfileRow = {
  user_id: string;
  last_applications_digest_date: string | null;
};

export type RunDailyApplicationsDigestResult = {
  digestDate: string;
  timezone: string;
  candidatesEmailed: number;
  candidatesSkipped: number;
  errors: string[];
};

export type SendCandidateApplicationsDigestResult =
  | { success: true; jobCount: number; recipientEmail: string }
  | { error: string };

function portalApplicationsUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  return `${appUrl}/dashboard/applications`;
}

function mapAppliedRows(rows: AppliedJobRow[]): DailyApplicationsDigestJob[] {
  return rows
    .filter((row) => row.applied_at && !isJobrightListing(row.source, row.job_url))
    .map((row) => ({
      company: row.company,
      role: row.role,
    }));
}

async function fetchAppliedJobRows(
  candidateId: string,
  bounds?: { start: Date; end: Date },
): Promise<AppliedJobRow[]> {
  const admin = createAdminClient();
  let query = admin
    .from("scraped_jobs")
    .select("candidate_id, company, role, applied_at, source, job_url")
    .eq("candidate_id", candidateId)
    .eq("applied", true)
    .order("applied_at", { ascending: false });

  if (bounds) {
    query = query
      .gte("applied_at", bounds.start.toISOString())
      .lt("applied_at", bounds.end.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AppliedJobRow[];
}

export async function sendCandidateApplicationsDigest(
  candidateId: string,
  options?: {
    /** Cron uses today only; manual send from admin uses all applied jobs. */
    onlyToday?: boolean;
    skipDuplicateCheck?: boolean;
  },
): Promise<SendCandidateApplicationsDigestResult> {
  const onlyToday = options?.onlyToday ?? false;
  const skipDuplicateCheck = options?.skipDuplicateCheck ?? false;
  const timezone = getApplicationsDigestTimezone();
  const digestDate = getLocalDateString(timezone);
  const bounds = onlyToday ? getLocalDayBoundsUtc(digestDate, timezone) : undefined;

  let jobs: DailyApplicationsDigestJob[];
  try {
    jobs = mapAppliedRows(await fetchAppliedJobRows(candidateId, bounds));
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not load applied jobs.",
    };
  }

  if (jobs.length === 0) {
    return {
      error: onlyToday
        ? "No applications were submitted today for this candidate."
        : "No applied jobs to include in the email.",
    };
  }

  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("candidate_profiles")
    .select("user_id, last_applications_digest_date")
    .eq("user_id", candidateId)
    .maybeSingle();

  if (profileError) {
    return { error: profileError.message };
  }

  const { data: user, error: userError } = await admin
    .from("users")
    .select("email, name, first_name, last_name")
    .eq("id", candidateId)
    .maybeSingle();

  if (userError) {
    return { error: userError.message };
  }

  const candidateProfile = profile as CandidateProfileRow | null;
  const candidateUser = user as CandidateUserRow | null;
  if (!candidateUser?.email) {
    return { error: "Candidate email is not available." };
  }

  if (
    !skipDuplicateCheck &&
    onlyToday &&
    candidateProfile?.last_applications_digest_date === digestDate
  ) {
    return { error: "Today's application summary was already emailed to this candidate." };
  }

  const sendResult = await sendDailyApplicationsDigestEmail({
    recipientEmail: candidateUser.email,
    recipientName: resolveDigestRecipientName(candidateUser),
    jobs,
    portalUrl: portalApplicationsUrl(),
  });

  if ("skipped" in sendResult && sendResult.skipped) {
    return { error: "Email is not configured. Add RESEND_API_KEY to your environment." };
  }

  if ("error" in sendResult && sendResult.error) {
    return { error: sendResult.error };
  }

  if (onlyToday) {
    await admin
      .from("candidate_profiles")
      .update({ last_applications_digest_date: digestDate })
      .eq("user_id", candidateId);
  }

  return {
    success: true,
    jobCount: jobs.length,
    recipientEmail: candidateUser.email,
  };
}

export async function runDailyApplicationsDigest(
  now = new Date(),
): Promise<RunDailyApplicationsDigestResult> {
  const timezone = getApplicationsDigestTimezone();
  const digestDate = getLocalDateString(timezone, now);
  const { start, end } = getLocalDayBoundsUtc(digestDate, timezone);
  const admin = createAdminClient();

  const { data: appliedRows, error: jobsError } = await admin
    .from("scraped_jobs")
    .select("candidate_id, company, role, applied_at, source, job_url")
    .eq("applied", true)
    .gte("applied_at", start.toISOString())
    .lt("applied_at", end.toISOString())
    .order("applied_at", { ascending: false });

  if (jobsError) {
    throw new Error(jobsError.message);
  }

  const candidateIds = [
    ...new Set(
      ((appliedRows ?? []) as AppliedJobRow[])
        .filter((row) => row.applied_at && !isJobrightListing(row.source, row.job_url))
        .map((row) => row.candidate_id),
    ),
  ];

  if (candidateIds.length === 0) {
    return {
      digestDate,
      timezone,
      candidatesEmailed: 0,
      candidatesSkipped: 0,
      errors: [],
    };
  }

  let candidatesEmailed = 0;
  let candidatesSkipped = 0;
  const errors: string[] = [];

  for (const candidateId of candidateIds) {
    const result = await sendCandidateApplicationsDigest(candidateId, {
      onlyToday: true,
      skipDuplicateCheck: false,
    });

    if ("success" in result && result.success) {
      candidatesEmailed += 1;
      continue;
    }

    if ("error" in result) {
      if (result.error.includes("already emailed")) {
        candidatesSkipped += 1;
        continue;
      }

      if (result.error.includes("RESEND_API_KEY")) {
        return {
          digestDate,
          timezone,
          candidatesEmailed: 0,
          candidatesSkipped: candidateIds.length,
          errors: [result.error],
        };
      }

      errors.push(result.error);
    }
  }

  return {
    digestDate,
    timezone,
    candidatesEmailed,
    candidatesSkipped,
    errors,
  };
}
