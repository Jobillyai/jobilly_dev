import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const source = path.join(root, "public/brand/loader/jobilly-loader-logo.png");
const outDir = path.join(root, "public/brand/loader");

await mkdir(outDir, { recursive: true });

const image = sharp(source);
const { width, height } = await image.metadata();

if (!width || !height) {
  throw new Error("Unable to read loader logo dimensions.");
}

const iconHeight = Math.round(height * 0.58);
const textTop = iconHeight - Math.round(height * 0.04);

await image.clone().extract({ left: 0, top: 0, width, height: iconHeight }).png({ compressionLevel: 9, palette: true }).toFile(path.join(outDir, "jobilly-loader-icon.png"));

await image
  .clone()
  .extract({ left: 0, top: textTop, width, height: height - textTop })
  .png({ compressionLevel: 9, palette: true })
  .toFile(path.join(outDir, "jobilly-loader-wordmark.png"));

for (const size of [512, 1080]) {
  await sharp(source)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, quality: 90 })
    .toFile(path.join(outDir, `jobilly-loader-logo-${size}.png`));
}

console.log("Prepared loader assets in public/brand/loader");
