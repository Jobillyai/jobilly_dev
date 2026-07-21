import type { Metadata } from "next";
import { WelcomePage } from "@/components/marketing/welcome-page";
import { SITE_DEFAULT_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: {
    absolute: `${SITE_NAME} — ${SITE_TAGLINE}`,
  },
  description: SITE_DEFAULT_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DEFAULT_DESCRIPTION,
    url: "/",
  },
};

export default function HomePage() {
  return <WelcomePage />;
}
