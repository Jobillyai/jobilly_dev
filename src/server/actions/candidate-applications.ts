"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/lib/auth/session";
import { markAppliedJobsAsViewed } from "@/server/services/candidate-jobs";

export async function markApplicationsViewedAction(): Promise<{ success: true } | { error: string }> {
  const user = await getSessionUser();
  if (!user) {
    return { error: "Unauthorized" };
  }

  await markAppliedJobsAsViewed(user.id);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/applications");

  return { success: true };
}
