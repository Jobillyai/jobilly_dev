import type { Metadata } from "next";
import { ContactPage } from "@/components/marketing/contact-page";
import { getAdminUser } from "@/lib/auth/admin";
import { getMarketingHomePath } from "@/lib/auth/home-path";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Jobilly.ai for career advisory, mock interviews, managed job applications, or partnership enquiries. Our team responds with next steps.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Jobilly.ai",
    description:
      "Reach Jobilly for graduate career support, product questions, and service requests.",
    url: "/contact",
  },
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
