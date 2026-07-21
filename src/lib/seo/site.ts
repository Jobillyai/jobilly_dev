export const SITE_URL = "https://www.jobilly.ai";
export const SITE_NAME = "Jobilly.ai";
export const SITE_LEGAL_NAME =
  "Jobilly AI Infotech and IT Services Private Limited";

export const SITE_TAGLINE = "From graduation to your first job";

export const SITE_DEFAULT_DESCRIPTION =
  "Jobilly.ai helps fresh graduates land jobs with free career advisory, AI mock interviews, and a human team that applies to matched roles on Indeed and LinkedIn.";

export const SITE_OG_IMAGE = `${SITE_URL}/brand/jobilly-logo-arrow-name.png`;

export const SITE_LINKEDIN_URL =
  "https://www.linkedin.com/company/jobilly-ai-infotech-and-it-services-private-limited/";

export const SITE_SUPPORT_EMAIL = "info@jobilly.ai";

/** Public marketing URLs included in the sitemap (no auth/admin/dashboard). */
export const PUBLIC_SITEMAP_ROUTES = [
  { path: "/", changeFrequency: "daily" as const, priority: 1 },
  { path: "/products", changeFrequency: "weekly" as const, priority: 0.9 },
  { path: "/communities", changeFrequency: "weekly" as const, priority: 0.8 },
  { path: "/contact", changeFrequency: "monthly" as const, priority: 0.8 },
  { path: "/privacy", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly" as const, priority: 0.3 },
  { path: "/login", changeFrequency: "monthly" as const, priority: 0.5 },
  { path: "/signup", changeFrequency: "monthly" as const, priority: 0.6 },
] as const;

export type SiteFaqItem = {
  question: string;
  answer: string;
};

export const SITE_FAQS: SiteFaqItem[] = [
  {
    question: "What is Jobilly.ai?",
    answer:
      "Jobilly.ai is an AI-powered career platform for fresh graduates. It combines free career advisory, interview practice, and optional managed job applications so you can move from graduation to your first role with clear next steps.",
  },
  {
    question: "Does Jobilly apply to jobs for me?",
    answer:
      "Yes. On the Job Applications plan, a dedicated Jobilly team searches matched roles on Indeed and LinkedIn, prepares application materials, applies on your behalf with human oversight, and tracks every application in your candidate portal.",
  },
  {
    question: "What are AI mock interviews?",
    answer:
      "Jobilly mock interviews are voice AI practice sessions styled after real company interviewers, with scored feedback after every round. Plans start at $79.99/month and include unlimited practice.",
  },
  {
    question: "Is there a free way to get started?",
    answer:
      "Yes. You can book a free career advisory session, explore the platform, and use core career tools before upgrading to mock interviews, managed applications, or the full bundle.",
  },
  {
    question: "How much do Jobilly plans cost?",
    answer:
      "Mock Interviews are $79.99/month, Job Applications are $99.99/month, and the Full Bundle (mock interviews plus managed applications) is $149.99/month.",
  },
  {
    question: "Who is Jobilly for?",
    answer:
      "Jobilly is built for fresh graduates and early-career professionals who want structured career advisory, interview practice, and help applying to roles that match their background.",
  },
];

export function absoluteUrl(path = "/"): string {
  if (!path || path === "/") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
