import { CAREER_ADVISORY_INDIA_TIMEZONE } from "@/lib/career-advisory/session-datetime";
import {
  getLocalDateString,
  getLocalDayBoundsUtc,
} from "@/lib/timezone-day-bounds";
import { createClient } from "@/server/db/supabase-server";
import { createAdminClient } from "@/server/db/supabase-admin";

export type DailyActivityItem = {
  id: string;
  category: "job_scraped" | "application" | "meet_invite" | "meeting";
  label: string;
  detail: string | null;
  at: string;
};

export type DailyActivitySnapshot = {
  timezone: string;
  workDate: string;
  summary: {
    jobsScraped: number;
    applicationsSubmitted: number;
    meetInvitesSent: number;
    meetingsHeld: number;
  };
  items: DailyActivityItem[];
};

export type AdminDailyUpdate = {
  id: string;
  employeeId: string;
  employeeName: string | null;
  employeeEmail: string;
  workDate: string;
  remarks: string;
  activitySnapshot: DailyActivitySnapshot;
  submittedAt: string;
};

export function getAdminDailyUpdateTimezone(): string {
  return (
    process.env.ADMIN_DAILY_UPDATE_TIMEZONE?.trim() ||
    CAREER_ADVISORY_INDIA_TIMEZONE
  );
}

function mapSnapshot(value: unknown): DailyActivitySnapshot {
  if (!value || typeof value !== "object") {
    return {
      timezone: getAdminDailyUpdateTimezone(),
      workDate: getLocalDateString(getAdminDailyUpdateTimezone()),
      summary: {
        jobsScraped: 0,
        applicationsSubmitted: 0,
        meetInvitesSent: 0,
        meetingsHeld: 0,
      },
      items: [],
    };
  }

  const raw = value as Partial<DailyActivitySnapshot>;
  return {
    timezone: raw.timezone ?? getAdminDailyUpdateTimezone(),
    workDate: raw.workDate ?? getLocalDateString(getAdminDailyUpdateTimezone()),
    summary: {
      jobsScraped: raw.summary?.jobsScraped ?? 0,
      applicationsSubmitted: raw.summary?.applicationsSubmitted ?? 0,
      meetInvitesSent: raw.summary?.meetInvitesSent ?? 0,
      meetingsHeld: raw.summary?.meetingsHeld ?? 0,
    },
    items: Array.isArray(raw.items) ? raw.items : [],
  };
}

async function getAssignedCandidateIds(employeeId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("candidate_profiles")
    .select("user_id")
    .eq("assigned_employee_id", employeeId);

  return (data ?? []).map((row) => row.user_id);
}

async function getCandidateNameMap(
  candidateIds: string[],
): Promise<Map<string, string>> {
  if (candidateIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("id, name, email")
    .in("id", candidateIds);

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    map.set(row.id, row.name?.trim() || row.email);
  }
  return map;
}

export async function buildMentorDailyActivity(
  employeeId: string,
  workDate?: string,
): Promise<DailyActivitySnapshot> {
  const timezone = getAdminDailyUpdateTimezone();
  const date = workDate ?? getLocalDateString(timezone);
  const { start, end } = getLocalDayBoundsUtc(date, timezone);
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const supabase = await createClient();
  const assignedIds = await getAssignedCandidateIds(employeeId);

  const items: DailyActivityItem[] = [];

  const { data: scrapedRows } = await supabase
    .from("scraped_jobs")
    .select("id, candidate_id, company, role, scraped_at, applied, applied_at")
    .eq("employee_id", employeeId)
    .gte("scraped_at", startIso)
    .lt("scraped_at", endIso)
    .order("scraped_at", { ascending: false });

  const candidateIds = new Set<string>(assignedIds);
  for (const row of scrapedRows ?? []) {
    candidateIds.add(row.candidate_id);
  }

  const candidateNames = await getCandidateNameMap([...candidateIds]);

  for (const row of scrapedRows ?? []) {
    const candidateName = candidateNames.get(row.candidate_id) ?? "Candidate";
    items.push({
      id: `scrape-${row.id}`,
      category: "job_scraped",
      label: `Found job for ${candidateName}`,
      detail: `${row.role} at ${row.company}`,
      at: row.scraped_at,
    });
  }

  const { data: appliedRows } = await supabase
    .from("scraped_jobs")
    .select("id, candidate_id, company, role, applied_at")
    .eq("employee_id", employeeId)
    .eq("applied", true)
    .gte("applied_at", startIso)
    .lt("applied_at", endIso)
    .order("applied_at", { ascending: false });

  for (const row of appliedRows ?? []) {
    const candidateName = candidateNames.get(row.candidate_id) ?? "Candidate";
    items.push({
      id: `apply-${row.id}`,
      category: "application",
      label: `Submitted application for ${candidateName}`,
      detail: `${row.role} at ${row.company}`,
      at: row.applied_at ?? startIso,
    });
  }

  if (assignedIds.length > 0) {
    const { data: intakeRows } = await supabase
      .from("career_advisory_intakes")
      .select("id, candidate_id, name, invite_sent_at, session_scheduled_at")
      .in("candidate_id", assignedIds);

    for (const row of intakeRows ?? []) {
      if (
        row.invite_sent_at &&
        row.invite_sent_at >= startIso &&
        row.invite_sent_at < endIso
      ) {
        items.push({
          id: `invite-${row.id}`,
          category: "meet_invite",
          label: `Sent career advisory invite to ${row.name}`,
          detail: row.session_scheduled_at
            ? `Session scheduled`
            : null,
          at: row.invite_sent_at,
        });
      }

      if (row.session_scheduled_at) {
        const sessionTime = new Date(row.session_scheduled_at);
        if (sessionTime >= start && sessionTime < end && sessionTime.getTime() <= Date.now()) {
          items.push({
            id: `meeting-${row.id}`,
            category: "meeting",
            label: `Career advisory session with ${row.name}`,
            detail: "Session held today",
            at: row.session_scheduled_at,
          });
        }
      }
    }
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return {
    timezone,
    workDate: date,
    summary: {
      jobsScraped: (scrapedRows ?? []).length,
      applicationsSubmitted: (appliedRows ?? []).length,
      meetInvitesSent: items.filter((item) => item.category === "meet_invite").length,
      meetingsHeld: items.filter((item) => item.category === "meeting").length,
    },
    items,
  };
}

export async function getMentorDailyUpdateForDate(
  employeeId: string,
  workDate?: string,
): Promise<AdminDailyUpdate | null> {
  const timezone = getAdminDailyUpdateTimezone();
  const date = workDate ?? getLocalDateString(timezone);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("admin_daily_updates")
    .select("id, employee_id, work_date, remarks, activity_snapshot, submitted_at")
    .eq("employee_id", employeeId)
    .eq("work_date", date)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("name, email")
    .eq("id", employeeId)
    .single();

  return {
    id: data.id,
    employeeId: data.employee_id,
    employeeName: userRow?.name ?? null,
    employeeEmail: userRow?.email ?? "",
    workDate: data.work_date,
    remarks: data.remarks,
    activitySnapshot: mapSnapshot(data.activity_snapshot),
    submittedAt: data.submitted_at,
  };
}

export async function getManagerDailyUpdates(
  workDate?: string,
  limit = 14,
): Promise<AdminDailyUpdate[]> {
  const timezone = getAdminDailyUpdateTimezone();
  const date = workDate ?? getLocalDateString(timezone);
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("admin_daily_updates")
    .select("id, employee_id, work_date, remarks, activity_snapshot, submitted_at")
    .eq("work_date", date)
    .order("submitted_at", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  const employeeIds = [...new Set(data.map((row) => row.employee_id))];
  const { data: users } = await admin
    .from("users")
    .select("id, name, email")
    .in("id", employeeIds);

  const userById = new Map((users ?? []).map((row) => [row.id, row]));

  return data.map((row) => {
    const user = userById.get(row.employee_id);
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: user?.name ?? null,
      employeeEmail: user?.email ?? "",
      workDate: row.work_date,
      remarks: row.remarks,
      activitySnapshot: mapSnapshot(row.activity_snapshot),
      submittedAt: row.submitted_at,
    };
  });
}

export async function getRecentManagerDailyUpdates(
  days = 7,
): Promise<AdminDailyUpdate[]> {
  const admin = createAdminClient();
  const timezone = getAdminDailyUpdateTimezone();
  const today = getLocalDateString(timezone);
  const startDate = getLocalDateString(
    timezone,
    new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000),
  );

  const { data, error } = await admin
    .from("admin_daily_updates")
    .select("id, employee_id, work_date, remarks, activity_snapshot, submitted_at")
    .gte("work_date", startDate)
    .lte("work_date", today)
    .order("work_date", { ascending: false })
    .order("submitted_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  const employeeIds = [...new Set(data.map((row) => row.employee_id))];
  const { data: users } = await admin
    .from("users")
    .select("id, name, email")
    .in("id", employeeIds);

  const userById = new Map((users ?? []).map((row) => [row.id, row]));

  return data.map((row) => {
    const user = userById.get(row.employee_id);
    return {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: user?.name ?? null,
      employeeEmail: user?.email ?? "",
      workDate: row.work_date,
      remarks: row.remarks,
      activitySnapshot: mapSnapshot(row.activity_snapshot),
      submittedAt: row.submitted_at,
    };
  });
}

export async function submitMentorDailyUpdate(
  employeeId: string,
  remarks: string,
): Promise<
  | { success: true; update: AdminDailyUpdate; isUpdate: boolean }
  | { error: string }
> {
  const trimmedRemarks = remarks.trim();
  if (!trimmedRemarks) {
    return { error: "Add remarks about your day before sending the update." };
  }

  const activity = await buildMentorDailyActivity(employeeId);
  const supabase = await createClient();
  const now = new Date().toISOString();

  const existing = await getMentorDailyUpdateForDate(employeeId, activity.workDate);

  const { data, error } = await supabase
    .from("admin_daily_updates")
    .upsert(
      {
        employee_id: employeeId,
        work_date: activity.workDate,
        remarks: trimmedRemarks,
        activity_snapshot: activity as unknown as Record<string, unknown>,
        submitted_at: now,
        updated_at: now,
      },
      { onConflict: "employee_id,work_date" },
    )
    .select("id, employee_id, work_date, remarks, activity_snapshot, submitted_at")
    .single();

  if (error || !data) {
    return { error: "Could not save your daily update. Please try again." };
  }

  const { data: userRow } = await supabase
    .from("users")
    .select("name, email")
    .eq("id", employeeId)
    .single();

  const update: AdminDailyUpdate = {
    id: data.id,
    employeeId: data.employee_id,
    employeeName: userRow?.name ?? null,
    employeeEmail: userRow?.email ?? "",
    workDate: data.work_date,
    remarks: data.remarks,
    activitySnapshot: mapSnapshot(data.activity_snapshot),
    submittedAt: data.submitted_at,
  };

  return {
    success: true,
    update,
    isUpdate: Boolean(existing),
  };
}
