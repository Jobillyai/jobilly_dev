import { beforeAll, describe, expect, it, vi } from "vitest";
import type { TailoredResume } from "@/lib/resume-tailoring";

vi.mock("server-only", () => ({}));

const resume: TailoredResume = {
  contact: {
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "555-0100",
    location: "New York",
    linkedin: "https://linkedin.com/in/janedoe",
    website: "",
  },
  headline: "Software Engineer",
  headlineEvidence: "Software Engineer focused on reliable web applications.",
  summary: "Software Engineer focused on reliable web applications.",
  summaryEvidence: ["Software Engineer focused on reliable web applications."],
  skills: ["TypeScript", "React"],
  experience: [
    {
      company: "Acme Corp",
      role: "Software Engineer",
      location: "New York",
      startDate: "2022",
      endDate: "Present",
      evidence: "Software Engineer at Acme Corp.",
      bullets: [
        {
          text: "Built customer dashboards with React and TypeScript.",
          evidence: "Built customer dashboards with React and TypeScript.",
        },
      ],
    },
  ],
  education: [],
  projects: [],
  certifications: [],
  matchedKeywords: ["TypeScript"],
  missingRequirements: [],
  changeSummary: ["Moved matching experience first."],
};

let buildDocx: (resume: TailoredResume) => Promise<Buffer>;
let buildPdf: (resume: TailoredResume) => Promise<Buffer>;

beforeAll(async () => {
  const renderer = await import("@/server/services/resume-document-renderer");
  buildDocx = renderer.buildTailoredResumeDocx;
  buildPdf = renderer.buildTailoredResumePdf;
});

describe("tailored resume document rendering", () => {
  it("creates an editable DOCX archive", async () => {
    const output = await buildDocx(resume);
    expect(output.byteLength).toBeGreaterThan(1_000);
    expect(output.subarray(0, 2).toString("ascii")).toBe("PK");
  });

  it("creates a standards-compliant PDF", async () => {
    const output = await buildPdf(resume);
    expect(output.byteLength).toBeGreaterThan(1_000);
    expect(output.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });
});
