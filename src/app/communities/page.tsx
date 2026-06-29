import type { Metadata } from "next";
import { CommunitiesPage } from "@/components/marketing/communities-page";

export const metadata: Metadata = {
  title: "Communities — Jobilly.ai",
  description:
    "Join Jobilly communities: free digest or Pro membership with AI mock interview rooms, accountability pods, and member-only sessions.",
};

export default function CommunitiesRoutePage() {
  return <CommunitiesPage />;
}
