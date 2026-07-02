import type { Metadata } from "next";
import { ContactPage } from "@/components/marketing/contact-page";
import { getAdminUser } from "@/lib/auth/admin";
import { getMarketingHomePath } from "@/lib/auth/home-path";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Contact Us — Jobilly.ai",
  description:
    "Submit a service request to Jobilly.ai. Our manager will assign a mentor admin to help with your enquiry.",
};

export default async function ContactRoutePage() {
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

  return <ContactPage backHref={backHref} backLabel={backLabel} />;
}
