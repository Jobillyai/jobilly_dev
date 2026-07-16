import "server-only";

import React from "react";
import {
  Document as DocxDocument,
  ExternalHyperlink,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import {
  Document,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { TailoredResume } from "@/lib/resume-tailoring";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function contactParts(resume: TailoredResume): string[] {
  return [
    resume.contact.email,
    resume.contact.phone,
    resume.contact.location,
    resume.contact.linkedin,
    resume.contact.website,
  ].filter((value): value is string => Boolean(value?.trim()));
}

function docxSectionHeading(title: string): Paragraph {
  return new Paragraph({
    text: title.toUpperCase(),
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 180, after: 70 },
    border: { bottom: { color: "5170FF", size: 8, style: "single" } },
  });
}

function docxBullet(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 20 })],
    bullet: { level: 0 },
    spacing: { after: 45 },
  });
}

export async function buildTailoredResumeDocx(
  resume: TailoredResume,
): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({
      alignment: "center",
      children: [new TextRun({ text: resume.contact.name, bold: true, size: 34 })],
      spacing: { after: 40 },
    }),
    new Paragraph({
      alignment: "center",
      children: [new TextRun({ text: resume.headline, bold: true, size: 22, color: "334155" })],
      spacing: { after: 40 },
    }),
    new Paragraph({
      alignment: "center",
      children: contactParts(resume).flatMap((part, index) => [
        ...(index > 0 ? [new TextRun({ text: "  |  ", color: "64748B" })] : []),
        part.startsWith("http")
          ? new ExternalHyperlink({
              link: part,
              children: [new TextRun({ text: part, style: "Hyperlink", size: 18 })],
            })
          : new TextRun({ text: part, size: 18 }),
      ]),
      spacing: { after: 120 },
    }),
    docxSectionHeading("Professional Summary"),
    new Paragraph({
      children: [new TextRun({ text: resume.summary, size: 20 })],
      spacing: { after: 80 },
    }),
    docxSectionHeading("Skills"),
    new Paragraph({
      children: [new TextRun({ text: resume.skills.join("  •  "), size: 20 })],
      spacing: { after: 80 },
    }),
  ];

  if (resume.experience.length > 0) {
    children.push(docxSectionHeading("Experience"));
    for (const item of resume.experience) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: item.role, bold: true, size: 22 }),
            new TextRun({ text: ` — ${item.company}`, bold: true, size: 22 }),
          ],
          spacing: { before: 70, after: 20 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: [item.location, [item.startDate, item.endDate].filter(Boolean).join(" – ")]
                .filter(Boolean)
                .join(" | "),
              italics: true,
              color: "64748B",
              size: 18,
            }),
          ],
          spacing: { after: 45 },
        }),
        ...item.bullets.map((bullet) => docxBullet(bullet.text)),
      );
    }
  }

  if (resume.projects.length > 0) {
    children.push(docxSectionHeading("Projects"));
    for (const project of resume.projects) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: project.name, bold: true, size: 21 }),
            ...(project.technologies.length
              ? [
                  new TextRun({
                    text: ` | ${project.technologies.join(", ")}`,
                    italics: true,
                    color: "64748B",
                    size: 18,
                  }),
                ]
              : []),
          ],
          spacing: { before: 60, after: 30 },
        }),
        ...project.bullets.map((bullet) => docxBullet(bullet.text)),
      );
    }
  }

  if (resume.education.length > 0) {
    children.push(docxSectionHeading("Education"));
    for (const item of resume.education) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: item.degree, bold: true, size: 21 }),
            new TextRun({ text: ` — ${item.institution}`, size: 20 }),
          ],
          spacing: { before: 55, after: 15 },
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: [item.date, item.details].filter(Boolean).join(" | "),
              color: "64748B",
              size: 18,
            }),
          ],
          spacing: { after: 40 },
        }),
      );
    }
  }

  if (resume.certifications.length > 0) {
    children.push(
      docxSectionHeading("Certifications"),
      ...resume.certifications.map(docxBullet),
    );
  }

  const document = new DocxDocument({
    styles: {
      default: {
        document: { run: { font: "Arial", size: 20, color: "0F172A" } },
        heading2: {
          run: { font: "Arial", bold: true, size: 21, color: "1E3A8A" },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 540, right: 610, bottom: 540, left: 610 },
          },
        },
        children,
      },
    ],
  });
  return Buffer.from(await Packer.toBuffer(document));
}

const pdfStyles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingRight: 40,
    paddingBottom: 34,
    paddingLeft: 40,
    fontFamily: "Helvetica",
    color: "#0f172a",
    fontSize: 9.5,
    lineHeight: 1.35,
  },
  name: { fontSize: 19, fontWeight: 700, textAlign: "center" },
  headline: { marginTop: 3, fontSize: 10.5, fontWeight: 700, textAlign: "center", color: "#334155" },
  contact: { marginTop: 4, fontSize: 8.2, textAlign: "center", color: "#475569" },
  section: { marginTop: 11 },
  sectionTitle: {
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#5170ff",
    fontSize: 10,
    fontWeight: 700,
    color: "#1e3a8a",
    textTransform: "uppercase",
  },
  body: { marginTop: 4 },
  item: { marginTop: 6 },
  itemTitle: { fontSize: 10, fontWeight: 700 },
  itemMeta: { marginTop: 1, fontSize: 8.3, color: "#64748b" },
  bullet: { marginTop: 2, paddingLeft: 10 },
  link: { color: "#3155d8", textDecoration: "none" },
});

function PdfSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={pdfStyles.section}>
      <Text style={pdfStyles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function PdfResume({ resume }: { resume: TailoredResume }) {
  return (
    <Document title={`${resume.contact.name} — Tailored Resume`} author="Jobilly.ai">
      <Page size="LETTER" style={pdfStyles.page}>
        <Text style={pdfStyles.name}>{resume.contact.name}</Text>
        <Text style={pdfStyles.headline}>{resume.headline}</Text>
        <Text style={pdfStyles.contact}>
          {contactParts(resume).map((part, index) => (
            <React.Fragment key={`${part}-${index}`}>
              {index > 0 ? "  |  " : ""}
              {part.startsWith("http") ? <Link src={part} style={pdfStyles.link}>{part}</Link> : part}
            </React.Fragment>
          ))}
        </Text>

        <PdfSection title="Professional Summary">
          <Text style={pdfStyles.body}>{resume.summary}</Text>
        </PdfSection>
        <PdfSection title="Skills">
          <Text style={pdfStyles.body}>{resume.skills.join("  •  ")}</Text>
        </PdfSection>

        {resume.experience.length > 0 ? (
          <PdfSection title="Experience">
            {resume.experience.map((item, index) => (
              <View key={`${item.company}-${item.role}-${index}`} style={pdfStyles.item} wrap={false}>
                <Text style={pdfStyles.itemTitle}>{item.role} — {item.company}</Text>
                <Text style={pdfStyles.itemMeta}>
                  {[item.location, [item.startDate, item.endDate].filter(Boolean).join(" – ")]
                    .filter(Boolean).join(" | ")}
                </Text>
                {item.bullets.map((bullet, bulletIndex) => (
                  <Text key={bulletIndex} style={pdfStyles.bullet}>• {bullet.text}</Text>
                ))}
              </View>
            ))}
          </PdfSection>
        ) : null}

        {resume.projects.length > 0 ? (
          <PdfSection title="Projects">
            {resume.projects.map((project, index) => (
              <View key={`${project.name}-${index}`} style={pdfStyles.item} wrap={false}>
                <Text style={pdfStyles.itemTitle}>
                  {project.name}{project.technologies.length ? ` | ${project.technologies.join(", ")}` : ""}
                </Text>
                {project.bullets.map((bullet, bulletIndex) => (
                  <Text key={bulletIndex} style={pdfStyles.bullet}>• {bullet.text}</Text>
                ))}
              </View>
            ))}
          </PdfSection>
        ) : null}

        {resume.education.length > 0 ? (
          <PdfSection title="Education">
            {resume.education.map((item, index) => (
              <View key={`${item.institution}-${index}`} style={pdfStyles.item} wrap={false}>
                <Text style={pdfStyles.itemTitle}>{item.degree} — {item.institution}</Text>
                <Text style={pdfStyles.itemMeta}>
                  {[item.date, item.details].filter(Boolean).join(" | ")}
                </Text>
              </View>
            ))}
          </PdfSection>
        ) : null}

        {resume.certifications.length > 0 ? (
          <PdfSection title="Certifications">
            {resume.certifications.map((item, index) => (
              <Text key={index} style={pdfStyles.bullet}>• {item}</Text>
            ))}
          </PdfSection>
        ) : null}
      </Page>
    </Document>
  );
}

export async function buildTailoredResumePdf(resume: TailoredResume): Promise<Buffer> {
  return Buffer.from(await renderToBuffer(<PdfResume resume={resume} />));
}

export const TAILORED_RESUME_DOCX_MIME = DOCX_MIME;
export const TAILORED_RESUME_PDF_MIME = "application/pdf";
