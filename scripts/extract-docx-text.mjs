import { readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const docxPath = resolve(process.argv[2] ?? "Jobilly ai Architecture Plan v4.docx");
const tmpDir = resolve(process.cwd(), ".tmp-docx-extract");

rmSync(tmpDir, { recursive: true, force: true });
mkdirSync(tmpDir, { recursive: true });

execSync(
  `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${docxPath.replace(/'/g, "''")}' -DestinationPath '${tmpDir.replace(/'/g, "''")}' -Force"`,
  { stdio: "inherit" },
);

const xml = readFileSync(resolve(tmpDir, "word/document.xml"), "utf8");
const text = xml
  .replace(/<w:tab[^/]*\/>/g, "\t")
  .replace(/<w:br[^/]*\/>/g, "\n")
  .replace(/<\/w:p>/g, "\n")
  .replace(/<[^>]+>/g, "")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

writeFileSync(resolve(process.cwd(), ".architecture-plan-extract.txt"), text);
console.log(text.slice(0, 20000));
