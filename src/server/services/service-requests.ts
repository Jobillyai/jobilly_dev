import { createAdminClient } from "@/server/db/supabase-admin";
import { createClient } from "@/server/db/supabase-server";
import type { StaffContext } from "@/lib/auth/admin";

export type ServiceRequestStatus = "open" | "assigned" | "closed";

export type ServiceRequestRow = {
  id: string;
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
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  enquiry: string;
  status: ServiceRequestStatus;
  assigned_mentor_id: string | null;
  assigned_at: string | null;
  assigned_by: string | null;
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

export async function listServiceRequests(
  staff: StaffContext,
): Promise<ServiceRequestRow[]> {
  const supabase = await createClient();

  let query = supabase
    .from("service_requests")
    .select(
      "id, first_name, last_name, email, phone, enquiry, status, assigned_mentor_id, assigned_at, assigned_by, created_at, updated_at",
    )
    .order("created_at", { ascending: false });

  if (staff.role === "admin") {
    query = query.eq("assigned_mentor_id", staff.userId);
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
      status: row.status as ServiceRequestStatus,
      mentor: mentor ?? null,
    });
  });
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
): Promise<{ error?: string }> {
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

  return {};
}

export async function updateServiceRequestStatus(
  requestId: string,
  status: ServiceRequestStatus,
  staff: StaffContext,
): Promise<{ error?: string }> {
  if (staff.role === "admin" && status !== "closed") {
    return { error: "Mentors can only mark assigned requests as closed." };
  }

  const supabase = await createClient();
  const now = new Date().toISOString();

  let query = supabase
    .from("service_requests")
    .update({ status, updated_at: now })
    .eq("id", requestId);

  if (staff.role === "admin") {
    query = query.eq("assigned_mentor_id", staff.userId);
  }

  const { error } = await query;

  if (error) {
    console.error("updateServiceRequestStatus error:", error);
    return { error: "Could not update request status." };
  }

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
