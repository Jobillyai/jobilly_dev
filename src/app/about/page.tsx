import type { Metadata } from "next";
import { AboutPage } from "@/components/marketing/about-page";

export const metadata: Metadata = {
  title: "About",
  description:
    "Learn about Jobilly.ai — the graduate career platform combining free career advisory, AI mock interviews, and managed job applications on Indeed and LinkedIn.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Jobilly.ai",
    description:
      "From graduation to your first job: advisory, interview practice, and human-backed applications.",
    url: "/about",
  },
};

export default function AboutRoutePage() {
  return <AboutPage />;
}
