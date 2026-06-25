export type CommunityPricingTier = {
  label: string;
  priceUsd: number;
  period: string;
};

export type CommunityPlan = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  badge?: string;
  featured?: boolean;
  pricing: CommunityPricingTier[];
  included: string[];
  extras?: string[];
  ctaLabel: string;
  ctaHref: "/signup";
};

export type CommunityStory = {
  id: string;
  title: string;
  date: string;
  summary: string;
  stat?: string;
};

export const communityMemberCount = "2,400+";

export const communityPlans: CommunityPlan[] = [
  {
    id: "digest",
    name: "Jobilly Digest",
    tagline: "Stay in the loop — no commitment.",
    description:
      "Get the essentials: curated job alerts, launch updates, and open community events without a paid membership.",
    pricing: [{ label: "Free", priceUsd: 0, period: "forever" }],
    included: [
      "Weekly curated job & internship digest",
      "Public community announcements",
      "Read-only job board highlights",
      "Monthly open office hours (live Q&A)",
      "Launch updates & product news",
    ],
    ctaLabel: "Join free",
    ctaHref: "/signup",
  },
  {
    id: "pro",
    name: "Jobilly Pro Community",
    tagline: "Go from informed to unstoppable.",
    description:
      "The full member experience — daily role alerts, peer support, exclusive sessions, and AI-powered practice built for grads landing their first role.",
    badge: "Best value",
    featured: true,
    pricing: [
      { label: "Monthly", priceUsd: 3.99, period: "month" },
      { label: "3 months", priceUsd: 10.99, period: "3 months" },
      { label: "6 months", priceUsd: 19.99, period: "6 months" },
      { label: "Yearly", priceUsd: 29.99, period: "year" },
    ],
    included: [
      "Everything in Jobilly Digest",
      "Daily curated role alerts (US + remote)",
      "Private member channels & discussion forums",
      "Resume & LinkedIn feedback threads",
      "Interview prep playbooks & templates",
      "Member-only discounts on premium plans",
      "Early access to new Jobilly features",
    ],
    extras: [
      "Weekly AI mock interview rooms — practice with company-style personas in live groups",
      "Accountability pods — matched cohorts of 3–5 grads with weekly standups",
      "Employer AMA & referral drops — exclusive sessions with hiring managers",
    ],
    ctaLabel: "Join Pro Community",
    ctaHref: "/signup",
  },
  {
    id: "campus",
    name: "Jobilly Campus Chapter",
    tagline: "Built for students & fresh graduates.",
    description:
      "University-focused community for interns, campus hires, and early-career grads — with India & US chapter options and peer groups by major.",
    pricing: [{ label: "Student", priceUsd: 0, period: "with .edu email" }],
    included: [
      "Campus hiring & off-campus drive alerts",
      "Internship + fresher role postings",
      "Peer study groups by major & target role",
      "Scholarship & certification updates",
      "Resume clinics tailored to campus recruiting",
      "Chapter leads & local meetup coordination",
    ],
    extras: [
      "Monthly campus mock interview nights",
      "Alumni mentor matching within your chapter",
      "Offer negotiation office hours for new grads",
    ],
    ctaLabel: "Start a chapter",
    ctaHref: "/signup",
  },
];

export const communityStories: CommunityStory[] = [
  {
    id: "mock-cohort",
    title: "Spring mock interview cohort",
    date: "May 2026",
    summary:
      "Forty-two members completed six weeks of weekly AI mock rooms focused on FAANG-style behavioral and system design prompts.",
    stat: "12 offers in 6 weeks",
  },
  {
    id: "campus-hyderabad",
    title: "Campus chapter launch — Hyderabad",
    date: "April 2026",
    summary:
      "120 students joined the first Jobilly campus chapter with weekly peer resume reviews and off-campus drive alerts.",
    stat: "120 founding members",
  },
  {
    id: "stripe-ama",
    title: "Employer AMA — Stripe recruiting",
    date: "March 2026",
    summary:
      "Pro members joined a live AMA with a Stripe university recruiter covering new-grad loops, referrals, and timeline tips.",
    stat: "340 live attendees",
  },
  {
    id: "accountability-pods",
    title: "Accountability pod pilot",
    date: "February 2026",
    summary:
      "Eighteen pods of 4 grads each ran 30-day application sprints with shared trackers and weekly check-ins.",
    stat: "86% hit weekly goals",
  },
];

export function formatCommunityPrice(priceUsd: number): string {
  if (priceUsd === 0) return "Free";
  return `$${priceUsd.toFixed(2)}`;
}
