function normalizeKeyword(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function parseJobSearchKeywords(value: string | null | undefined): string[] {
  if (!value) return [];
  return [
    ...new Set(
      value
        .split(/[,\n;]+/)
        .map(normalizeKeyword)
        .filter((keyword) => keyword.length >= 2),
    ),
  ];
}

export function mergeJobSearchKeywords(...groups: string[][]): string[] {
  return [...new Set(groups.flat().map(normalizeKeyword).filter(Boolean))];
}

/** Resume skills plus any admin-edited skill tokens used for JD matching. */
export function resolveSkillMatchKeywords(
  adminSkillsInput: string | null | undefined,
  resumeSkills: string[],
): string[] {
  return mergeJobSearchKeywords(parseJobSearchKeywords(adminSkillsInput), resumeSkills);
}

export function countMatchedJobKeywords(
  keywords: string[],
  job: { jdText?: string | null },
): number {
  const corpus = (job.jdText ?? "").toLowerCase();
  return keywords.filter((keyword) => {
    const tokens = normalizeKeyword(keyword)
      .split(/[^a-z0-9+#.]+/)
      .filter((token) => token.length >= 2);
    return tokens.length > 0 && tokens.every((token) => corpus.includes(token));
  }).length;
}

export function keywordCoveragePercent(matched: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((matched / total) * 100));
}

/** Indeed listings often have thin descriptions; skip the 2-skill JD gate for that source. */
export function requiresSkillDescriptionMatch(
  source: string | null | undefined,
): boolean {
  return (source ?? "").trim().toLowerCase() !== "indeed";
}

export function jobMatchesSkillFilter(
  job: { jdText?: string | null; source?: string | null },
  skills: string[],
): boolean {
  if (skills.length === 0 || !requiresSkillDescriptionMatch(job.source)) {
    return true;
  }

  return countMatchedJobKeywords(skills, job) >= Math.min(2, skills.length);
}

/** Ensures every resume skill is also stored as a search keyword. */
export function mergeResumeSkillsIntoSearchKeywords(
  skills: string[],
  searchKeywords: string[],
): string[] {
  return mergeJobSearchKeywords(searchKeywords, skills);
}

export function keywordIntentFingerprint(baseFingerprint: string, keywords: string[]): string {
  let hash = 2166136261;
  for (const character of `${baseFingerprint}:${keywords.join("|")}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `${baseFingerprint}:${(hash >>> 0).toString(16)}`;
}
