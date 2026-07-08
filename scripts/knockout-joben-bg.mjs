import sharp from "sharp";

const source =
  "C:/Users/avina/.cursor/projects/c-Users-avina-OneDrive-Documents-GitHub-jobilly-dev/assets/c__Users_avina_AppData_Roaming_Cursor_User_workspaceStorage_2a5895287d740bcd8216793fb2f45254_images_image-e4e868d4-171e-4e3b-9b79-56912be8369a.png";
const output = "public/brand/joben-avatar.png";

const meta = await sharp(source).metadata();
const width = meta.width ?? 231;
const height = meta.height ?? 234;

const cropLeft = Math.round(width * 0.48);
const cropTop = Math.round(height * 0.1);
const cropWidth = Math.round(width * 0.5);
const cropHeight = Math.round(height * 0.82);

const { data, info } = await sharp(source)
  .extract({
    left: cropLeft,
    top: cropTop,
    width: Math.min(cropWidth, width - cropLeft),
    height: Math.min(cropHeight, height - cropTop),
  })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const pixels = Buffer.from(data);
const hardCutoff = 232;
const softCutoff = 200;

for (let i = 0; i < pixels.length; i += 4) {
  const r = pixels[i];
  const g = pixels[i + 1];
  const b = pixels[i + 2];
  const avg = (r + g + b) / 3;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);

  if (r >= hardCutoff && g >= hardCutoff && b >= hardCutoff) {
    pixels[i + 3] = 0;
    continue;
  }

  if (avg >= softCutoff && spread < 28) {
    const fade = Math.max(0, Math.min(255, ((hardCutoff - avg) / (hardCutoff - softCutoff)) * 255));
    pixels[i + 3] = Math.min(pixels[i + 3], Math.round(fade));
  }
}

await sharp(pixels, {
  raw: {
    width: info.width,
    height: info.height,
    channels: 4,
  },
})
  .trim()
  .png()
  .toFile(output);

console.log("Saved cropped transparent robot to", output);
