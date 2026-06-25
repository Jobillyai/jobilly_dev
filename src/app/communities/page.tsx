import type { Metadata } from "next";
import { CommunitiesPage } from "@/components/marketing/communities-page";

export const metadata: Metadata = {
  title: "Communities — Jobilly.ai",
  description:
    "Join Jobilly communities: free digest, Pro membership with AI mock interview rooms and accountability pods, or a campus chapter for students and grads.",
};

export default function CommunitiesRoutePage() {
  return <CommunitiesPage />;
}
