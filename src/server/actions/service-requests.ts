"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getAdminUser,
  staffCanScrapeJobs,
  toStaffContext,
} from "@/lib/auth/admin";
import {
  assignServiceRequestToMentor,
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
  if (!admin || !staffCanScrapeJobs(toStaffContext(admin))) {
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
): Promise<{ error?: string; success?: true }> {
  const admin = await getAdminUser();
  if (!admin || !staffCanScrapeJobs(toStaffContext(admin))) {
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
  return { success: true };
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
