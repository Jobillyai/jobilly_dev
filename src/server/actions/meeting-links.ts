"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  getAdminUser,
  staffCanScrapeJobs,
  toStaffContext,
} from "@/lib/auth/admin";
import { getAdminCandidateById } from "@/server/services/admin-dashboard";
import {
  getDefaultGoogleMeetUrl,
  sendMentorMeetingLink,
} from "@/server/services/send-mentor-meeting-link";

const sendMeetingLinkSchema = z.object({
  candidateId: z.string().uuid(),
  meetUrl: z.string().optional(),
  sessionScheduledAt: z.string().min(1, "Choose a session date and time"),
});

export async function sendCandidateMeetingLinkAction(
  candidateId: string,
  meetUrl: string,
  sessionScheduledAt: string,
): Promise<
  | {
      success: true;
      meetUrl: string;
      sessionScheduledAt: string;
      inviteSentAt: string;
    }
  | { error: string }
> {
  const admin = await getAdminUser();
  if (!admin) {
    return { error: "Unauthorized" };
  }

  const staff = toStaffContext(admin);
  if (!staffCanScrapeJobs(staff)) {
    return { error: "Only assigned mentors can send meeting links." };
  }

  const parsed = sendMeetingLinkSchema.safeParse({
    candidateId,
    meetUrl,
    sessionScheduledAt,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const candidate = await getAdminCandidateById(parsed.data.candidateId, staff);
  if (!candidate) {
    return { error: "Candidate not found" };
  }

  const resolvedMeetUrl =
    parsed.data.meetUrl?.trim() || getDefaultGoogleMeetUrl() || "";
  if (!resolvedMeetUrl) {
    return {
      error:
        "Paste a Google Meet link or configure CAREER_ADVISORY_GOOGLE_MEET_URL.",
    };
  }

  const candidateName =
    candidate.name?.trim() ||
    candidate.submission?.name?.trim() ||
    candidate.email.split("@")[0] ||
    "Candidate";

  const result = await sendMentorMeetingLink({
    candidateId: candidate.id,
    candidateName,
    candidateEmail: candidate.email,
    meetUrl: resolvedMeetUrl,
    sessionScheduledAt: parsed.data.sessionScheduledAt,
    mentorEmail: admin.email,
  });

  if ("error" in result) {
    return { error: result.error };
  }

  revalidatePath("/admin/candidates");
  revalidatePath("/admin/tasks");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/career-advisory");

  return {
    success: true,
    meetUrl: result.meetUrl,
    sessionScheduledAt: result.sessionScheduledAt,
    inviteSentAt: result.inviteSentAt,
  };
}
