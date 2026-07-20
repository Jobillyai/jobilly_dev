"use server";

import { revalidatePath } from "next/cache";
import { ADMIN_APPLY_FOR_JOBS_HREF } from "@/lib/admin/apply-for-jobs-paths";
import { z } from "zod";
import { premiumPlans } from "@/lib/candidate-services";
import { getSessionUser } from "@/lib/auth/session";
import { isCandidateRole } from "@/lib/auth/roles";
import {
  completeMockCheckout,
  getCandidateSubscription,
} from "@/server/services/candidate-subscriptions";

const planIds = premiumPlans.map((plan) => plan.id) as [
  (typeof premiumPlans)[number]["id"],
  ...(typeof premiumPlans)[number]["id"][],
];

const checkoutSchema = z.object({
  plan: z.enum(planIds),
  billingName: z.string().trim().min(2, "Enter the billing name").max(120),
  billingEmail: z.string().trim().email("Enter a valid billing email"),
  billingPhone: z.string().trim().min(7, "Enter a valid phone number").max(30),
  addressLine1: z.string().trim().min(3, "Enter the billing address").max(180),
  addressLine2: z.string().trim().max(180).optional(),
  city: z.string().trim().min(2, "Enter the city").max(100),
  state: z.string().trim().min(2, "Enter the state").max(100),
  postalCode: z.string().trim().min(3, "Enter the postal code").max(20),
  country: z.string().trim().min(2).max(100),
});

export type MockCheckoutState = {
  success?: boolean;
  plan?: (typeof premiumPlans)[number]["id"];
  receiptNumber?: string;
  receiptEmailSent?: boolean;
  warning?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function completeMockCheckoutAction(
  _previous: MockCheckoutState,
  formData: FormData,
): Promise<MockCheckoutState> {
  const user = await getSessionUser();
  if (!user || !isCandidateRole(user.role)) {
    return { error: "Log in with a candidate account to choose a plan." };
  }

  const parsed = checkoutSchema.safeParse({
    plan: formData.get("plan"),
    billingName: formData.get("billingName"),
    billingEmail: formData.get("billingEmail"),
    billingPhone: formData.get("billingPhone"),
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2") || undefined,
    city: formData.get("city"),
    state: formData.get("state"),
    postalCode: formData.get("postalCode"),
    country: formData.get("country"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return { error: "Complete all billing details.", fieldErrors };
  }

  const currentSubscription = await getCandidateSubscription(user.id);
  if (currentSubscription?.plan === "mock-and-job") {
    return { error: "You already have the complete Full Bundle." };
  }
  if (currentSubscription && parsed.data.plan !== "mock-and-job") {
    return {
      error:
        "Partial paid plans can only be upgraded to the Full Bundle so existing access is not lost.",
    };
  }

  const result = await completeMockCheckout({
    userId: user.id,
    candidateName: user.name ?? parsed.data.billingName,
    candidateEmail: user.email,
    ...parsed.data,
  });

  if (result.error) {
    return { error: "Mock payment could not be completed. Please try again." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/plans");
  revalidatePath("/dashboard/applications");
  revalidatePath("/admin/candidates");
  revalidatePath(ADMIN_APPLY_FOR_JOBS_HREF);

  return {
    success: true,
    plan: parsed.data.plan,
    receiptNumber: result.receiptNumber,
    receiptEmailSent: result.receiptEmailSent,
    warning: result.warning,
  };
}
