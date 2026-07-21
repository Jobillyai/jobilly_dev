import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { getAdminUser } from "@/lib/auth/admin";
import { getMarketingHomePath } from "@/lib/auth/home-path";
import { getSessionUser } from "@/lib/auth/session";
import { termsOfService } from "@/lib/legal/content";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms for using Jobilly.ai, including accounts, subscriptions, AI features, managed job applications, and institutional programs.",
  alternates: { canonical: "/terms" },
};

export default async function TermsRoutePage() {
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
      document={termsOfService}
      backHref={backHref}
      backLabel={backLabel}
      siblingHref="/privacy"
      siblingLabel="Privacy Policy"
    />
  );
}
