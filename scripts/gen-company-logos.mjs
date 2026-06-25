import fs from "node:fs";
import path from "node:path";
import iconsJson from "../node_modules/simple-icons/data/simple-icons.json" with { type: "json" };

const ICONS_DIR = path.join("node_modules", "simple-icons", "icons");

const FALLBACKS = {
  microsoft: {
    title: "Microsoft",
    hex: "5E5E5E",
    path: "M0 0h11.377v11.372H0zm12.623 0H24v11.372H12.623zM0 12.623h11.377V24H0zm12.623 0H24V24H12.623z",
  },
  adobe: {
    title: "Adobe",
    hex: "FF0000",
    path: "M16.633 16.598H7.367L5.533 21.066h-2.68L9.98 3.535h4.043l7.125 17.53h-2.68l-1.835-4.467zM9.387 14.03h5.226L12 7.982 9.387 14.03z",
  },
  salesforce: {
    title: "Salesforce",
    hex: "00A1E0",
    path: "M10.006 5.415a4.195 4.195 0 0 0-4.075 1.155 4.195 4.195 0 0 0-1.155 4.075 4.195 4.195 0 0 0 1.155 4.075 4.195 4.195 0 0 0 4.075 1.155 4.195 4.195 0 0 0 4.075-1.155 4.195 4.195 0 0 0 1.155-4.075 4.195 4.195 0 0 0-1.155-4.075 4.195 4.195 0 0 0-4.075-1.155zm10.127 3.816a4.195 4.195 0 0 0-4.075 1.155 4.195 4.195 0 0 0-1.155 4.075 4.195 4.195 0 0 0 1.155 4.075 4.195 4.195 0 0 0 4.075 1.155 4.195 4.195 0 0 0 4.075-1.155 4.195 4.195 0 0 0 1.155-4.075 4.195 4.195 0 0 0-1.155-4.075 4.195 4.195 0 0 0-4.075-1.155z",
  },
  servicenow: {
    title: "ServiceNow",
    hex: "81B5A1",
    path: "M19.598 8.04c-.698-.698-1.634-1.082-2.652-1.082-1.018 0-1.954.384-2.652 1.082l-1.294 1.294-1.294-1.294C11.008 7.342 10.072 6.958 9.054 6.958c-1.018 0-1.954.384-2.652 1.082-1.464 1.464-1.464 3.84 0 5.304l1.294 1.294 3.358 3.358 3.358-3.358 1.294-1.294c1.464-1.464 1.464-3.84 0-5.304z",
  },
  epam: {
    title: "EPAM Systems",
    hex: "39C2D7",
    path: "M4.5 6h15v2H4.5V6zm0 5h10v2h-10v-2zm0 5h15v2h-15v-2z",
  },
  ibm: {
    title: "IBM",
    hex: "052FAD",
    path: "M3.214 8.838h17.572V10.7H3.214V8.838zm0 4.296h17.572v1.862H3.214v-1.862zm0 4.296h11.732v1.862H3.214v-1.862z",
  },
  openai: {
    title: "OpenAI",
    hex: "412991",
    path: "M22.282 9.821a5.985 5.985 0 0 0-.516-4.938 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .511 4.938 6.051 6.051 0 0 0 6.515 2.901 5.985 5.985 0 0 0 3.997-2.9 6.056 6.056 0 0 0 3.285-5.315zM9.018 17.688a3.999 3.999 0 0 1-3.242-1.588 4.006 4.006 0 0 1-.776-3.224 3.998 3.998 0 0 1 1.588-3.242 4.006 4.006 0 0 1 3.224-.776 3.998 3.998 0 0 1 3.242 1.588 4.006 4.006 0 0 1 .776 3.224 3.998 3.998 0 0 1-1.588 3.242 4.006 4.006 0 0 1-3.224.776zm7.138-7.892a3.999 3.999 0 0 1-3.242-1.588 4.006 4.006 0 0 1-.776-3.224 3.998 3.998 0 0 1 1.588-3.242 4.006 4.006 0 0 1 3.224-.776 3.998 3.998 0 0 1 3.242 1.588 4.006 4.006 0 0 1 .776 3.224 3.998 3.998 0 0 1-1.588 3.242 4.006 4.006 0 0 1-3.224.776z",
  },
  amazon: {
    title: "Amazon",
    hex: "FF9900",
    path: "M12.017 17.714V22H7.119C5.237 22 3 20.046 3 17.326c0-4.138 5.014-7.412 9.478-10.412 4.463-3 5.118-3.866 5.118-5.516 0-1.933-1.601-2.933-3.516-2.933-2.218 0-3.712 1.088-4.078 3.012h-4.764c.412-4.027 3.758-6.91 8.896-6.91 5.098 0 8.489 2.754 8.489 7.022 0 3.826-2.167 5.737-6.363 8.514-3.698 2.516-4.764 3.903-4.764 6.36 0 1.514.983 2.483 2.657 2.483h4.707zm1.057-11.071c0-1.802-1.483-3.054-3.601-3.054-2.085 0-3.586 1.252-3.801 3.054h7.402z",
  },
};

const TOP_ROW = [
  "google",
  "microsoft",
  "nvidia",
  "apple",
  "adobe",
  "salesforce",
  "cisco",
  "servicenow",
  "epam",
];
const BOTTOM_ROW = [
  "gitlab",
  "ibm",
  "openai",
  "databricks",
  "airbnb",
  "stripe",
  "atlassian",
  "amazon",
  "meta",
];

function readSvgPath(slug) {
  const svgPath = path.join(ICONS_DIR, `${slug}.svg`);
  if (!fs.existsSync(svgPath)) {
    return null;
  }
  const svg = fs.readFileSync(svgPath, "utf8");
  const match = svg.match(/<path[^>]*\sd="([^"]+)"/);
  return match?.[1] ?? null;
}

function get(id) {
  const fb = FALLBACKS[id];
  if (fb) return { id, ...fb };

  const icon = iconsJson.find((entry) => entry.slug === id);
  if (!icon) {
    throw new Error(`Missing icon metadata: ${id}`);
  }

  const svgPath = readSvgPath(id);
  return {
    id,
    title: icon.title,
    hex: icon.hex,
    ...(svgPath ? { path: svgPath } : {}),
  };
}

const companies = Object.fromEntries(
  [...TOP_ROW, ...BOTTOM_ROW].map((id) => [id, get(id)]),
);

const file = `/** Company logo data for the welcome-page marquee. */

export type CompanyLogo = {
  id: string;
  title: string;
  hex: string;
  path?: string;
};

export const TOP_ROW_COMPANY_IDS = ${JSON.stringify(TOP_ROW, null, 2)} as const;

export const BOTTOM_ROW_COMPANY_IDS = ${JSON.stringify(BOTTOM_ROW, null, 2)} as const;

export const companyLogos: Record<string, CompanyLogo> = ${JSON.stringify(companies, null, 2)};
`;

fs.writeFileSync("src/components/marketing/company-logos.ts", file);
console.log("Generated company-logos.ts");
