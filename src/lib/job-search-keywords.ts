const ROLE_KEYWORD_GROUPS: Array<{
  pattern: RegExp;
  keywords: string[];
}> = [
  {
    pattern: /\b(frontend|front end|react|ui developer)\b/i,
    keywords: ["React", "TypeScript", "JavaScript", "HTML", "CSS"],
  },
  {
    pattern: /\b(backend|back end)\b/i,
    keywords: ["API", "SQL", "Node.js", "Python", "Java"],
  },
  {
    pattern: /\b(full stack|fullstack)\b/i,
    keywords: ["React", "TypeScript", "Node.js", "API", "SQL"],
  },
  {
    pattern: /\b(data analyst|business intelligence|bi analyst)\b/i,
    keywords: ["SQL", "Excel", "Tableau", "Power BI", "data visualization"],
  },
  {
    pattern: /\b(data scientist|machine learning|ml engineer|ai engineer)\b/i,
    keywords: ["Python", "SQL", "machine learning", "statistics", "TensorFlow"],
  },
  {
    pattern: /\b(devops|site reliability|sre|platform engineer)\b/i,
    keywords: ["AWS", "Docker", "Kubernetes", "Terraform", "CI/CD"],
  },
  {
    pattern: /\b(cloud engineer|cloud architect)\b/i,
    keywords: ["AWS", "Azure", "GCP", "Terraform", "Kubernetes"],
  },
  {
    pattern: /\b(qa|quality assurance|test engineer|automation engineer)\b/i,
    keywords: ["Selenium", "Cypress", "Playwright", "API testing", "automation"],
  },
  {
    pattern: /\b(cybersecurity|security engineer|security analyst)\b/i,
    keywords: ["SIEM", "SOC", "cloud security", "incident response", "vulnerability"],
  },
  {
    pattern: /\b(android|ios|mobile developer|mobile engineer)\b/i,
    keywords: ["mobile", "Kotlin", "Swift", "React Native", "Flutter"],
  },
  {
    pattern: /\b(product manager|product owner)\b/i,
    keywords: ["product strategy", "roadmap", "Agile", "analytics", "stakeholder"],
  },
  {
    pattern: /\b(business analyst|systems analyst)\b/i,
    keywords: ["requirements", "SQL", "process improvement", "Agile", "stakeholder"],
  },
  {
    pattern: /\b(ui\/?ux|ux designer|product designer)\b/i,
    keywords: ["Figma", "user research", "prototyping", "design systems", "usability"],
  },
  {
    pattern: /\b(salesforce)\b/i,
    keywords: ["Salesforce", "Apex", "Lightning", "SOQL", "CRM"],
  },
  {
    pattern: /\b(software engineer|software developer|application developer)\b/i,
    keywords: ["software development", "API", "SQL", "algorithms", "data structures"],
  },
];

/**
 * Suggests relevant search terms from the candidate's interested role.
 * The role itself remains the primary job-board query; these terms refine it.
 */
export function suggestJobSearchKeywords(interestedRole: string): string {
  const role = interestedRole.trim();
  if (!role) {
    return "";
  }

  const matchingGroup = ROLE_KEYWORD_GROUPS.find(({ pattern }) => pattern.test(role));
  return matchingGroup?.keywords.join(", ") ?? role;
}
