"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getAdminUser,
  staffCanScrapeJobs,
  toStaffContext,
} from "@/lib/auth/admin";
import { notifyManagersOfDailyUpdate } from "@/server/services/admin-daily-update-email";
import { submitMentorDailyUpdate } from "@/server/services/admin-daily-updates";

const remarksSchema = z
  .string()
  .trim()
  .min(3, "Remarks must be at least 3 characters.")
  .max(4000, "Remarks are too long.");

export async function submitAdminDailyUpdateAction(
  remarks: string,
): Promise<
  | { success: true; submittedAt: string; isUpdate: boolean }
  | { error: string }
> {
  const admin = await getAdminUser();
  if (!admin) {
    return { error: "Unauthorized" };
  }

  const staff = toStaffContext(admin);
  if (!staffCanScrapeJobs(staff)) {
    return { error: "Only mentor admins can submit daily updates." };
  }

  const parsed = remarksSchema.safeParse(remarks);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid remarks." };
  }

  const result = await submitMentorDailyUpdate(staff.userId, parsed.data);
  if ("error" in result) {
    return { error: result.error };
  }

  void notifyManagersOfDailyUpdate(result.update, result.isUpdate);

  revalidatePath("/admin/tasks");
  revalidatePath("/admin");

  return {
    success: true,
    submittedAt: result.update.submittedAt,
    isUpdate: result.isUpdate,
  };
}
