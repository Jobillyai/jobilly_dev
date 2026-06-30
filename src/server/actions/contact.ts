"use server";

import { z } from "zod";
import {
  checkRateLimit,
  getRequestIp,
  rateLimitErrorMessage,
} from "@/lib/rate-limit";
import {
  createServiceRequest,
  listManagerEmails,
} from "@/server/services/service-requests";
import { notifyManagersOfServiceRequest } from "@/server/services/service-request-notify-email";

const usPhoneRegex = /^(\+1[\s.-]?)?(\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}$/;

function isValidUsPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) {
    return true;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return true;
  }
  return usPhoneRegex.test(value.replace(/\s/g, ""));
}

const contactSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name").max(100),
  lastName: z.string().trim().min(1, "Enter your last name").max(100),
  email: z.string().trim().email("Enter a valid email"),
  phone: z
    .string()
    .trim()
    .min(10, "Enter a valid US phone number")
    .max(20, "Enter a valid US phone number")
    .refine(isValidUsPhone, {
      message: "Enter a valid US phone number (e.g. +1 555 123 4567)",
    }),
  enquiry: z
    .string()
    .trim()
    .min(10, "Tell us a bit more about your enquiry (at least 10 characters)")
    .max(4000, "Enquiry is too long"),
});

export type ContactFormState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<
    Record<"firstName" | "lastName" | "email" | "phone" | "enquiry", string>
  >;
};

async function enforceContactRateLimits(email: string) {
  const ip = await getRequestIp();
  const ipResult = await checkRateLimit("contactFormIp", ip);
  if (!ipResult.allowed) {
    return ipResult;
  }

  return checkRateLimit("contactFormEmail", email.trim().toLowerCase());
}

export async function submitContactFormAction(
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const parsed = contactSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    enquiry: formData.get("enquiry"),
  });

  if (!parsed.success) {
    const fieldErrors: NonNullable<ContactFormState["fieldErrors"]> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (
        key === "firstName" ||
        key === "lastName" ||
        key === "email" ||
        key === "phone" ||
        key === "enquiry"
      ) {
        fieldErrors[key] = issue.message;
      }
    }
    return { fieldErrors };
  }

  const rateLimit = await enforceContactRateLimits(parsed.data.email);
  if (!rateLimit.allowed) {
    return { error: rateLimitErrorMessage(rateLimit.retryAfterSeconds) };
  }

  const result = await createServiceRequest(parsed.data);
  if ("error" in result) {
    return { error: result.error };
  }

  const managerEmails = await listManagerEmails();
  void notifyManagersOfServiceRequest({
    requestId: result.id,
    ...parsed.data,
    managerEmails,
  });

  return {
    success:
      "Thank you — your request was submitted. Our team will reach out soon.",
  };
}
