"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/server/db/supabase-server";
import { sendCareerAdvisoryMeetInvite } from "@/server/services/send-career-advisory-invite";
import {
  parseSessionScheduledInput,
  validateSessionBookingTime,
} from "@/lib/career-advisory/booking-window";

const intakeSchema = z.object({
  name: z.string().min(1, "Enter your name").max(200),
  email: z.string().email("Enter a valid email"),
  phone: z
    .string()
    .min(7, "Enter a valid phone number")
    .max(20, "Phone number is too long")
    .regex(/^[0-9+\-\s()]+$/, "Enter a valid phone number"),
  graduationDetails: z
    .string()
    .min(1, "Enter your graduation details")
    .max(300),
  branch: z.string().min(1, "Enter your branch").max(200),
  isVeteran: z.enum(["yes", "no"], {
    required_error: "Select whether you are a veteran",
  }),
  interestedTechnology: z
    .string()
    .min(1, "Enter the technology you are interested in")
    .max(300),
  sessionScheduledAt: z
    .string()
    .min(1, "Choose your preferred session date and time"),
});

export type CareerAdvisoryState = {
  success?: boolean;
  inviteEmailSent?: boolean;
  sessionScheduledAt?: string;
  error?: string;
  fieldErrors?: Partial<
    Record<
      | "name"
      | "email"
      | "phone"
      | "graduationDetails"
      | "branch"
      | "isVeteran"
      | "interestedTechnology"
      | "sessionScheduledAt",
      string
    >
  >;
};

export async function submitCareerAdvisoryAction(
  _prevState: CareerAdvisoryState,
  formData: FormData,
): Promise<CareerAdvisoryState> {
  const parsed = intakeSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    graduationDetails: formData.get("graduationDetails"),
    branch: formData.get("branch"),
    isVeteran: formData.get("isVeteran"),
    interestedTechnology: formData.get("interestedTechnology"),
    sessionScheduledAt: formData.get("sessionScheduledAt"),
  });

  if (!parsed.success) {
    const fieldErrors: NonNullable<CareerAdvisoryState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (
        key === "name" ||
        key === "email" ||
        key === "phone" ||
        key === "graduationDetails" ||
        key === "branch" ||
        key === "isVeteran" ||
        key === "interestedTechnology" ||
        key === "sessionScheduledAt"
      ) {
        fieldErrors[key] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const sessionStart = parseSessionScheduledInput(parsed.data.sessionScheduledAt);
  if (!sessionStart) {
    return {
      fieldErrors: {
        sessionScheduledAt: "Choose a valid session date and time.",
      },
    };
  }

  const bookingValidation = validateSessionBookingTime(sessionStart);
  if (!bookingValidation.valid) {
    return {
      fieldErrors: {
        sessionScheduledAt: bookingValidation.message,
      },
    };
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return { error: "You must be logged in to submit this form." };
  }

  const { data, error } = await supabase
    .from("career_advisory_intakes")
    .upsert(
      {
        candidate_id: authData.user.id,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
        graduation_details: parsed.data.graduationDetails,
        branch: parsed.data.branch,
        is_veteran: parsed.data.isVeteran === "yes",
        interested_technology: parsed.data.interestedTechnology,
        session_scheduled_at: sessionStart.toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "candidate_id" },
    )
    .select("id")
    .single();

  if (error) {
    return {
      error:
        "Could not save your details. Make sure database migrations are applied.",
    };
  }

  if (!data) {
    return { error: "Could not save your details. Please try again." };
  }

  const inviteResult = await sendCareerAdvisoryMeetInvite({
    candidateId: authData.user.id,
    candidateName: parsed.data.name,
    candidateEmail: parsed.data.email,
    candidatePhone: parsed.data.phone,
    branch: parsed.data.branch,
    graduationDetails: parsed.data.graduationDetails,
    interestedTechnology: parsed.data.interestedTechnology,
    sessionScheduledAt: sessionStart.toISOString(),
  });

  if (inviteResult.sent) {
    await supabase
      .from("career_advisory_intakes")
      .update({
        google_meet_link: inviteResult.meetUrl,
        session_scheduled_at: inviteResult.sessionScheduledAt,
        invite_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("candidate_id", authData.user.id);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/candidates");
  revalidatePath("/admin/calendar");

  if ("skipped" in inviteResult && inviteResult.skipped) {
    return {
      success: true,
      inviteEmailSent: false,
      sessionScheduledAt: sessionStart.toISOString(),
    };
  }

  if (!inviteResult.sent) {
    const inviteError =
      "error" in inviteResult
        ? inviteResult.error
        : "Your details were saved, but we could not send the Google Meet invite email.";
    return {
      success: true,
      inviteEmailSent: false,
      sessionScheduledAt: sessionStart.toISOString(),
      error: inviteError,
    };
  }

  return {
    success: true,
    inviteEmailSent: true,
    sessionScheduledAt: inviteResult.sessionScheduledAt,
  };
}
