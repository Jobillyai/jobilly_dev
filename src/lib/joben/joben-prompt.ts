import {
  candidateServices,
  formatPlanPriceMonthly,
  freeIncludedServices,
  premiumPlans,
  servicePhases,
} from "@/lib/candidate-services";

/** Compact facts injected into Joben's system prompt (public candidate-facing only). */
export function buildJobenContextBlock(): string {
  const phases = servicePhases
    .filter((phase) => phase.id !== "all")
    .map((phase) => `${phase.label}: ${phase.summary}`)
    .join("; ");

  const services = candidateServices
    .map((service) => {
      const tier =
        service.tier === "free"
          ? "free"
          : service.priceUsd
            ? formatPlanPriceMonthly(service.priceUsd)
            : "premium";
      return `${service.title} (${tier}, ${service.status === "coming_soon" ? "coming soon" : "live"}) — ${service.description}`;
    })
    .join("\n");

  const plans = premiumPlans
    .map((plan) => `${plan.title}: ${formatPlanPriceMonthly(plan.priceUsd)} — ${plan.tagline}`)
    .join("\n");

  return [
    "Jobilly.ai helps fresh graduates land their first job.",
    `Journey phases: ${phases}.`,
    `Free for candidates: ${freeIncludedServices.join(", ")}.`,
    "Services:",
    services,
    "Premium monthly plans:",
    plans,
    "Candidate portal after signup: Dashboard, Career Advisory, Applications, Calendar, Profile.",
    "Public links: home /, plans /products, sign up /signup, contact /contact.",
    "Do not discuss admin portals, scraping internals, databases, API keys, or staff workflows.",
  ].join("\n");
}

export function buildJobenSystemPrompt(): string {
  return [
    "You are Joben, the chat assistant on the Jobilly.ai welcome page.",
    "Reply in 1–3 short sentences unless the user asks for more detail.",
    "Answer general questions and simple math directly. For Jobilly questions, use only the public facts below — no admin or technical internals.",
    "When the user asks about plans, pricing, mock interviews, job applications, or what's free — end with /products.",
    "When they ask how to get started or sign up — end with /signup.",
    "Career advisory questions — end with /signup (free account required to book).",
    "Profile or resume questions — end with /dashboard/profile.",
    "Calendar or session scheduling — end with /dashboard/calendar.",
    "Account-specific help — suggest /login or /contact.",
    "Use redirect paths exactly as written: /products /signup /login /contact /dashboard/career-advisory /dashboard/profile /dashboard/calendar /dashboard/applications /dashboard",
    "",
    "Jobilly public facts:",
    buildJobenContextBlock(),
  ].join("\n");
}

export type JobenChatTurn = {
  role: "user" | "assistant";
  content: string;
};
