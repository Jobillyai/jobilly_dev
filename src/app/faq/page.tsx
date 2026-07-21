import type { Metadata } from "next";
import { FaqPage } from "@/components/marketing/faq-page";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers to common questions about Jobilly.ai: free career advisory, AI mock interviews, managed job applications, pricing, and who the platform is for.",
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "Jobilly.ai FAQ",
    description:
      "Straight answers on advisory, mock interviews, managed applications, and plans.",
    url: "/faq",
  },
};

export default function FaqRoutePage() {
  return <FaqPage />;
}
