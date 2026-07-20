import { formatSessionDateTimeFromIso } from "@/lib/career-advisory/session-datetime";
import { createAdminClient } from "@/server/db/supabase-admin";
import { createClient } from "@/server/db/supabase-server";
import type { StaffContext } from "@/lib/auth/admin";
import { notifyManagersOfAdvisoryMeetingRemarks } from "@/server/services/service-request-advisory-email";
import { notifyManagersOfServiceRequest } from "@/server/services/service-request-notify-email";
import { sendCareerAdvisoryMeetInvite } from "@/server/services/send-career-advisory-invite";

export type ServiceRequestType = "contact" | "new_candidate" | "career_advisory";

export type ServiceRequestStatus = "open" | "assigned" | "closed";

export type ServiceRequestRow = {
  id: string;
  requestType: ServiceRequestType;
  candidateUserId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  enquiry: string;
  status: ServiceRequestStatus;
  assignedMentorId: string | null;
  assignedMentorName: string | null;
  assignedMentorEmail: string | null;
  assignedAt: string | null;
  assignedBy: string | null;
  sessionScheduledAt: string | null;
  meetingRemarks: string | null;
  submittedToManagerAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MentorOption = {
  id: string;
  name: string;
  email: string;
  memberId: string | null;
};

type DbRow = {
  id: string;
  request_type: ServiceRequestType;
  candidate_user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  enquiry: string;
  status: ServiceRequestStatus;
  assigned_mentor_id: string | null;
  assigned_at: string | null;
  assigned_by: string | null;
  session_scheduled_at: string | null;
  meeting_remarks: string | null;
  submitted_to_manager_at: string | null;
  created_at: string;
  updated_at: string;
  mentor?: {
    name: string | null;
    email: string;
  } | null;
};

function mapRow(row: DbRow): ServiceRequestRow {
  return {
    id: row.id,
    requestType: row.request_type,
    candidateUserId: row.candidate_user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    enquiry: row.enquiry,
    status: row.status,
    assignedMentorId: row.assigned_mentor_id,
    assignedMentorName: row.mentor?.name ?? null,
    assignedMentorEmail: row.mentor?.email ?? null,
    assignedAt: row.assigned_at,
    assignedBy: row.assigned_by,
    sessionScheduledAt: row.session_scheduled_at,
    meetingRemarks: row.meeting_remarks,
    submittedToManagerAt: row.submitted_to_manager_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createServiceRequest(input: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  enquiry: string;
}): Promise<{ id: string } | { error: string }> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("service_requests")
    .insert({
      request_type: "contact",
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      enquiry: input.enquiry.trim(),
      status: "open",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("createServiceRequest error:", error);
    return { error: "Could not submit your request. Please try again." };
  }

  return { id: data.id };
}

function buildCareerAdvisoryEnquiry(input: {
  branch: string;
  interestedTechnology: string;
  graduationDetails: string;
  sessionScheduledAt: string;
}): string {
  const sessionLabel =
    formatSessionDateTimeFromIso(input.sessionScheduledAt, "staff") ??
    input.sessionScheduledAt;

  return [
    `Career advisory session booked for ${sessionLabel}.`,
    `Branch: ${input.branch}`,
    `Technology: ${input.interestedTechnology}`,
    `Education: ${input.graduationDetails}`,
    "Conduct the session, add meeting remarks, then mark closed to notify your manager.",
  ].join("\n");
}

export async function upsertCareerAdvisoryServiceRequest(input: {
  candidateUserId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  branch: string;
  interestedTechnology: string;
  graduationDetails: string;
  sessionScheduledAt: string;
  assignedMentorId: string | null;
}): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const enquiry = buildCareerAdvisoryEnquiry(input);

  const { data: existing } = await admin
    .from("service_requests")
    .select("id, assigned_mentor_id, status")
    .eq("request_type", "career_advisory")
    .eq("candidate_user_id", input.candidateUserId)
    .in("status", ["open", "assigned"])
    .maybeSingle();

  const baseFields = {
    request_type: "career_advisory" as const,
    candidate_user_id: input.candidateUserId,
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    enquiry,
    session_scheduled_at: input.sessionScheduledAt,
    updated_at: now,
  };

  if (existing) {
    const updatePayload = {
      ...baseFields,
      ...(input.assignedMentorId
        ? {
            assigned_mentor_id: input.assignedMentorId,
            status: "assigned" as const,
            ...(existing.assigned_mentor_id ? {} : { assigned_at: now }),
          }
        : { status: "open" as const }),
    };

    const { error } = await admin
      .from("service_requests")
      .update(updatePayload)
      .eq("id", existing.id);

    if (error) {
      console.error("upsertCareerAdvisoryServiceRequest update error:", error);
    }
    return;
  }

  const { data: created, error } = await admin
    .from("service_requests")
    .insert({
      ...baseFields,
      status: input.assignedMentorId ? "assigned" : "open",
      assigned_mentor_id: input.assignedMentorId,
      assigned_at: input.assignedMentorId ? now : null,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("upsertCareerAdvisoryServiceRequest insert error:", error);
    return;
  }

  if (!input.assignedMentorId) {
    const managerEmails = await listManagerEmails();
    void notifyManagersOfServiceRequest({
      requestId: created.id,
      requestType: "career_advisory",
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      enquiry,
      managerEmails,
    });
  }
}

export async function listServiceRequests(
  staff: StaffContext,
): Promise<ServiceRequestRow[]> {
  if (staff.role === "admin") {
    await syncMentorCareerAdvisoryRequests(staff.userId);
  }

  const supabase = await createClient();

  let query = supabase
    .from("service_requests")
    .select(
      "id, request_type, candidate_user_id, first_name, last_name, email, phone, enquiry, status, assigned_mentor_id, assigned_at, assigned_by, session_scheduled_at, meeting_remarks, submitted_to_manager_at, created_at, updated_at",
    )
    .order("created_at", { ascending: false });

  if (staff.role === "admin") {
    query = query
      .eq("request_type", "career_advisory")
      .eq("assigned_mentor_id", staff.userId);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error("listServiceRequests error:", error);
    return [];
  }

  const mentorIds = [
    ...new Set(
      data
        .map((row) => row.assigned_mentor_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const mentorById = new Map<string, { name: string | null; email: string }>();

  if (mentorIds.length > 0) {
    const admin = createAdminClient();
    const { data: mentors } = await admin
      .from("users")
      .select("id, name, email")
      .in("id", mentorIds);

    for (const mentor of mentors ?? []) {
      mentorById.set(mentor.id, { name: mentor.name, email: mentor.email });
    }
  }

  return data.map((row) => {
    const mentor = row.assigned_mentor_id
      ? mentorById.get(row.assigned_mentor_id)
      : null;

    return mapRow({
      ...row,
      request_type: (row.request_type ?? "contact") as ServiceRequestType,
      status: row.status as ServiceRequestStatus,
      mentor: mentor ?? null,
    });
  });
}

async function syncMentorCareerAdvisoryRequests(mentorId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: profiles } = await admin
    .from("candidate_profiles")
    .select("user_id")
    .eq("assigned_employee_id", mentorId);

  const candidateIds = (profiles ?? []).map((row) => row.user_id);
  if (candidateIds.length === 0) {
    return;
  }

  const { data: intakes } = await admin
    .from("career_advisory_intakes")
    .select(
      "candidate_id, name, email, phone, branch, interested_technology, graduation_details, session_scheduled_at",
    )
    .in("candidate_id", candidateIds)
    .not("session_scheduled_at", "is", null);

  for (const intake of intakes ?? []) {
    const { data: activeRequest } = await admin
      .from("service_requests")
      .select("id")
      .eq("request_type", "career_advisory")
      .eq("candidate_user_id", intake.candidate_id)
      .in("status", ["open", "assigned"])
      .maybeSingle();

    if (activeRequest || !intake.session_scheduled_at) {
      continue;
    }

    const nameParts = intake.name.trim().split(/\s+/);
    const firstName = nameParts[0] ?? "Candidate";
    const lastName = nameParts.slice(1).join(" ");

    await upsertCareerAdvisoryServiceRequest({
      candidateUserId: intake.candidate_id,
      firstName,
      lastName,
      email: intake.email,
      phone: intake.phone ?? "—",
      branch: intake.branch ?? "",
      interestedTechnology: intake.interested_technology ?? "",
      graduationDetails: intake.graduation_details ?? "",
      sessionScheduledAt: intake.session_scheduled_at,
      assignedMentorId: mentorId,
    });
  }
}

export async function countOpenNewCandidateSignups(): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("service_requests")
    .select("id", { count: "exact", head: true })
    .eq("request_type", "new_candidate")
    .eq("status", "open");

  if (error) {
    return 0;
  }

  return count ?? 0;
}

export async function listMentorAdmins(): Promise<MentorOption[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("users")
    .select("id, name, email, member_id")
    .eq("role", "admin")
    .order("name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    name: row.name ?? row.email,
    email: row.email,
    memberId: row.member_id,
  }));
}

export async function assignServiceRequestToMentor(
  requestId: string,
  mentorId: string,
  managerId: string,
): Promise<{ error?: string; meetInviteSent?: boolean; meetInviteMessage?: string }> {
  const admin = createAdminClient();

  const { data: mentor, error: mentorError } = await admin
    .from("users")
    .select("id, role")
    .eq("id", mentorId)
    .eq("role", "admin")
    .maybeSingle();

  if (mentorError || !mentor) {
    return { error: "Selected mentor was not found." };
  }

  const { data: request, error: requestError } = await admin
    .from("service_requests")
    .select("id, request_type, candidate_user_id")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError || !request) {
    return { error: "Request was not found." };
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from("service_requests")
    .update({
      assigned_mentor_id: mentorId,
      assigned_by: managerId,
      assigned_at: now,
      status: "assigned",
      updated_at: now,
    })
    .eq("id", requestId);

  if (error) {
    console.error("assignServiceRequestToMentor error:", error);
    return { error: "Could not assign this request." };
  }

  if (
    (request.request_type === "new_candidate" ||
      request.request_type === "career_advisory") &&
    request.candidate_user_id
  ) {
    const { data: existingProfile } = await admin
      .from("candidate_profiles")
      .select("assigned_employee_id")
      .eq("user_id", request.candidate_user_id)
      .maybeSingle();

    const { error: profileError } = await admin
      .from("candidate_profiles")
      .upsert(
        {
          user_id: request.candidate_user_id,
          assigned_employee_id: mentorId,
          updated_at: now,
        },
        { onConflict: "user_id" },
      );

    if (profileError) {
      console.error("assignServiceRequestToMentor profile error:", profileError);
      return { error: "Mentor assigned to request but candidate link failed." };
    }

    const invite = await sendAdvisoryInviteForMentorAssignment(
      request.candidate_user_id,
      mentorId,
      {
        mentorChanged: existingProfile?.assigned_employee_id !== mentorId,
      },
    );

    if (invite.sent) {
      return {
        meetInviteSent: true,
        meetInviteMessage:
          "Meet invite with session link emailed to the candidate and mentor.",
      };
    }

    if (invite.error) {
      return {
        meetInviteSent: false,
        meetInviteMessage: invite.error,
      };
    }
  }

  return {};
}

/**
 * After a mentor is assigned (or changed), email the meeting details and Meet
 * link to both the candidate and the mentor — but only when the candidate has
 * an upcoming career advisory session booked.
 *
 * If the same mentor is re-assigned and the invite already went out, nothing
 * is re-sent.
 */
async function sendAdvisoryInviteForMentorAssignment(
  candidateId: string,
  mentorId: string,
  options: { mentorChanged: boolean },
): Promise<{ sent: boolean; skipped?: boolean; error?: string }> {
  const admin = createAdminClient();

  const { data: intake } = await admin
    .from("career_advisory_intakes")
    .select(
      "name, email, phone, graduation_details, branch, interested_technology, session_scheduled_at, invite_sent_at",
    )
    .eq("candidate_id", candidateId)
    .maybeSingle();

  if (!intake?.session_scheduled_at) {
    return { sent: false, skipped: true };
  }

  // Same mentor + invite already delivered → nothing to do.
  if (!options.mentorChanged && intake.invite_sent_at) {
    return { sent: false, skipped: true };
  }

  const sessionStart = new Date(intake.session_scheduled_at);
  if (Number.isNaN(sessionStart.getTime())) {
    return { sent: false, error: "Career advisory session time is invalid." };
  }

  if (sessionStart.getTime() <= Date.now()) {
    return {
      sent: false,
      error:
        "Mentor assigned, but the booked session time has already passed — Meet invite was not sent.",
    };
  }

  if (!intake.email?.trim()) {
    return {
      sent: false,
      error: "Mentor assigned, but the candidate has no email on their advisory request.",
    };
  }

  const { data: mentorUser } = await admin
    .from("users")
    .select("email, name")
    .eq("id", mentorId)
    .maybeSingle();

  if (!mentorUser?.email) {
    return {
      sent: false,
      error: "Mentor assigned, but the mentor account has no email address.",
    };
  }

  const result = await sendCareerAdvisoryMeetInvite({
    candidateId,
    candidateName: intake.name,
    candidateEmail: intake.email,
    candidatePhone: intake.phone ?? "",
    branch: intake.branch ?? "",
    graduationDetails: intake.graduation_details ?? "",
    interestedTechnology: intake.interested_technology ?? "",
    sessionScheduledAt: intake.session_scheduled_at,
    mentorEmail: mentorUser.email,
    mentorName: mentorUser.name,
    skipBookingWindowCheck: true,
  });

  if (result.sent) {
    const now = new Date().toISOString();
    await admin
      .from("career_advisory_intakes")
      .update({
        google_meet_link: result.meetUrl,
        invite_sent_at: now,
        updated_at: now,
      })
      .eq("candidate_id", candidateId);

    return { sent: true };
  }

  if ("skipped" in result && result.skipped) {
    return {
      sent: false,
      error:
        "Mentor assigned, but Meet invites are not configured (set CAREER_ADVISORY_GOOGLE_MEET_URL).",
    };
  }

  const error =
    "error" in result
      ? result.error
      : "Mentor assigned, but the Meet invite email could not be sent.";
  console.error("sendAdvisoryInviteForMentorAssignment email failed:", error);
  return { sent: false, error };
}

export async function assignCandidateToMentor(
  candidateId: string,
  mentorId: string,
  managerId: string,
): Promise<{ error?: string; meetInviteSent?: boolean; meetInviteMessage?: string }> {
  const admin = createAdminClient();

  const { data: mentor, error: mentorError } = await admin
    .from("users")
    .select("id, role")
    .eq("id", mentorId)
    .eq("role", "admin")
    .maybeSingle();

  if (mentorError || !mentor) {
    return { error: "Selected mentor was not found." };
  }

  const { data: candidate, error: candidateError } = await admin
    .from("users")
    .select("id, role")
    .eq("id", candidateId)
    .maybeSingle();

  if (candidateError || !candidate) {
    return { error: "Candidate was not found." };
  }

  if (candidate.role !== "free_candidate" && candidate.role !== "subscribed_candidate") {
    return { error: "Only candidates can be assigned to a mentor." };
  }

  const { data: existingProfile } = await admin
    .from("candidate_profiles")
    .select("assigned_employee_id")
    .eq("user_id", candidateId)
    .maybeSingle();

  const now = new Date().toISOString();
  const { error: profileError } = await admin.from("candidate_profiles").upsert(
    {
      user_id: candidateId,
      assigned_employee_id: mentorId,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );

  if (profileError) {
    console.error("assignCandidateToMentor profile error:", profileError);
    return { error: "Could not assign mentor to this candidate." };
  }

  await admin
    .from("service_requests")
    .update({
      assigned_mentor_id: mentorId,
      assigned_by: managerId,
      assigned_at: now,
      status: "assigned",
      updated_at: now,
    })
    .eq("candidate_user_id", candidateId)
    .eq("request_type", "new_candidate")
    .eq("status", "open");

  const invite = await sendAdvisoryInviteForMentorAssignment(candidateId, mentorId, {
    mentorChanged: existingProfile?.assigned_employee_id !== mentorId,
  });

  if (invite.sent) {
    return {
      meetInviteSent: true,
      meetInviteMessage:
        "Meet invite with session link emailed to the candidate and mentor.",
    };
  }

  if (invite.error) {
    return {
      meetInviteSent: false,
      meetInviteMessage: invite.error,
    };
  }

  return {};
}

export async function updateServiceRequestStatus(
  requestId: string,
  status: ServiceRequestStatus,
  staff: StaffContext,
): Promise<{ error?: string }> {
  if (staff.role === "admin") {
    return {
      error:
        "Mentors can only close career advisory bookings with meeting remarks.",
    };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("service_requests")
    .update({ status, updated_at: now })
    .eq("id", requestId);

  if (error) {
    console.error("updateServiceRequestStatus error:", error);
    return { error: "Could not update request status." };
  }

  return {};
}

export async function closeCareerAdvisoryServiceRequest(
  requestId: string,
  remarks: string,
  staff: StaffContext,
): Promise<{ error?: string }> {
  if (staff.role !== "admin") {
    return { error: "Only mentor admins can close advisory requests." };
  }

  const trimmedRemarks = remarks.trim();
  if (trimmedRemarks.length < 10) {
    return { error: "Add at least a few sentences of meeting remarks." };
  }

  const supabase = await createClient();
  const { data: request, error: fetchError } = await supabase
    .from("service_requests")
    .select(
      "id, request_type, first_name, last_name, email, status, assigned_mentor_id, session_scheduled_at",
    )
    .eq("id", requestId)
    .maybeSingle();

  if (fetchError || !request) {
    return { error: "Request was not found." };
  }

  if (request.request_type !== "career_advisory") {
    return { error: "This request cannot be closed from the mentor inbox." };
  }

  if (request.assigned_mentor_id !== staff.userId) {
    return { error: "This advisory request is not assigned to you." };
  }

  if (request.status === "closed") {
    return { error: "This request is already closed." };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("service_requests")
    .update({
      status: "closed",
      meeting_remarks: trimmedRemarks,
      submitted_to_manager_at: now,
      updated_at: now,
    })
    .eq("id", requestId)
    .eq("assigned_mentor_id", staff.userId);

  if (error) {
    console.error("closeCareerAdvisoryServiceRequest error:", error);
    return { error: "Could not close this request." };
  }

  const admin = createAdminClient();
  const { data: mentorUser } = await admin
    .from("users")
    .select("name, email")
    .eq("id", staff.userId)
    .maybeSingle();

  void notifyManagersOfAdvisoryMeetingRemarks({
    candidateName: `${request.first_name} ${request.last_name}`.trim(),
    candidateEmail: request.email,
    mentorName: mentorUser?.name ?? mentorUser?.email ?? "Mentor admin",
    mentorEmail: mentorUser?.email ?? "",
    sessionScheduledAt: request.session_scheduled_at,
    remarks: trimmedRemarks,
  });

  return {};
}

export async function listManagerEmails(): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("email")
    .eq("role", "manager");

  return (data ?? []).map((row) => row.email).filter(Boolean);
}
