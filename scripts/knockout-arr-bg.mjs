import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const source = path.join(root, "public/arr.png");
const output = path.join(root, "public/arr.png");

const { data, info } = await sharp(source)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const pixels = Buffer.from(data);

for (let i = 0; i < pixels.length; i += 4) {
  const r = pixels[i];
  const g = pixels[i + 1];
  const b = pixels[i + 2];
  const spread = Math.max(r, g, b) - Math.min(r, g, b);

  if (r <= 12 && g <= 12 && b <= 12) {
    pixels[i + 3] = 0;
    continue;
  }

  if (r <= 20 && g <= 20 && b <= 20 && spread <= 6) {
    pixels[i + 3] = 0;
  }
}

await sharp(pixels, {
  raw: {
    width: info.width,
    height: info.height,
    channels: 4,
  },
})
  .trim({ threshold: 10 })
  .png()
  .toFile(output);

console.log("Saved transparent arr.png to", output);
