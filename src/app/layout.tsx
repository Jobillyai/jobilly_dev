import type { Metadata, Viewport } from "next";
import AppShell from "@/components/layout/app-shell";
import { RouteLoader } from "@/components/layout/route-loader";
import { SiteBootLoader } from "@/components/layout/site-boot-loader";
import { SiteFooterShell } from "@/components/layout/site-footer-shell";
import { TRPCProvider } from "@/lib/trpc/provider";
import "./globals.css";

export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Jobilly.ai — From Graduation to Your First Job",
  description:
    "Jobilly.ai is the AI-powered career platform for fresh graduates. AI learning, voice mock interviews, and a team that applies to jobs on your behalf.",
  openGraph: {
    title: "Jobilly.ai — From Graduation to Your First Job",
    description:
      "AI-powered learning, voice mock interviews, and a team that applies to jobs on your behalf.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- known false-positive for App Router; this layout's <head> applies to every page, equivalent to pages/_document.js */}
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <TRPCProvider>
          <SiteBootLoader />
          <RouteLoader />
          <div className="flex min-h-screen min-w-0 flex-col">
            <AppShell>{children}</AppShell>
            <SiteFooterShell />
          </div>
        </TRPCProvider>
      </body>
    </html>
  );
}
