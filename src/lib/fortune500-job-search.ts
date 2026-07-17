export const FORTUNE_500_SEARCH_LABEL = "Fortune 500";
const DEFAULT_DATA_URL =
  "https://raw.githubusercontent.com/EatMoreOranges/Fortune-500-Dataset/main/data/2023-fortune-500-data.csv";
const FALLBACK_COMPANIES = [
  "Walmart", "Amazon", "Exxon Mobil", "Apple", "UnitedHealth Group",
  "CVS Health", "Berkshire Hathaway", "Alphabet", "McKesson", "Chevron",
  "AmerisourceBergen", "Costco Wholesale", "Microsoft", "Cardinal Health",
  "Cigna", "Marathon Petroleum", "Phillips 66", "Valero Energy",
  "Ford Motor", "Home Depot", "General Motors", "JPMorgan Chase",
  "Kroger", "Centene", "Verizon Communications", "Walgreens Boots Alliance",
  "Fannie Mae", "Comcast", "AT&T", "Meta Platforms",
];
let companyCache: { companies: string[]; expiresAt: number } | null = null;

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], value = "", quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (character === '"') {
      if (quoted && csv[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value); value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && csv[index + 1] === "\n") index += 1;
      row.push(value); value = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else value += character;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  return rows;
}

export function parseFortune500Companies(csv: string): string[] {
  const rows = parseCsvRows(csv);
  const headerIndex = rows.findIndex((row) => row.includes("Company"));
  if (headerIndex < 0) return [];
  const companyIndex = rows[headerIndex]?.indexOf("Company") ?? -1;
  return [...new Set(rows.slice(headerIndex + 1).map((row) => row[companyIndex]?.trim()).filter((value): value is string => Boolean(value)))];
}

export async function loadFortune500Companies(): Promise<string[]> {
  if (companyCache && companyCache.expiresAt > Date.now()) return companyCache.companies;
  try {
    const response = await fetch(
      process.env.FORTUNE_500_DATA_URL?.trim() || DEFAULT_DATA_URL,
    );
    if (!response.ok) throw new Error(`Fortune dataset returned ${response.status}`);
    const companies = parseFortune500Companies(await response.text());
    if (companies.length < 400) throw new Error("Fortune dataset was incomplete");
    companyCache = { companies, expiresAt: Date.now() + 86_400_000 };
  } catch {
    companyCache = { companies: FALLBACK_COMPANIES, expiresAt: Date.now() + 3_600_000 };
  }
  return companyCache.companies;
}

function companyKey(value: string): string {
  return value.toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(incorporated|inc|corporation|corp|company|co|llc|plc|holdings?)\b/g, " ")
    .replace(/\.com\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isFortune500Company(company: string, companies: string[]): boolean {
  const target = companyKey(company);
  return companies.some((candidate) => {
    const key = companyKey(candidate);
    return key.length >= 3 && (target === key || target.includes(key) || key.includes(target));
  });
}

export function selectFortuneCompanyBatch(
  companies: string[],
  seed: string,
  size = 12,
): string[] {
  if (companies.length <= size) return companies;
  let hash = 0;
  for (const character of seed) hash = (Math.imul(hash, 31) + character.charCodeAt(0)) | 0;
  const start = Math.abs(hash) % companies.length;
  return Array.from({ length: size }, (_, offset) => companies[(start + offset) % companies.length]!)
    .filter(Boolean);
}

export function buildFortune500SearchPosition(position: string, companies: string[] = []): string {
  const companyQuery = companies.length
    ? companies.map((company) => `"${company}"`).join(" OR ")
    : '"Fortune 500" OR "Fortune 100"';
  return `${position.trim()} (${companyQuery})`;
}

export function hasFortuneCompanySignal(job: {
  company: string;
  jdText?: string | null;
}, companies: string[] = []): boolean {
  return isFortune500Company(job.company, companies) ||
    /\bfortune\s+(?:50|100|500)\b/i.test(`${job.company} ${job.jdText ?? ""}`);
}
