import type { Metadata } from "next";
import { ProductsPage } from "@/components/marketing/products-page";

export const metadata: Metadata = {
  title: "Products — Jobilly.ai",
  description:
    "Pick your Jobilly plan: mock interviews from $79.99/mo, managed job applications from $99.99/mo, or the full bundle for $149.99/mo. Free career tools included.",
};

export default function ProductsRoutePage() {
  return <ProductsPage />;
}
