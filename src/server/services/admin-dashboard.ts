import { createClient } from "@/server/db/supabase-server";
import { createAdminClient } from "@/server/db/supabase-admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/server/db/database.types";
import type { StaffContext } from "@/lib/auth/admin";

type AppSupabase = SupabaseClient<Database>;

const FREE_CANDIDATE_ROLES = ["free_candidate", "institution_candidate"] as const;
const PREMIUM_CANDIDATE_ROLES = ["subscribed_candidate"] as const;
const CANDIDATE_ROLES = [
  ...FREE_CANDIDATE_ROLES,
  ...PREMIUM_CANDIDATE_ROLES,
] as const;

export type CareerAdvisorySubmission = {
  id: string;
  candidateId: string;
  name: string;
  email: string;
  phone: string;
  graduationDetails: string;
  branch: string;
  isVeteran: boolean;
  interestedTechnology: string;
  googleMeetLink: string | null;
  sessionScheduledAt: string | null;
  inviteSentAt: string | null;
  createdAt: string;
};

export type AdminCandidate = {
  id: string;
  memberId: string | null;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
  assignedEmployeeId: string | null;
  profileEducation: string | null;
  careerGoals: string | null;
  linkedinUrl: string | null;
  resumeUrl: string | null;
  jobSearchRole: string | null;
  experienceYears: number | null;
  submission: CareerAdvisorySubmission | null;
};

export type AdminDashboardStats = {
  totalUsers: number;
  freeCandidates: number;
  premiumCandidates: number;
  totalCandidates: number;
  advisorySubmissions: number;
  pendingInvites: number;
  scrapedJobs: number;
  selectedJobs: number;
  appliedJobs: number;
  mentorCount: number;
  candidatesWithoutSubmission: number;
};

export type MentorActivityRow = {
  mentorId: string;
  memberId: string | null;
  name: string | null;
  email: string;
  assignedCandidates: number;
  scrapedJobs: number;
  shortlistedJobs: number;
  applicationsSubmitted: number;
};

export type AdminRecentCandidate = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  hasSubmission: boolean;
  scrapedJobCount: number;
};

export type AdminRecentSubmission = {
  id: string;
  candidateId: string;
  name: string;
  email: string;
  branch: string;
  createdAt: string;
  inviteSent: boolean;
  sessionScheduledAt: string | null;
  googleMeetLink: string | null;
};

export type AdminMeetingTask = {
  id: string;
  candidateId: string;
  candidateName: string;
  sessionScheduledAt: string | null;
  googleMeetLink: string | null;
  inviteSent: boolean;
};

export type AdminCalendarSession = {
  id: string;
  candidateId: string;
  name: string;
  email: string;
  branch: string;
  googleMeetLink: string | null;
  sessionScheduledAt: string | null;
  inviteSentAt: string | null;
  createdAt: string;
};

export type AdminCalendarOverview = {
  upcoming: AdminCalendarSession[];
  pendingInvites: AdminCalendarSession[];
  past: AdminCalendarSession[];
};

export type AdminDashboardOverview = {
  stats: AdminDashboardStats;
  recentCandidates: AdminRecentCandidate[];
  recentSubmissions: AdminRecentSubmission[];
  upcomingMeetings: AdminMeetingTask[];
  mentorActivity?: MentorActivityRow[];
};

function mapSubmissionRow(row: {
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
}): CareerAdvisorySubmission {
  return {
    id: row.id,
    candidateId: row.candidate_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    graduationDetails: row.graduation_details,
    branch: row.branch,
    isVeteran: row.is_veteran,
    interestedTechnology: row.interested_technology,
    googleMeetLink: row.google_meet_link,
    sessionScheduledAt: row.session_scheduled_at,
    inviteSentAt: row.invite_sent_at,
    createdAt: row.created_at,
  };
}

export async function getAdminDashboardStats(
  staff?: StaffContext,
): Promise<AdminDashboardStats> {
  const overview = await getAdminDashboardOverview(staff);
  return overview.stats;
}

export async function getAdminDashboardOverview(
  staff?: StaffContext,
): Promise<AdminDashboardOverview> {
  if (staff?.role === "admin") {
    return getMentorDashboardOverview(staff);
  }

  const overview = await getFullAdminDashboardOverview();

  if (staff?.role === "manager") {
    overview.mentorActivity = await getMentorActivitySummary();
  }

  return overview;
}

async function getFullAdminDashboardOverview(): Promise<AdminDashboardOverview> {
  const supabase = await createClient();

  const [
    usersResult,
    freeCandidatesResult,
    premiumCandidatesResult,
    candidatesResult,
    submissionsResult,
    pendingResult,
    scrapedJobsResult,
    selectedJobsResult,
    appliedJobsResult,
    mentorsResult,
    recentUsersResult,
    recentSubmissionsResult,
    scrapedJobsByCandidateResult,
    submissionCandidateIdsResult,
  ] = await Promise.all([
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .not("role", "in", '("admin","manager")'),
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .in("role", [...FREE_CANDIDATE_ROLES]),
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .in("role", [...PREMIUM_CANDIDATE_ROLES]),
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .in("role", [...CANDIDATE_ROLES]),
    supabase
      .from("career_advisory_intakes")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("career_advisory_intakes")
      .select("id", { count: "exact", head: true })
      .is("invite_sent_at", null),
    supabase.from("scraped_jobs").select("id", { count: "exact", head: true }),
    supabase
      .from("scraped_jobs")
      .select("id", { count: "exact", head: true })
      .eq("selected", true),
    supabase
      .from("scraped_jobs")
      .select("id", { count: "exact", head: true })
      .eq("applied", true),
    supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin"),
    supabase
      .from("users")
      .select("id, name, email, created_at")
      .in("role", [...CANDIDATE_ROLES])
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("career_advisory_intakes")
      .select(
        "id, candidate_id, name, email, branch, google_meet_link, session_scheduled_at, invite_sent_at, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("scraped_jobs").select("candidate_id"),
    supabase.from("career_advisory_intakes").select("candidate_id"),
  ]);

  const submissionCandidateIds = new Set(
    (submissionCandidateIdsResult.data ?? []).map((row) => row.candidate_id),
  );

  const scrapedCountByCandidate = new Map<string, number>();
  for (const row of scrapedJobsByCandidateResult.data ?? []) {
    scrapedCountByCandidate.set(
      row.candidate_id,
      (scrapedCountByCandidate.get(row.candidate_id) ?? 0) + 1,
    );
  }

  const totalCandidates = candidatesResult.count ?? 0;

  const recentSubmissions = (recentSubmissionsResult.data ?? []).map((row) => ({
    id: row.id,
    candidateId: row.candidate_id,
    name: row.name,
    email: row.email,
    branch: row.branch,
    createdAt: row.created_at,
    inviteSent: Boolean(row.invite_sent_at),
    sessionScheduledAt: row.session_scheduled_at,
    googleMeetLink: row.google_meet_link,
  }));

  const calendarOverview = await getAdminCalendarOverview();
  const upcomingMeetings: AdminMeetingTask[] = [
    ...calendarOverview.upcoming,
    ...calendarOverview.pendingInvites.filter((session) => session.sessionScheduledAt),
  ]
    .map((session) => ({
      id: session.id,
      candidateId: session.candidateId,
      candidateName: session.name,
      sessionScheduledAt: session.sessionScheduledAt,
      googleMeetLink: session.googleMeetLink,
      inviteSent: Boolean(session.inviteSentAt),
    }))
    .sort(
      (a, b) =>
        new Date(a.sessionScheduledAt ?? 0).getTime() -
        new Date(b.sessionScheduledAt ?? 0).getTime(),
    )
    .slice(0, 8);

  return {
    stats: {
      totalUsers: usersResult.count ?? 0,
      freeCandidates: freeCandidatesResult.count ?? 0,
      premiumCandidates: premiumCandidatesResult.count ?? 0,
      totalCandidates,
      advisorySubmissions: submissionsResult.count ?? 0,
      pendingInvites: pendingResult.count ?? 0,
      scrapedJobs: scrapedJobsResult.count ?? 0,
      selectedJobs: selectedJobsResult.count ?? 0,
      appliedJobs: appliedJobsResult.count ?? 0,
      mentorCount: mentorsResult.count ?? 0,
      candidatesWithoutSubmission: Math.max(
        0,
        totalCandidates - submissionCandidateIds.size,
      ),
    },
    recentCandidates: (recentUsersResult.data ?? []).map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.created_at,
      hasSubmission: submissionCandidateIds.has(user.id),
      scrapedJobCount: scrapedCountByCandidate.get(user.id) ?? 0,
    })),
    recentSubmissions,
    upcomingMeetings,
  };
}

export async function getCareerAdvisorySubmissions(): Promise<
  CareerAdvisorySubmission[]
> {
  const candidates = await getAdminCandidates();
  return candidates
    .map((candidate) => candidate.submission)
    .filter((submission): submission is CareerAdvisorySubmission => submission !== null);
}

export async function getAdminCalendarOverview(): Promise<AdminCalendarOverview> {
  const supabase = await createClient();
  const now = Date.now();

  const { data, error } = await supabase
    .from("career_advisory_intakes")
    .select(
      "id, candidate_id, name, email, branch, google_meet_link, session_scheduled_at, invite_sent_at, created_at",
    )
    .order("created_at", { ascending: false });

  if (error || !data) {
    return { upcoming: [], pendingInvites: [], past: [] };
  }

  const sessions: AdminCalendarSession[] = data.map((row) => ({
    id: row.id,
    candidateId: row.candidate_id,
    name: row.name,
    email: row.email,
    branch: row.branch,
    googleMeetLink: row.google_meet_link,
    sessionScheduledAt: row.session_scheduled_at,
    inviteSentAt: row.invite_sent_at,
    createdAt: row.created_at,
  }));

  const upcoming: AdminCalendarSession[] = [];
  const pendingInvites: AdminCalendarSession[] = [];
  const past: AdminCalendarSession[] = [];

  for (const session of sessions) {
    if (!session.inviteSentAt) {
      pendingInvites.push(session);
      continue;
    }

    if (session.sessionScheduledAt) {
      const sessionTime = new Date(session.sessionScheduledAt).getTime();
      if (sessionTime >= now) {
        upcoming.push(session);
      } else {
        past.push(session);
      }
      continue;
    }

    past.push(session);
  }

  upcoming.sort(
    (a, b) =>
      new Date(a.sessionScheduledAt ?? 0).getTime() -
      new Date(b.sessionScheduledAt ?? 0).getTime(),
  );
  past.sort(
    (a, b) =>
      new Date(b.sessionScheduledAt ?? b.createdAt).getTime() -
      new Date(a.sessionScheduledAt ?? a.createdAt).getTime(),
  );

  return { upcoming, pendingInvites, past };
}

export async function getAdminMeetingTasks(): Promise<AdminMeetingTask[]> {
  const { upcoming, pendingInvites } = await getAdminCalendarOverview();

  return [...upcoming, ...pendingInvites.filter((session) => session.sessionScheduledAt)]
    .map((session) => ({
      id: session.id,
      candidateId: session.candidateId,
      candidateName: session.name,
      sessionScheduledAt: session.sessionScheduledAt,
      googleMeetLink: session.googleMeetLink,
      inviteSent: Boolean(session.inviteSentAt),
    }))
    .sort(
      (a, b) =>
        new Date(a.sessionScheduledAt ?? 0).getTime() -
        new Date(b.sessionScheduledAt ?? 0).getTime(),
    );
}

export async function getAdminCandidates(
  staff?: StaffContext,
  supabaseClient?: AppSupabase,
): Promise<AdminCandidate[]> {
  const supabase = supabaseClient ?? (await createClient());
  const profileSupabase =
    staff?.role === "manager" ? createAdminClient() : supabase;

  let usersQuery = supabase
    .from("users")
    .select("id, email, name, role, created_at, member_id")
    .in("role", [...CANDIDATE_ROLES])
    .order("created_at", { ascending: false });

  if (staff?.role === "admin") {
    const assignedIds = await getAssignedCandidateIds(staff.userId);
    if (assignedIds.length === 0) {
      return [];
    }
    usersQuery = usersQuery.in("id", assignedIds);
  }

  const [usersResult, submissionsResult, profilesResult] = await Promise.all([
    usersQuery,
    supabase
      .from("career_advisory_intakes")
      .select(
        "id, candidate_id, name, email, phone, graduation_details, branch, is_veteran, interested_technology, google_meet_link, session_scheduled_at, invite_sent_at, created_at",
      )
      .order("created_at", { ascending: false }),
    profileSupabase
      .from("candidate_profiles")
      .select("user_id, education, career_goals, linkedin_url, resume_url, assigned_employee_id, job_search_role, experience_years"),
  ]);

  if (usersResult.error || !usersResult.data) {
    return [];
  }

  const submissionsByCandidate = new Map(
    (submissionsResult.data ?? []).map((row) => [
      row.candidate_id,
      mapSubmissionRow(row),
    ]),
  );

  const profilesByUser = new Map(
    (profilesResult.data ?? []).map((row) => [row.user_id, row]),
  );

  return usersResult.data.map((user) => {
    const profile = profilesByUser.get(user.id);

    return mapUserToCandidate(user, profile, submissionsByCandidate.get(user.id) ?? null);
  });
}

function mapUserToCandidate(
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    created_at: string;
    member_id?: string | null;
  },
  profile:
    | {
        education: string | null;
        career_goals: string | null;
        linkedin_url: string | null;
        resume_url: string | null;
        assigned_employee_id: string | null;
        job_search_role: string | null;
        experience_years: number | null;
      }
    | undefined,
  submission: CareerAdvisorySubmission | null,
): AdminCandidate {
  return {
    id: user.id,
    memberId: user.member_id ?? null,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.created_at,
    assignedEmployeeId: profile?.assigned_employee_id ?? null,
    profileEducation: profile?.education ?? null,
    careerGoals: profile?.career_goals ?? null,
    linkedinUrl: profile?.linkedin_url ?? null,
    resumeUrl: profile?.resume_url ?? null,
    jobSearchRole: profile?.job_search_role ?? null,
    experienceYears: profile?.experience_years ?? null,
    submission,
  };
}

export async function getAdminCandidateById(
  candidateId: string,
  staff?: StaffContext,
): Promise<AdminCandidate | null> {
  const supabase = await createClient();
  const profileSupabase =
    staff?.role === "manager" ? createAdminClient() : supabase;

  const { data: user, error } = await supabase
    .from("users")
    .select("id, email, name, role, created_at, member_id")
    .eq("id", candidateId)
    .in("role", [...CANDIDATE_ROLES])
    .maybeSingle();

  if (error || !user) {
    return null;
  }

  const [submissionResult, profileResult] = await Promise.all([
    supabase
      .from("career_advisory_intakes")
      .select(
        "id, candidate_id, name, email, phone, graduation_details, branch, is_veteran, interested_technology, google_meet_link, session_scheduled_at, invite_sent_at, created_at",
      )
      .eq("candidate_id", candidateId)
      .maybeSingle(),
    profileSupabase
      .from("candidate_profiles")
      .select("education, career_goals, linkedin_url, resume_url, assigned_employee_id, job_search_role, experience_years")
      .eq("user_id", candidateId)
      .maybeSingle(),
  ]);

  const candidate = mapUserToCandidate(
    user,
    profileResult.data ?? undefined,
    submissionResult.data ? mapSubmissionRow(submissionResult.data) : null,
  );

  if (
    staff?.role === "admin" &&
    candidate.assignedEmployeeId !== staff.userId
  ) {
    return null;
  }

  return candidate;
}

async function getAssignedCandidateIds(employeeId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("candidate_profiles")
    .select("user_id")
    .eq("assigned_employee_id", employeeId);

  return (data ?? []).map((row) => row.user_id);
}

async function getMentorDashboardOverview(
  staff: StaffContext,
): Promise<AdminDashboardOverview> {
  const candidates = await getAdminCandidates(staff);
  const candidateIds = new Set(candidates.map((candidate) => candidate.id));
  const supabase = await createClient();

  const [scrapedJobsResult, selectedJobsResult, appliedJobsResult, scrapedJobsByCandidateResult] =
    await Promise.all([
      supabase.from("scraped_jobs").select("id, candidate_id"),
      supabase.from("scraped_jobs").select("id, candidate_id").eq("selected", true),
      supabase.from("scraped_jobs").select("id, candidate_id").eq("applied", true),
      supabase.from("scraped_jobs").select("candidate_id"),
    ]);

  const scrapedJobs = (scrapedJobsResult.data ?? []).filter((row) =>
    candidateIds.has(row.candidate_id),
  );
  const selectedJobs = (selectedJobsResult.data ?? []).filter((row) =>
    candidateIds.has(row.candidate_id),
  );
  const appliedJobs = (appliedJobsResult.data ?? []).filter((row) =>
    candidateIds.has(row.candidate_id),
  );

  const scrapedCountByCandidate = new Map<string, number>();
  for (const row of scrapedJobsByCandidateResult.data ?? []) {
    if (!candidateIds.has(row.candidate_id)) {
      continue;
    }
    scrapedCountByCandidate.set(
      row.candidate_id,
      (scrapedCountByCandidate.get(row.candidate_id) ?? 0) + 1,
    );
  }

  const submissionCandidateIds = new Set(
    candidates
      .map((candidate) => candidate.submission?.candidateId)
      .filter(Boolean) as string[],
  );

  const recentSubmissions = candidates
    .map((candidate) => candidate.submission)
    .filter((submission): submission is CareerAdvisorySubmission => submission !== null)
    .slice(0, 5)
    .map((submission) => ({
      id: submission.id,
      candidateId: submission.candidateId,
      name: submission.name,
      email: submission.email,
      branch: submission.branch,
      createdAt: submission.createdAt,
      inviteSent: Boolean(submission.inviteSentAt),
      sessionScheduledAt: submission.sessionScheduledAt,
      googleMeetLink: submission.googleMeetLink,
    }));

  const calendarOverview = await getAdminCalendarOverview();
  const upcomingMeetings: AdminMeetingTask[] = [
    ...calendarOverview.upcoming,
    ...calendarOverview.pendingInvites.filter((session) => session.sessionScheduledAt),
  ]
    .filter((session) => candidateIds.has(session.candidateId))
    .map((session) => ({
      id: session.id,
      candidateId: session.candidateId,
      candidateName: session.name,
      sessionScheduledAt: session.sessionScheduledAt,
      googleMeetLink: session.googleMeetLink,
      inviteSent: Boolean(session.inviteSentAt),
    }))
    .sort(
      (a, b) =>
        new Date(a.sessionScheduledAt ?? 0).getTime() -
        new Date(b.sessionScheduledAt ?? 0).getTime(),
    )
    .slice(0, 8);

  const freeCandidates = candidates.filter((candidate) =>
    (FREE_CANDIDATE_ROLES as readonly string[]).includes(candidate.role),
  ).length;
  const premiumCandidates = candidates.filter((candidate) =>
    (PREMIUM_CANDIDATE_ROLES as readonly string[]).includes(candidate.role),
  ).length;

  return {
    stats: {
      totalUsers: candidates.length,
      freeCandidates,
      premiumCandidates,
      totalCandidates: candidates.length,
      advisorySubmissions: submissionCandidateIds.size,
      pendingInvites: recentSubmissions.filter((submission) => !submission.inviteSent).length,
      scrapedJobs: scrapedJobs.length,
      selectedJobs: selectedJobs.length,
      appliedJobs: appliedJobs.length,
      mentorCount: 0,
      candidatesWithoutSubmission: Math.max(
        0,
        candidates.length - submissionCandidateIds.size,
      ),
    },
    recentCandidates: candidates.slice(0, 5).map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      email: candidate.email,
      createdAt: candidate.createdAt,
      hasSubmission: submissionCandidateIds.has(candidate.id),
      scrapedJobCount: scrapedCountByCandidate.get(candidate.id) ?? 0,
    })),
    recentSubmissions,
    upcomingMeetings,
  };
}

export async function getMentorActivitySummary(): Promise<MentorActivityRow[]> {
  const supabase = await createClient();

  const [mentorsResult, profilesResult, jobsResult] = await Promise.all([
    supabase
      .from("users")
      .select("id, name, email, member_id")
      .eq("role", "admin")
      .order("name", { ascending: true }),
    supabase
      .from("candidate_profiles")
      .select("user_id, assigned_employee_id"),
    supabase
      .from("scraped_jobs")
      .select("candidate_id, selected, applied"),
  ]);

  const mentors = mentorsResult.data ?? [];
  if (mentors.length === 0) {
    return [];
  }

  const mentorIdByCandidate = new Map<string, string>();
  for (const profile of profilesResult.data ?? []) {
    if (profile.assigned_employee_id) {
      mentorIdByCandidate.set(profile.user_id, profile.assigned_employee_id);
    }
  }

  const statsByMentor = new Map<
    string,
    {
      assignedCandidates: Set<string>;
      scrapedJobs: number;
      shortlistedJobs: number;
      applicationsSubmitted: number;
    }
  >();

  for (const mentor of mentors) {
    statsByMentor.set(mentor.id, {
      assignedCandidates: new Set(),
      scrapedJobs: 0,
      shortlistedJobs: 0,
      applicationsSubmitted: 0,
    });
  }

  for (const profile of profilesResult.data ?? []) {
    if (!profile.assigned_employee_id) {
      continue;
    }
    const bucket = statsByMentor.get(profile.assigned_employee_id);
    if (bucket) {
      bucket.assignedCandidates.add(profile.user_id);
    }
  }

  for (const job of jobsResult.data ?? []) {
    const mentorId = mentorIdByCandidate.get(job.candidate_id);
    if (!mentorId) {
      continue;
    }

    const bucket = statsByMentor.get(mentorId);
    if (!bucket) {
      continue;
    }

    bucket.scrapedJobs += 1;
    if (job.selected) {
      bucket.shortlistedJobs += 1;
    }
    if (job.applied) {
      bucket.applicationsSubmitted += 1;
    }
  }

  return mentors.map((mentor) => {
    const bucket = statsByMentor.get(mentor.id);
    return {
      mentorId: mentor.id,
      memberId: mentor.member_id,
      name: mentor.name,
      email: mentor.email,
      assignedCandidates: bucket?.assignedCandidates.size ?? 0,
      scrapedJobs: bucket?.scrapedJobs ?? 0,
      shortlistedJobs: bucket?.shortlistedJobs ?? 0,
      applicationsSubmitted: bucket?.applicationsSubmitted ?? 0,
    };
  });
}
