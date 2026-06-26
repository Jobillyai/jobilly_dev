const SKILL_KEYWORDS = [
  "python",
  "javascript",
  "typescript",
  "react",
  "node",
  "java",
  "sql",
  "aws",
  "azure",
  "gcp",
  "kubernetes",
  "docker",
  "machine learning",
  "data analysis",
  "communication",
  "leadership",
  "agile",
  "scrum",
  "figma",
  "excel",
  "tableau",
  "salesforce",
  "customer success",
  "project management",
] as const;

function extractJdHighlights(jdText: string | null | undefined): string[] {
  if (!jdText?.trim()) {
    return [];
  }

  const haystack = jdText.toLowerCase();
  return SKILL_KEYWORDS.filter((skill) => haystack.includes(skill)).slice(0, 5);
}

export function buildJobPreparationTips(input: {
  role: string;
  company: string;
  jdText?: string | null;
}): string[] {
  const role = input.role.trim();
  const company = input.company.trim();
  const highlights = extractJdHighlights(input.jdText);

  const tips = [
    `Our team submitted your application for ${role} at ${company}. Expect a recruiter screen or online assessment within 1–2 weeks if the role is active.`,
    `Research ${company}'s latest products, customers, and news so you can reference something specific in your first conversation.`,
    `Prepare three STAR stories (Situation, Task, Action, Result) that show skills relevant to "${role}".`,
    `Draft a 60-second "Tell me about yourself" pitch that connects your background to this ${role} opening.`,
    `Review the job description and prepare one thoughtful question for each interview stage (recruiter, hiring manager, panel).`,
    `Update your resume bullet points to mirror language from this posting — especially metrics and tools you have used in production.`,
  ];

  if (highlights.length > 0) {
    tips.push(
      `The posting emphasizes ${highlights.join(", ")}. Prepare a concrete example for each where you used or learned these skills.`,
    );
  }

  tips.push(
    `Practice a concise walkthrough of your most relevant project out loud — aim for 2–3 minutes with clear impact and your specific contribution.`,
  );

  return tips.slice(0, 7);
}

export function serializePreparationTips(tips: string[]): string {
  return JSON.stringify(tips);
}

export function parsePreparationTips(raw: string | null | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return [];
}
