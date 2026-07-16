"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { combineFirstLastName } from "@/lib/format-person-name";
import { formatPhoneNumber, type PhoneCountry } from "@/lib/format-phone";
import { createClient } from "@/server/db/supabase-server";
import { createAdminClient } from "@/server/db/supabase-admin";
import { sendCareerAdvisoryMeetInvite } from "@/server/services/send-career-advisory-invite";
import { sendCareerAdvisorySubmissionAck } from "@/server/services/send-career-advisory-ack";
import { ensurePublicUserRecord } from "@/server/services/ensure-public-user";
import type { CandidateCareerAdvisoryIntake } from "@/server/services/career-advisory-intake";
import {
  parseSessionScheduledInput,
  validateSessionBookingTime,
} from "@/lib/career-advisory/booking-window";

const CAREER_ADVISORY_COOLDOWN_MS = 60 * 60 * 1000;

const intakeSchema = z.object({
  firstName: z.string().min(1, "Enter your first name").max(100),
  lastName: z.string().min(1, "Enter your last name").max(100),
  email: z.string().email("Enter a valid email"),
  phoneCountry: z.enum(["us", "in"], {
    required_error: "Select a country code",
  }),
  phone: z
    .string()
    .min(1, "Enter a phone number")
    .max(15, "Phone number is too long")
    .regex(/^[0-9\s()-]+$/, "Enter a valid phone number"),
  graduationDetails: z
    .string()
    .min(1, "Select your highest degree")
    .max(300),
  branch: z.string().min(1, "Enter your branch").max(200),
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
  /** True when no mentor is assigned yet: candidate got a "we received it" email instead of a Meet invite. */
  ackEmailSent?: boolean;
  sessionScheduledAt?: string;
  cooldownUntil?: string;
  submittedIntake?: CandidateCareerAdvisoryIntake;
  error?: string;
  fieldErrors?: Partial<
    Record<
      | "firstName"
      | "lastName"
      | "email"
      | "phoneCountry"
      | "phone"
      | "graduationDetails"
      | "branch"
      | "interestedTechnology"
      | "sessionScheduledAt",
      string
    >
  >;
};

function buildSubmittedIntake(input: {
  fullName: string;
  email: string;
  phone: string;
  graduationDetails: string;
  branch: string;
  isVeteran: boolean;
  interestedTechnology: string;
  sessionScheduledAt: string;
  inviteSentAt: string | null;
  googleMeetLink: string | null;
  candidateSubmittedAt: string;
  bookedAt: string;
  updatedAt: string;
}): CandidateCareerAdvisoryIntake {
  return {
    name: input.fullName,
    email: input.email,
    phone: input.phone,
    graduationDetails: input.graduationDetails,
    branch: input.branch,
    isVeteran: input.isVeteran,
    interestedTechnology: input.interestedTechnology,
    sessionScheduledAt: input.sessionScheduledAt,
    inviteSentAt: input.inviteSentAt,
    googleMeetLink: input.googleMeetLink,
    candidateSubmittedAt: input.candidateSubmittedAt,
    bookedAt: input.bookedAt,
    updatedAt: input.updatedAt,
  };
}

export async function submitCareerAdvisoryAction(
  _prevState: CareerAdvisoryState,
  formData: FormData,
): Promise<CareerAdvisoryState> {
  const parsed = intakeSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phoneCountry: formData.get("phoneCountry"),
    phone: formData.get("phone"),
    graduationDetails: formData.get("graduationDetails"),
    branch: formData.get("branch"),
    interestedTechnology: formData.get("interestedTechnology"),
    sessionScheduledAt: formData.get("sessionScheduledAt"),
  });

  if (!parsed.success) {
    const fieldErrors: NonNullable<CareerAdvisoryState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (
        key === "firstName" ||
        key === "lastName" ||
        key === "email" ||
        key === "phoneCountry" ||
        key === "phone" ||
        key === "graduationDetails" ||
        key === "branch" ||
        key === "interestedTechnology" ||
        key === "sessionScheduledAt"
      ) {
        fieldErrors[key] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const phoneDigits = parsed.data.phone.replace(/\D/g, "");
  const phoneCountry = parsed.data.phoneCountry as PhoneCountry;

  if (phoneCountry === "us" && phoneDigits.length !== 10) {
    return {
      fieldErrors: {
        phone: "Enter a valid 10-digit US phone number",
      },
    };
  }

  if (phoneCountry === "in" && phoneDigits.length !== 10) {
    return {
      fieldErrors: {
        phone: "Enter a valid 10-digit Indian phone number",
      },
    };
  }

  const formattedPhone = formatPhoneNumber(phoneCountry, phoneDigits);

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

  const admin = createAdminClient();
  const { data: existingIntake, error: existingIntakeError } = await admin
    .from("career_advisory_intakes")
    .select("candidate_submitted_at")
    .eq("candidate_id", authData.user.id)
    .maybeSingle();

  if (existingIntakeError) {
    return { error: "Could not verify your booking status. Please try again." };
  }

  if (existingIntake?.candidate_submitted_at) {
    const cooldownUntilMs =
      new Date(existingIntake.candidate_submitted_at).getTime() +
      CAREER_ADVISORY_COOLDOWN_MS;
    if (Number.isFinite(cooldownUntilMs) && cooldownUntilMs > Date.now()) {
      return {
        error: "Your career advisory form is locked for one hour after booking.",
        cooldownUntil: new Date(cooldownUntilMs).toISOString(),
      };
    }
  }

  const userReady = await ensurePublicUserRecord(authData.user);
  if (userReady.error) {
    console.error("ensurePublicUserRecord failed:", userReady.error);
    return {
      error:
        "Your account is not fully set up yet. Log out, sign in again, and retry.",
    };
  }

  const fullName = combineFirstLastName(parsed.data.firstName, parsed.data.lastName);
  const candidateSubmittedAt = new Date().toISOString();
  const intakePayload = {
    candidate_id: authData.user.id,
    name: fullName,
    email: parsed.data.email,
    phone: formattedPhone,
    graduation_details: parsed.data.graduationDetails,
    branch: parsed.data.branch,
    is_veteran: false,
    interested_technology: parsed.data.interestedTechnology,
    session_scheduled_at: sessionStart.toISOString(),
    candidate_submitted_at: candidateSubmittedAt,
    updated_at: candidateSubmittedAt,
  };

  const { data, error } = await admin
    .from("career_advisory_intakes")
    .upsert(intakePayload, { onConflict: "candidate_id" })
    .select(
      "name, email, phone, graduation_details, branch, is_veteran, interested_technology, invite_sent_at, session_scheduled_at, google_meet_link, candidate_submitted_at, created_at, updated_at",
    )
    .single();

  if (error) {
    console.error("career_advisory_intakes upsert failed:", error);
    const migrationHint =
      error.code === "42P01" || error.message.includes("does not exist")
        ? " Make sure database migrations are applied."
        : "";
    return {
      error: `Could not save your details.${migrationHint}`,
    };
  }

  if (!data) {
    return { error: "Could not save your details. Please try again." };
  }

  let sessionScheduledAt = sessionStart.toISOString();
  let inviteSentAt: string | null = null;
  let googleMeetLink: string | null = null;
  let bookedAt = new Date().toISOString();
  let updatedAt = bookedAt;
  let submittedAt = candidateSubmittedAt;

  if (data) {
    bookedAt = data.created_at;
    updatedAt = data.updated_at;
    sessionScheduledAt = data.session_scheduled_at ?? sessionScheduledAt;
    inviteSentAt = data.invite_sent_at;
    googleMeetLink = data.google_meet_link;
    submittedAt = data.candidate_submitted_at ?? candidateSubmittedAt;
  }

  // Mentor assignment decides which email the candidate receives: an assigned
  // mentor means the normal Meet invite (mentor is notified too); otherwise the
  // candidate gets a submission acknowledgment and managers are asked to assign.
  const { data: candidateProfile } = await admin
    .from("candidate_profiles")
    .select("assigned_employee_id")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  let mentor: { email: string; name: string | null } | null = null;
  if (candidateProfile?.assigned_employee_id) {
    const { data: mentorUser } = await admin
      .from("users")
      .select("email, name")
      .eq("id", candidateProfile.assigned_employee_id)
      .maybeSingle();

    if (mentorUser?.email) {
      mentor = { email: mentorUser.email, name: mentorUser.name };
    }
  }

  if (!mentor) {
    const ackResult = await sendCareerAdvisorySubmissionAck({
      candidateId: authData.user.id,
      candidateName: fullName,
      candidateEmail: parsed.data.email,
      candidatePhone: formattedPhone,
      branch: parsed.data.branch,
      graduationDetails: parsed.data.graduationDetails,
      interestedTechnology: parsed.data.interestedTechnology,
      sessionScheduledAt: sessionStart.toISOString(),
    });

    const submittedIntake = buildSubmittedIntake({
      fullName,
      email: parsed.data.email,
      phone: formattedPhone,
      graduationDetails: parsed.data.graduationDetails,
      branch: parsed.data.branch,
      isVeteran: data.is_veteran,
      interestedTechnology: parsed.data.interestedTechnology,
      sessionScheduledAt,
      inviteSentAt,
      googleMeetLink,
      candidateSubmittedAt: submittedAt,
      bookedAt,
      updatedAt,
    });

    revalidatePath("/admin");
    revalidatePath("/admin/candidates");
    revalidatePath("/admin/calendar");
    revalidatePath("/admin/tasks");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/calendar");
    revalidatePath("/dashboard/career-advisory");

    return {
      success: true,
      inviteEmailSent: false,
      ackEmailSent: ackResult.sent,
      sessionScheduledAt,
      submittedIntake,
      error: ackResult.sent
        ? undefined
        : "Your details were saved, but we could not send the confirmation email.",
    };
  }

  const inviteResult = await sendCareerAdvisoryMeetInvite({
    candidateId: authData.user.id,
    candidateName: fullName,
    candidateEmail: parsed.data.email,
    candidatePhone: parsed.data.phone,
    branch: parsed.data.branch,
    graduationDetails: parsed.data.graduationDetails,
    interestedTechnology: parsed.data.interestedTechnology,
    sessionScheduledAt: sessionStart.toISOString(),
    mentorEmail: mentor.email,
    mentorName: mentor.name,
  });

  if (inviteResult.sent) {
    inviteSentAt = new Date().toISOString();
    sessionScheduledAt = inviteResult.sessionScheduledAt;
    googleMeetLink = inviteResult.meetUrl;
    updatedAt = inviteSentAt;

    await admin
      .from("career_advisory_intakes")
      .update({
        google_meet_link: inviteResult.meetUrl,
        session_scheduled_at: inviteResult.sessionScheduledAt,
        invite_sent_at: inviteSentAt,
        updated_at: updatedAt,
      })
      .eq("candidate_id", authData.user.id);
  }

  const submittedIntake = buildSubmittedIntake({
    fullName,
    email: parsed.data.email,
    phone: formattedPhone,
    graduationDetails: parsed.data.graduationDetails,
    branch: parsed.data.branch,
    isVeteran: data.is_veteran,
    interestedTechnology: parsed.data.interestedTechnology,
    sessionScheduledAt,
    inviteSentAt,
    googleMeetLink,
    candidateSubmittedAt: submittedAt,
    bookedAt,
    updatedAt,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/candidates");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/career-advisory");

  if ("skipped" in inviteResult && inviteResult.skipped) {
    return {
      success: true,
      inviteEmailSent: false,
      sessionScheduledAt,
      submittedIntake,
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
      sessionScheduledAt,
      submittedIntake,
      error: inviteError,
    };
  }

  return {
    success: true,
    inviteEmailSent: true,
    sessionScheduledAt,
    submittedIntake,
  };
}
