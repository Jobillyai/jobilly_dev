import { experienceLevelSearchTerms } from "@/lib/format-experience-years";

function normalizeSearchFragment(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function fragmentIncludedIn(base: string, fragment: string): boolean {
  return base.toLowerCase().includes(fragment.toLowerCase());
}

function parseKeywordFilterTokens(input: string): string[] {
  return input
    .split(/[,;\n]+/)
    .flatMap((part) => part.trim().split(/\s+/))
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 1);
}

/** Builds the job-board query from role, interest keywords, and experience. */
export function composeJobSearchPosition(input: {
  interestedRole?: string | null;
  interestedTechnology?: string | null;
  branch?: string | null;
  graduationDetails?: string | null;
  careerGoals?: string | null;
  specialization?: string | null;
  profileEducation?: string | null;
  experienceYears?: number | null;
  searchKeywords?: string | null;
}): string {
  const primaryRole =
    normalizeSearchFragment(input.interestedRole) ||
    normalizeSearchFragment(input.interestedTechnology) ||
    normalizeSearchFragment(input.specialization) ||
    normalizeSearchFragment(input.branch) ||
    normalizeSearchFragment(input.graduationDetails)?.slice(0, 80) ||
    normalizeSearchFragment(input.careerGoals)?.slice(0, 80) ||
    "software engineer";

  const supplements: string[] = [];
  for (const fragment of [
    input.interestedTechnology,
    input.branch,
    input.specialization,
    input.profileEducation,
  ]) {
    const normalized = normalizeSearchFragment(fragment);
    if (normalized && !fragmentIncludedIn(primaryRole, normalized)) {
      supplements.push(normalized.split(/\s+/).slice(0, 5).join(" "));
    }
  }

  if (input.searchKeywords?.trim()) {
    for (const token of parseKeywordFilterTokens(input.searchKeywords)) {
      if (!fragmentIncludedIn(primaryRole, token)) {
        supplements.push(token);
      }
    }
  }

  const experienceParts: string[] = [];
  if (input.experienceYears !== null && input.experienceYears !== undefined) {
    experienceParts.push(...experienceLevelSearchTerms(input.experienceYears).slice(0, 2));
  }

  const unique: string[] = [];
  const seen = new Set<string>();
  for (const part of [primaryRole, ...supplements, ...experienceParts]) {
    const key = part.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(part);
    }
  }

  return unique.join(" ").replace(/\s+/g, " ").trim().slice(0, 120);
}
