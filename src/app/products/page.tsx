import type { Metadata } from "next";
import { ProductsPage } from "@/components/marketing/products-page";

export const metadata: Metadata = {
  title: "Plans & Pricing",
  description:
    "Compare Jobilly plans: AI mock interviews from $79.99/mo, managed job applications from $99.99/mo, or the full graduate-to-hired bundle for $149.99/mo.",
  alternates: { canonical: "/products" },
  openGraph: {
    title: "Jobilly Plans & Pricing",
    description:
      "Mock interviews, managed job applications, or both — priced for fresh graduates ready to get hired.",
    url: "/products",
  },
};

export default function ProductsRoutePage() {
  return <ProductsPage />;
}
