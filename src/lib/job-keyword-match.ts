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

export function countMatchedJobKeywords(
  keywords: string[],
  job: { role: string; jdText?: string | null },
): number {
  const corpus = `${job.role} ${job.jdText ?? ""}`.toLowerCase();
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

export function keywordIntentFingerprint(baseFingerprint: string, keywords: string[]): string {
  let hash = 2166136261;
  for (const character of `${baseFingerprint}:${keywords.join("|")}`) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `${baseFingerprint}:${(hash >>> 0).toString(16)}`;
}
