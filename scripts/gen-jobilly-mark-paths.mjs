import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const svg = fs.readFileSync(path.join(root, "public/brand/jobilly-mark.svg"), "utf8");
const widthMatch = svg.match(/\bwidth="(\d+(?:\.\d+)?)"/);
const heightMatch = svg.match(/\bheight="(\d+(?:\.\d+)?)"/);
const viewboxWidth = widthMatch ? Number(widthMatch[1]) : 375;
const viewboxHeight = heightMatch ? Number(heightMatch[1]) : 290;

const inner = svg
  .replace(/<\?xml[^>]*>/, "")
  .replace(/<svg[^>]*>/, "")
  .replace(/<\/svg>/, "")
  .trim();

const paths = inner
  .split("\n")
  .filter((line) => line.trim().startsWith("<path"))
  .map((line) => ({
    d: line.match(/d="([^"]+)"/)?.[1] ?? "",
    fill: line.match(/fill="([^"]+)"/)?.[1] ?? "",
    transform: line.match(/transform="([^"]+)"/)?.[1],
  }));

const out = `// Auto-generated from public/brand/jobilly-mark.svg

export const JOBILLY_MARK_VIEWBOX = { width: ${viewboxWidth}, height: ${viewboxHeight} } as const;

export const jobillyMarkPaths = ${JSON.stringify(paths, null, 2)} as const;
`;

fs.writeFileSync(path.join(root, "src/components/brand/jobilly-mark-paths.ts"), out);
console.log(`Wrote ${paths.length} paths`);
