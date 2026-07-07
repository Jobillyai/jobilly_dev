import {
  candidateServices,
  formatPlanPriceMonthly,
  freeIncludedServices,
  premiumPlans,
  productTrustPoints,
  servicePhases,
} from "@/lib/candidate-services";

/** Candidate-facing areas visible on the public site and portal nav. */
export const JOBEN_VISIBLE_CANDIDATE_OPTIONS = [
  "Dashboard — track applications and upcoming sessions",
  "Career Advisory — free Google Meet sessions with our career team",
  "Applications — roles applied on your behalf (premium plan)",
  "Calendar — advisory sessions and meet links",
  "Profile — resume and contact details",
] as const;

export type JobenTopicId =
  | "greeting"
  | "overview"
  | "how_it_works"
  | "candidate_portal"
  | "pricing"
  | "career_advisory"
  | "profile"
  | "calendar"
  | "applications"
  | "mock_interviews"
  | "free_vs_premium"
  | "signup"
  | "contact"
  | "growth_school";

export type JobenTopic = {
  id: JobenTopicId;
  label: string;
  keywords: string[];
  answer: string;
  minScore?: number;
};

const pricingSummary = premiumPlans
  .map((plan) => `${plan.shortLabel}: ${formatPlanPriceMonthly(plan.priceUsd)}`)
  .join("; ");

const freeServicesSummary = freeIncludedServices.join(", ");

const phaseSummary = servicePhases
  .filter((phase) => phase.id !== "all")
  .map((phase) => `${phase.label} (${phase.summary.toLowerCase()})`)
  .join(" → ");

export const JOBEN_SUGGESTED_PROMPTS = [
  "How does Jobilly work?",
  "What is 1+1?",
  "What's free for candidates?",
  "What are the premium plans?",
] as const;

const CANDIDATE_ONLY_TOPICS: JobenTopic[] = [
  {
    id: "greeting",
    label: "Greeting",
    keywords: ["hi", "hello", "hey", "good morning", "good evening"],
    answer:
      "Hi! I'm Joben. Ask me how Jobilly works for candidates — what's free, what's in the premium plans, and what you'll see after you sign up.",
  },
  {
    id: "overview",
    label: "What is Jobilly",
    keywords: [
      "what is jobilly",
      "what does jobilly",
      "about jobilly",
      "jobilly ai",
      "tell me about jobilly",
    ],
    minScore: 2,
    answer:
      "Jobilly.ai helps fresh graduates land their first job. As a candidate you get a free portal for career advisory, profile, and calendar — plus optional paid plans for AI mock interviews and a team that applies to matched roles for you.",
  },
  {
    id: "how_it_works",
    label: "How Jobilly works",
    keywords: [
      "how does jobilly work",
      "how jobilly works",
      "how do you work",
      "how it works",
      "how does this work",
      "graduate to hired",
      "what happens",
    ],
    minScore: 2,
    answer: `For candidates, Jobilly follows four steps: ${phaseSummary}. Sign up free, book career advisory, keep your profile updated, and upgrade only if you want mock interviews or managed applications.`,
  },
  {
    id: "candidate_portal",
    label: "Candidate portal",
    keywords: [
      "candidate portal",
      "candidate dashboard",
      "after signup",
      "after sign up",
      "what can i do",
      "what do i get",
      "dashboard options",
      "portal options",
    ],
    minScore: 2,
    answer: `After you sign up, your candidate portal includes: ${JOBEN_VISIBLE_CANDIDATE_OPTIONS.join("; ")}.`,
  },
  {
    id: "pricing",
    label: "Pricing",
    keywords: [
      "price",
      "pricing",
      "plan",
      "plans",
      "cost",
      "subscription",
      "monthly",
      "how much",
      "premium plan",
      "bundle",
    ],
    minScore: 2,
    answer: `Candidate plans: free (${freeServicesSummary}). Premium monthly options — ${pricingSummary}.`,
  },
  {
    id: "free_vs_premium",
    label: "Free vs premium",
    keywords: [
      "what's free",
      "whats free",
      "free for candidate",
      "included free",
      "no cost",
      "free tier",
    ],
    minScore: 2,
    answer: `Free for every candidate: ${freeServicesSummary}. Premium adds voice mock interviews and/or managed job applications (${pricingSummary}).`,
  },
  {
    id: "career_advisory",
    label: "Career advisory",
    keywords: [
      "career advisory",
      "career advisor",
      "book session",
      "advisory session",
      "google meet session",
    ],
    minScore: 2,
    answer:
      "Career Advisory is free for candidates. Fill in your background and target role, pick a session time, and join via Google Meet. You'll get guidance on skills, timeline, and next steps.",
  },
  {
    id: "profile",
    label: "Profile",
    keywords: [
      "profile page",
      "resume hub",
      "upload resume",
      "update profile",
      "my resume",
      "linkedin profile",
    ],
    minScore: 2,
    answer:
      "In Profile you upload your resume and keep contact details current. That information is used when our team prepares applications and interview prep for you.",
  },
  {
    id: "calendar",
    label: "Calendar",
    keywords: [
      "session calendar",
      "my calendar",
      "upcoming session",
      "scheduled session",
      "meet link",
    ],
    minScore: 2,
    answer:
      "Calendar shows your upcoming and past career advisory sessions, with Google Meet links when it's time to join.",
  },
  {
    id: "mock_interviews",
    label: "Mock interviews",
    keywords: [
      "mock interview",
      "voice mock",
      "practice interview",
      "ai interview",
      "interview practice",
    ],
    minScore: 2,
    answer: `Voice Mock Interviews (${formatPlanPriceMonthly(79.99)}) let you practice with AI personas styled after real company interviewers and receive scored feedback. Listed as coming soon on the products page.`,
  },
  {
    id: "applications",
    label: "Applications",
    keywords: [
      "managed application",
      "job application",
      "apply for me",
      "team applies",
      "applied jobs",
      "applications tab",
      "indeed linkedin",
    ],
    minScore: 2,
    answer: `Managed Applications (${formatPlanPriceMonthly(99.99)}) means our team finds matched roles on Indeed and LinkedIn and applies for you with ${productTrustPoints.join(", ").toLowerCase()}. You see every application in your portal.`,
  },
  {
    id: "signup",
    label: "Get started",
    keywords: [
      "sign up",
      "signup",
      "create account",
      "get started",
      "register",
      "how to join",
    ],
    minScore: 2,
    answer:
      "Click Get started free on the home page to create your candidate account. After login you'll open your dashboard to book advisory sessions and explore plans.",
  },
  {
    id: "contact",
    label: "Contact",
    keywords: [
      "contact support",
      "contact team",
      "need help",
      "talk to someone",
      "reach out",
    ],
    minScore: 2,
    answer:
      "Use the Contact page to message our team about your candidate account or plans. We'll follow up by email.",
  },
  {
    id: "growth_school",
    label: "Growth School",
    keywords: ["growth school", "micro-lesson", "learning path", "skill lessons"],
    minScore: 2,
    answer:
      "Growth School is coming soon — AI micro-lessons and quizzes aligned with how top companies hire. It's listed on our products page for candidates.",
  },
];

export const JOBEN_CANDIDATE_TOPIC_LABELS = CANDIDATE_ONLY_TOPICS.filter(
  (topic) => topic.id !== "greeting",
).map((topic) => topic.label);

const INTERNAL_BLOCK_PATTERNS: RegExp[] = [
  /\b(admin|manager portal|mentor admin|assigned mentor|service request|staff portal)\b/i,
  /\b(supabase|database|migration|rls|api key|apify|resend|cron|env var|server)\b/i,
  /\b(scrape|scraping|scraper|actor|billing|cache|3.hour|backend)\b/i,
  /\b(source code|codebase|implementation|architecture|stack|typescript|next\.?js)\b/i,
  /\b(employee id|member id|internal|debug|logs|how is it built|technical)\b/i,
  /\b(in.?depth|deep dive|under the hood)\b/i,
];

const NON_CANDIDATE_BLOCK_PATTERNS: RegExp[] = [
  /\b(university partner|institution|institutional|cohort plan|enterprise plan)\b/i,
  /\b(partnership|white.?label|integrate with|api access|hire jobilly)\b/i,
  /\b(work at jobilly|jobs at jobilly|careers at jobilly|investor|press release)\b/i,
  /\b(recruit for us|post a job|employer portal|hiring platform)\b/i,
];

const ACCOUNT_SPECIFIC_PATTERNS: RegExp[] = [
  /\b(my application status|my account|reset my password|change my email)\b/i,
  /\b(ats score|match %|match percent|resume score)\b/i,
];

const CANDIDATE_SERVICE_IDS = new Set(
  candidateServices.map((service) => service.id),
);

export function isJobenInternalQuery(message: string): boolean {
  return INTERNAL_BLOCK_PATTERNS.some((pattern) => pattern.test(message));
}

export function isJobenNonCandidateQuery(message: string): boolean {
  return NON_CANDIDATE_BLOCK_PATTERNS.some((pattern) => pattern.test(message));
}

export function isJobenAccountSpecificQuery(message: string): boolean {
  return ACCOUNT_SPECIFIC_PATTERNS.some((pattern) => pattern.test(message));
}

function normalizeQuery(message: string): string {
  return message.trim().toLowerCase().replace(/\s+/g, " ");
}

function scoreTopic(query: string, topic: JobenTopic): number {
  let score = 0;
  for (const keyword of topic.keywords) {
    if (query.includes(keyword)) {
      score += keyword.split(" ").length >= 2 ? 4 : 1;
    }
  }
  return score;
}

function appendCandidateLink(topicId: JobenTopicId, content: string): string {
  if (
    topicId === "pricing" ||
    topicId === "applications" ||
    topicId === "mock_interviews" ||
    topicId === "free_vs_premium" ||
    topicId === "growth_school"
  ) {
    return `${content} See /products.`;
  }
  if (topicId === "signup") {
    return `${content} Start at /signup.`;
  }
  if (topicId === "contact") {
    return `${content} Go to /contact.`;
  }
  if (topicId === "career_advisory") {
    return `${content} After login: /dashboard/career-advisory.`;
  }
  if (topicId === "candidate_portal" || topicId === "how_it_works") {
    return `${content} Explore /products.`;
  }
  return content;
}

export type JobenReply = {
  content: string;
  topicId: JobenTopicId | "blocked" | "non_candidate" | "account" | "fallback";
};

function candidateOnlyFallback(): JobenReply {
  return {
    topicId: "fallback",
    content: `I only answer candidate questions about how Jobilly works on the public site — for example: how it works, what's free, premium plans, Career Advisory, Applications, Calendar, and Profile. Try one of the suggestions below or visit /products.`,
  };
}

export function respondToJobenQuery(message: string): JobenReply {
  const query = normalizeQuery(message);

  if (!query) {
    return candidateOnlyFallback();
  }

  if (isJobenInternalQuery(message)) {
    return {
      topicId: "blocked",
      content:
        "I can't share admin or technical details. I only explain how Jobilly works for candidates on the public website.",
    };
  }

  if (isJobenNonCandidateQuery(message)) {
    return {
      topicId: "non_candidate",
      content:
        "I'm set up for candidate questions only — how Jobilly helps you as a job seeker. For partnerships or institutions, use /contact and our team will respond.",
    };
  }

  if (isJobenAccountSpecificQuery(message)) {
    return {
      topicId: "account",
      content:
        "I can't see your personal account here. Log in to your candidate dashboard, or use /contact if you need help with your account.",
    };
  }

  let best: JobenTopic | null = null;
  let bestScore = 0;

  for (const topic of CANDIDATE_ONLY_TOPICS) {
    const score = scoreTopic(query, topic);
    const required = topic.minScore ?? 1;
    if (score >= required && score > bestScore) {
      bestScore = score;
      best = topic;
    }
  }

  if (best) {
    return {
      topicId: best.id,
      content: appendCandidateLink(best.id, best.answer),
    };
  }

  const serviceMatch = candidateServices.find((service) => {
    if (!CANDIDATE_SERVICE_IDS.has(service.id)) {
      return false;
    }
    const title = service.title.toLowerCase();
    const slug = service.id.replace(/-/g, " ");
    return query.includes(title) || query.includes(slug);
  });

  if (serviceMatch) {
    const tier =
      serviceMatch.tier === "free"
        ? "Free for candidates."
        : `Premium (${serviceMatch.priceUsd ? formatPlanPriceMonthly(serviceMatch.priceUsd) : "see products page"}).`;
    return {
      topicId: "overview",
      content: `${serviceMatch.title} — ${serviceMatch.description} ${tier} See /products.`,
    };
  }

  return candidateOnlyFallback();
}
