export type ServiceStatus = "live" | "coming_soon";
export type ServiceTier = "free" | "premium";
export type ServicePhase = "discover" | "prepare" | "practice" | "apply";

export type PremiumPlanId = "mock-interviews" | "job-applications" | "mock-and-job";

export type PremiumPlan = {
  id: PremiumPlanId;
  title: string;
  shortLabel: string;
  tagline: string;
  priceUsd: number;
  description: string;
  includes: string[];
  featured?: boolean;
  savingsLabel?: string;
  ctaLabel: string;
};

export const premiumPlans: PremiumPlan[] = [
  {
    id: "mock-interviews",
    title: "Mock Interviews",
    shortLabel: "Mock Interviews",
    tagline: "Practice until it clicks",
    priceUsd: 79.99,
    description:
      "Voice AI mock interviews styled after real company interviewers, with scored feedback after every session.",
    includes: [
      "Voice AI mock interviews with company personas",
      "Meta, Google, and Amazon interviewer styles",
      "Scored feedback after every session",
      "Unlimited practice rounds",
      "Behavioral and technical question modes",
      "Interview readiness progress tracking",
    ],
    ctaLabel: "Start practicing",
  },
  {
    id: "job-applications",
    title: "Job Applications",
    shortLabel: "Job Applications",
    tagline: "We apply while you prepare",
    priceUsd: 99.99,
    description:
      "Our team searches matched roles on Indeed and LinkedIn, applies on your behalf, and keeps every application visible in your portal.",
    includes: [
      "Dedicated Jobilly team with human oversight",
      "Indeed & LinkedIn job matching for your target role",
      "Resume tailored for each application",
      "ATS-matched resumes for every role",
      "Quality-checked applications — no spray-and-pray",
      "Applied roles tracked in your candidate portal",
      "Progress updates from your Jobilly team",
      "Direct communication with your recruiter",
    ],
    ctaLabel: "Start applying",
  },
  {
    id: "mock-and-job",
    title: "Mock Interviews + Job Applications",
    shortLabel: "Full Bundle",
    tagline: "Practice and apply — complete path",
    priceUsd: 149.99,
    description:
      "Everything in Mock Interviews and Job Applications — practice with AI personas, then let our team apply to matched roles on your behalf.",
    includes: [
      "Everything in Mock Interviews",
      "Everything in Job Applications",
      "Voice mock interviews + managed apply support",
      "Resume tailored and ATS-optimized per role",
      "Indeed & LinkedIn matching with human oversight",
      "Full visibility in your candidate portal",
      "One subscription — complete graduate-to-hired path",
    ],
    featured: true,
    savingsLabel: "Save $30/month vs buying separately ($179.98/mo)",
    ctaLabel: "Get the full bundle",
  },
];

export const productTrustPoints = [
  "Human oversight",
  "Quality over quantity",
  "Portal visibility",
] as const;

export const freeIncludedServices = [
  "Career Advisory sessions",
] as const;

export function formatPlanPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatPlanPriceMonthly(amount: number): string {
  return `${formatPlanPrice(amount)}/month`;
}

export type CandidateService = {
  id: string;
  title: string;
  tagline: string;
  description: string;
  highlights: string[];
  status: ServiceStatus;
  tier: ServiceTier;
  phase: ServicePhase;
  priceUsd?: number;
  dashboardHref?:
    | "/dashboard/career-advisory"
    | "/dashboard/profile"
    | "/dashboard/calendar"
    | "/dashboard/applications";
  featured?: boolean;
};

export const candidateServices: CandidateService[] = [
  {
    id: "career-advisory",
    title: "Career Advisory",
    tagline: "Clarity before the job hunt",
    description:
      "Book a one-on-one session with our career team. Share your background, target roles, and constraints — we return a focused plan for skills, timeline, and next steps.",
    highlights: [
      "Personalized learning path",
      "Role and market guidance",
      "Google Meet sessions",
      "Session notes & follow-ups",
      "Mentor admin support",
    ],
    status: "live",
    tier: "free",
    phase: "discover",
    dashboardHref: "/dashboard/career-advisory",
    featured: true,
  },
  {
    id: "growth-school",
    title: "Growth School",
    tagline: "Learn like top companies hire",
    description:
      "AI-generated micro-lessons, quizzes, and coding challenges mapped to how Meta, Google, and Amazon evaluate candidates in production roles.",
    highlights: [
      "Skill-based micro-lessons",
      "Progressive unlock path",
      "Real-world project prompts",
      "Quizzes & coding challenges",
      "Mapped to top company hiring bar",
    ],
    status: "coming_soon",
    tier: "free",
    phase: "prepare",
  },
  {
    id: "mock-interviews",
    title: "Voice Mock Interviews",
    tagline: "Practice with company personas",
    description:
      "Run voice AI interviews styled after real company interviewers. Get scored feedback and iterate until behavioral and technical rounds feel natural.",
    highlights: [
      "Meta, Google, Amazon personas",
      "Voice-based practice",
      "Feedback after every session",
      "Behavioral & technical modes",
      "Unlimited practice rounds",
    ],
    status: "coming_soon",
    tier: "premium",
    priceUsd: 79.99,
    phase: "practice",
    featured: true,
  },
  {
    id: "applications",
    title: "Managed Applications",
    tagline: "We apply while you grow",
    description:
      "Our team searches Indeed and LinkedIn for matched roles, applies on your behalf, and keeps you updated in your candidate portal — so you focus on learning and interview prep.",
    highlights: [
      "Indeed & LinkedIn job matching",
      "Applied roles in your portal",
      "Resume tailored per application",
      "Human recruiter oversight",
      "Real-time application updates",
    ],
    status: "live",
    tier: "premium",
    priceUsd: 99.99,
    phase: "apply",
    dashboardHref: "/dashboard/applications",
    featured: true,
  },
];

export function getPremiumPlan(planId: PremiumPlanId): PremiumPlan | undefined {
  return premiumPlans.find((plan) => plan.id === planId);
}

export const servicePhases: { id: ServicePhase | "all"; label: string; summary: string }[] = [
  { id: "all", label: "All services", summary: "Everything in one place" },
  { id: "discover", label: "Discover", summary: "Find your direction" },
  { id: "prepare", label: "Prepare", summary: "Build a winning profile" },
  { id: "practice", label: "Practice", summary: "Train for interviews" },
  { id: "apply", label: "Apply", summary: "Land the role" },
];

export function getServicesByPhase(phase: ServicePhase | "all"): CandidateService[] {
  if (phase === "all") {
    return candidateServices;
  }
  return candidateServices.filter((service) => service.phase === phase);
}

export const defaultPremiumPlanId: PremiumPlanId = "mock-and-job";
