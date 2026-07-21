import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { getAdminUser } from "@/lib/auth/admin";
import { getMarketingHomePath } from "@/lib/auth/home-path";
import { getSessionUser } from "@/lib/auth/session";
import { privacyPolicy } from "@/lib/legal/content";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Read how Jobilly.ai collects, uses, stores, and protects personal data across career advisory, learning, mock interviews, and managed job applications.",
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyRoutePage() {
  const [user, adminUser] = await Promise.all([getSessionUser(), getAdminUser()]);
  const backHref = getMarketingHomePath({
    isLoggedIn: Boolean(user),
    role: adminUser?.role,
  });
  const backLabel =
    backHref === "/admin"
      ? "Back to admin"
      : backHref === "/dashboard"
        ? "Back to dashboard"
        : "Back to home";

  return (
    <LegalPage
      document={privacyPolicy}
      backHref={backHref}
      backLabel={backLabel}
      siblingHref="/terms"
      siblingLabel="Terms of Service"
    />
  );
}
