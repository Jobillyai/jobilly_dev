import { z } from "zod";

const evidencedBulletSchema = z.object({
  text: z.string().min(8).max(500),
  evidence: z.string().min(8).max(800),
});

const experienceSchema = z.object({
  company: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  location: z.string().max(200).optional().default(""),
  startDate: z.string().max(80).optional().default(""),
  endDate: z.string().max(80).optional().default(""),
  evidence: z.string().min(8).max(800),
  bullets: z.array(evidencedBulletSchema).min(1).max(8),
});

const educationSchema = z.object({
  institution: z.string().min(1).max(200),
  degree: z.string().min(1).max(240),
  date: z.string().max(80).optional().default(""),
  details: z.string().max(300).optional().default(""),
  evidence: z.string().min(8).max(800),
});

const projectSchema = z.object({
  name: z.string().min(1).max(200),
  technologies: z.array(z.string().min(1).max(80)).max(20).default([]),
  evidence: z.string().min(8).max(800),
  bullets: z.array(evidencedBulletSchema).min(1).max(6),
});

export const tailoredResumeSchema = z.object({
  contact: z.object({
    name: z.string().min(1).max(160),
    email: z.string().email(),
    phone: z.string().max(80).optional().default(""),
    location: z.string().max(200).optional().default(""),
    linkedin: z.string().max(300).optional().default(""),
    website: z.string().max(300).optional().default(""),
  }),
  headline: z.string().min(3).max(180),
  headlineEvidence: z.string().min(8).max(800),
  summary: z.string().min(20).max(900),
  summaryEvidence: z.array(z.string().min(8).max(800)).min(1).max(5),
  skills: z.array(z.string().min(1).max(100)).min(1).max(40),
  experience: z.array(experienceSchema).max(12),
  education: z.array(educationSchema).max(8),
  projects: z.array(projectSchema).max(10).default([]),
  certifications: z.array(z.string().min(1).max(200)).max(15).default([]),
  matchedKeywords: z.array(z.string().min(1).max(100)).max(40).default([]),
  missingRequirements: z.array(z.string().min(1).max(200)).max(30).default([]),
  changeSummary: z.array(z.string().min(1).max(300)).min(1).max(20),
});

export type TailoredResume = z.infer<typeof tailoredResumeSchema>;

function normalizeForEvidence(value: string): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9+#@-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function evidenceExists(source: string, evidence: string): boolean {
  const normalizedEvidence = normalizeForEvidence(evidence);
  return normalizedEvidence.length >= 8 && source.includes(normalizedEvidence);
}

function containsPhrase(source: string, value: string): boolean {
  const normalized = normalizeForEvidence(value);
  return normalized.length > 0 && ` ${source} `.includes(` ${normalized} `);
}

function numbersIn(value: string): string[] {
  return value.match(/\d+(?:[.,]\d+)*(?:%|\+)?/g) ?? [];
}

export function validateTailoredResumeEvidence(
  resume: TailoredResume,
  sourceResumeText: string,
): string[] {
  const source = normalizeForEvidence(sourceResumeText);
  const errors: string[] = [];
  const assertEvidence = (label: string, evidence: string) => {
    if (!evidenceExists(source, evidence)) {
      errors.push(`${label} is not traceable to the source resume.`);
    }
  };
  const assertNumbers = (label: string, text: string, evidence: string) => {
    const evidenceNumbers = new Set(numbersIn(evidence));
    for (const number of numbersIn(text)) {
      if (!evidenceNumbers.has(number)) {
        errors.push(`${label} introduces an unsupported numeric claim: ${number}.`);
      }
    }
  };
  const assertField = (label: string, value: string, evidence: string) => {
    if (value && !containsPhrase(normalizeForEvidence(evidence), value)) {
      errors.push(`${label} is not present in its source evidence.`);
    }
  };

  assertEvidence("Headline evidence", resume.headlineEvidence);
  for (const evidence of resume.summaryEvidence) {
    assertEvidence("Summary evidence", evidence);
  }
  assertNumbers("Summary", resume.summary, resume.summaryEvidence.join(" "));

  for (const [label, value] of Object.entries(resume.contact)) {
    if (value && !containsPhrase(source, value)) {
      errors.push(`Contact ${label} is not present in the source resume.`);
    }
  }
  for (const skill of resume.skills) {
    if (!containsPhrase(source, skill)) {
      errors.push(`Skill "${skill}" is not present in the source resume.`);
    }
  }
  for (const [index, item] of resume.experience.entries()) {
    assertEvidence(`Experience ${index + 1}`, item.evidence);
    assertField(`Experience ${index + 1} company`, item.company, item.evidence);
    assertField(`Experience ${index + 1} role`, item.role, item.evidence);
    assertField(`Experience ${index + 1} start date`, item.startDate, item.evidence);
    assertField(`Experience ${index + 1} end date`, item.endDate, item.evidence);
    for (const [bulletIndex, bullet] of item.bullets.entries()) {
      const label = `Experience ${index + 1}, bullet ${bulletIndex + 1}`;
      assertEvidence(label, bullet.evidence);
      assertNumbers(label, bullet.text, bullet.evidence);
    }
  }
  for (const [index, item] of resume.education.entries()) {
    assertEvidence(`Education ${index + 1}`, item.evidence);
    assertField(`Education ${index + 1} institution`, item.institution, item.evidence);
    assertField(`Education ${index + 1} degree`, item.degree, item.evidence);
    assertField(`Education ${index + 1} date`, item.date, item.evidence);
  }
  for (const [index, item] of resume.projects.entries()) {
    assertEvidence(`Project ${index + 1}`, item.evidence);
    assertField(`Project ${index + 1} name`, item.name, item.evidence);
    for (const technology of item.technologies) {
      assertField(`Project ${index + 1} technology`, technology, item.evidence);
    }
    for (const [bulletIndex, bullet] of item.bullets.entries()) {
      const label = `Project ${index + 1}, bullet ${bulletIndex + 1}`;
      assertEvidence(label, bullet.evidence);
      assertNumbers(label, bullet.text, bullet.evidence);
    }
  }
  for (const certification of resume.certifications) {
    if (!containsPhrase(source, certification)) {
      errors.push(`Certification "${certification}" is not present in the source resume.`);
    }
  }

  return [...new Set(errors)];
}

export function calculateTailoredResumeAtsScore(resume: TailoredResume): number {
  const matched = new Set(resume.matchedKeywords.map(normalizeForEvidence));
  const missing = new Set(resume.missingRequirements.map(normalizeForEvidence));
  const total = matched.size + missing.size;
  if (total === 0) return 0;
  return Math.round((matched.size / total) * 100);
}
