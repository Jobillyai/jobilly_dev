import type { Metadata } from "next";
import { ContactPage } from "@/components/marketing/contact-page";

export const metadata: Metadata = {
  title: "Contact Us — Jobilly.ai",
  description:
    "Submit a service request to Jobilly.ai. Our manager will assign a mentor admin to help with your enquiry.",
};

export default function ContactRoutePage() {
  return <ContactPage />;
}
