import { describe, expect, it } from "vitest";
import {
  calculateTailoredResumeAtsScore,
  validateTailoredResumeEvidence,
  type TailoredResume,
} from "@/lib/resume-tailoring";

const sourceResume = [
  "Jane Doe jane@example.com New York linkedin.com/in/janedoe",
  "Software Engineer at Acme Corp from Jan 2022 to Present.",
  "Improved API response time by 20% using TypeScript and Node.js.",
  "Built customer dashboards with React and TypeScript.",
  "BS Computer Science, State University, 2021.",
].join(" ");

function validResume(): TailoredResume {
  return {
    contact: {
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "",
      location: "New York",
      linkedin: "linkedin.com/in/janedoe",
      website: "",
    },
    headline: "Software Engineer",
    headlineEvidence: "Software Engineer at Acme Corp from Jan 2022 to Present.",
    summary: "Software Engineer who improved API response time by 20%.",
    summaryEvidence: [
      "Improved API response time by 20% using TypeScript and Node.js.",
    ],
    skills: ["TypeScript", "Node.js", "React"],
    experience: [
      {
        company: "Acme Corp",
        role: "Software Engineer",
        location: "",
        startDate: "Jan 2022",
        endDate: "Present",
        evidence: "Software Engineer at Acme Corp from Jan 2022 to Present.",
        bullets: [
          {
            text: "Improved API response time by 20% using TypeScript and Node.js.",
            evidence: "Improved API response time by 20% using TypeScript and Node.js.",
          },
        ],
      },
    ],
    education: [
      {
        institution: "State University",
        degree: "BS Computer Science",
        date: "2021",
        details: "",
        evidence: "BS Computer Science, State University, 2021.",
      },
    ],
    projects: [],
    certifications: [],
    matchedKeywords: ["TypeScript", "React", "Node.js"],
    missingRequirements: ["AWS"],
    changeSummary: ["Prioritized API performance experience."],
  };
}

describe("resume tailoring factuality", () => {
  it("accepts generated content backed by source evidence", () => {
    expect(validateTailoredResumeEvidence(validResume(), sourceResume)).toEqual([]);
  });

  it("rejects fabricated skills and numeric claims", () => {
    const resume = validResume();
    resume.skills.push("Kubernetes");
    resume.experience[0]!.bullets[0]!.text =
      "Improved API response time by 50% using TypeScript.";

    const errors = validateTailoredResumeEvidence(resume, sourceResume);
    expect(errors.some((error) => error.includes("Kubernetes"))).toBe(true);
    expect(errors.some((error) => error.includes("50%"))).toBe(true);
  });

  it("calculates deterministic ATS keyword coverage", () => {
    expect(calculateTailoredResumeAtsScore(validResume())).toBe(75);
  });
});
