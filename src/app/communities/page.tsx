import type { Metadata } from "next";
import { CommunitiesPage } from "@/components/marketing/communities-page";

export const metadata: Metadata = {
  title: "Career Communities",
  description:
    "Join Jobilly communities for accountability, AI mock interview rooms, member sessions, and a free career digest for fresh graduates.",
  alternates: { canonical: "/communities" },
  openGraph: {
    title: "Jobilly Career Communities",
    description:
      "Free digest or Pro membership with AI mock interview rooms and accountability pods.",
    url: "/communities",
  },
};

export default function CommunitiesRoutePage() {
  return <CommunitiesPage />;
}
