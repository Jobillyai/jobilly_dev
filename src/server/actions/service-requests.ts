"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getAdminUser,
  staffIsManager,
  toStaffContext,
} from "@/lib/auth/admin";
import {
  assignCandidateToMentor,
  assignServiceRequestToMentor,
  closeCareerAdvisoryServiceRequest,
  listMentorAdmins,
  listServiceRequests,
  updateServiceRequestStatus,
  type ServiceRequestRow,
  type ServiceRequestStatus,
} from "@/server/services/service-requests";

export async function loadServiceRequestsAction(): Promise<
  { error: string } | { success: true; requests: ServiceRequestRow[] }
> {
  const admin = await getAdminUser();
  if (!admin) {
    return { error: "Unauthorized" };
  }

  const staff = toStaffContext(admin);
  const requests = await listServiceRequests(staff);
  return { success: true, requests };
}

export async function loadMentorOptionsAction(): Promise<
  { error: string } | { success: true; mentors: Awaited<ReturnType<typeof listMentorAdmins>> }
> {
  const admin = await getAdminUser();
  if (!admin || !staffIsManager(toStaffContext(admin))) {
    return { error: "Unauthorized" };
  }

  const mentors = await listMentorAdmins();
  return { success: true, mentors };
}

const assignSchema = z.object({
  requestId: z.string().uuid(),
  mentorId: z.string().uuid(),
});

export async function assignServiceRequestAction(
  requestId: string,
  mentorId: string,
): Promise<{
  error?: string;
  success?: true;
  meetInviteSent?: boolean;
  meetInviteMessage?: string;
}> {
  const admin = await getAdminUser();
  if (!admin || !staffIsManager(toStaffContext(admin))) {
    return { error: "Only managers can assign service requests." };
  }

  const parsed = assignSchema.safeParse({ requestId, mentorId });
  if (!parsed.success) {
    return { error: "Invalid assignment." };
  }

  const result = await assignServiceRequestToMentor(
    parsed.data.requestId,
    parsed.data.mentorId,
    admin.id,
  );

  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/admin/requests");
  revalidatePath("/admin/candidates");
  revalidatePath("/admin");
  return {
    success: true,
    meetInviteSent: result.meetInviteSent,
    meetInviteMessage: result.meetInviteMessage,
  };
}

const candidateAssignSchema = z.object({
  candidateId: z.string().uuid(),
  mentorId: z.string().uuid(),
});

export async function assignCandidateToMentorAction(
  candidateId: string,
  mentorId: string,
): Promise<{
  error?: string;
  success?: true;
  meetInviteSent?: boolean;
  meetInviteMessage?: string;
}> {
  const admin = await getAdminUser();
  if (!admin || !staffIsManager(toStaffContext(admin))) {
    return { error: "Only managers can assign mentors to candidates." };
  }

  const parsed = candidateAssignSchema.safeParse({ candidateId, mentorId });
  if (!parsed.success) {
    return { error: "Invalid assignment." };
  }

  const result = await assignCandidateToMentor(
    parsed.data.candidateId,
    parsed.data.mentorId,
    admin.id,
  );

  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/admin/candidates");
  revalidatePath("/admin/requests");
  revalidatePath("/admin");
  revalidatePath("/admin/calendar");
  return {
    success: true,
    meetInviteSent: result.meetInviteSent,
    meetInviteMessage: result.meetInviteMessage,
  };
}

export async function updateServiceRequestStatusAction(
  requestId: string,
  status: ServiceRequestStatus,
): Promise<{ error?: string; success?: true }> {
  const admin = await getAdminUser();
  if (!admin) {
    return { error: "Unauthorized" };
  }

  const result = await updateServiceRequestStatus(
    requestId,
    status,
    toStaffContext(admin),
  );

  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/admin/requests");
  return { success: true };
}

const closeAdvisorySchema = z.object({
  requestId: z.string().uuid(),
  remarks: z.string().min(10, "Add meeting remarks before closing."),
});

export async function closeCareerAdvisoryServiceRequestAction(
  requestId: string,
  remarks: string,
): Promise<{ error?: string; success?: true }> {
  const admin = await getAdminUser();
  if (!admin) {
    return { error: "Unauthorized" };
  }

  const parsed = closeAdvisorySchema.safeParse({ requestId, remarks });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid request." };
  }

  const result = await closeCareerAdvisoryServiceRequest(
    parsed.data.requestId,
    parsed.data.remarks,
    toStaffContext(admin),
  );

  if (result.error) {
    return { error: result.error };
  }

  revalidatePath("/admin/requests");
  return { success: true };
}
