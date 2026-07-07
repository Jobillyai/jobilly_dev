import { createAdminClient } from "@/server/db/supabase-admin";
import { listManagerEmails } from "@/server/services/service-requests";
import { notifyManagersOfServiceRequest } from "@/server/services/service-request-notify-email";
import { sendCandidateWelcomeEmail } from "@/server/services/send-candidate-welcome-email";

type RegisterNewCandidateSignupInput = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
};

export async function registerNewCandidateSignup(
  input: RegisterNewCandidateSignupInput,
): Promise<void> {
  const admin = createAdminClient();

  const { data: user, error: userError } = await admin
    .from("users")
    .select("id, role, email, first_name, last_name, name")
    .eq("id", input.userId)
    .maybeSingle();

  if (userError || !user) {
    console.error("registerNewCandidateSignup: user lookup failed", userError);
    return;
  }

  if (user.role !== "free_candidate" && user.role !== "subscribed_candidate") {
    return;
  }

  const firstName =
    input.firstName.trim() ||
    user.first_name?.trim() ||
    user.name?.trim().split(/\s+/)[0] ||
    "Candidate";
  const lastName =
    input.lastName.trim() ||
    user.last_name?.trim() ||
    user.name?.trim().split(/\s+/).slice(1).join(" ") ||
    "";
  const email = (input.email || user.email).trim().toLowerCase();
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || firstName;

  await admin.from("candidate_profiles").upsert(
    { user_id: input.userId },
    { onConflict: "user_id", ignoreDuplicates: true },
  );

  await sendCandidateWelcomeEmail({
    userId: input.userId,
    email,
    recipientName: displayName,
  });

  const { data: existingRequest } = await admin
    .from("service_requests")
    .select("id")
    .eq("request_type", "new_candidate")
    .eq("candidate_user_id", input.userId)
    .in("status", ["open", "assigned"])
    .maybeSingle();

  if (existingRequest) {
    return;
  }

  const enquiry =
    "New candidate signed up on Jobilly. Assign a mentor admin to support job applications and career advisory.";

  const { data: created, error: createError } = await admin
    .from("service_requests")
    .insert({
      request_type: "new_candidate",
      candidate_user_id: input.userId,
      first_name: firstName,
      last_name: lastName,
      email,
      phone: "—",
      enquiry,
      status: "open",
    })
    .select("id")
    .single();

  if (createError || !created) {
    console.error("registerNewCandidateSignup: create request failed", createError);
    return;
  }

  const managerEmails = await listManagerEmails();
  void notifyManagersOfServiceRequest({
    requestId: created.id,
    requestType: "new_candidate",
    firstName,
    lastName,
    email,
    phone: "—",
    enquiry,
    managerEmails,
  });
}
