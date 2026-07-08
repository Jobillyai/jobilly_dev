import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const loaderDir = path.join(root, "public/brand/loader");
const framesDir = path.join(loaderDir, "frames");
const imagesDir = path.join(loaderDir, "images");

await mkdir(framesDir, { recursive: true });
await mkdir(imagesDir, { recursive: true });

for (const file of ["jobilly-loader-icon.png", "jobilly-loader-wordmark.png"]) {
  await copyFile(path.join(loaderDir, file), path.join(imagesDir, file));
}

const ffmpeg = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
if (ffmpeg.status !== 0) {
  console.log("ffmpeg not found. Install ffmpeg to export WebM.");
  console.log("Assets ready:");
  console.log(" - public/brand/loader/jobilly-loader.lottie.json");
  console.log(" - public/brand/loader/jobilly-loader-logo-512.png");
  console.log(" - public/brand/loader/jobilly-loader-logo-1080.png");
  console.log("Use the in-app CSS loader (JobillyLogoLoader) for production.");
  process.exit(0);
}

console.log("ffmpeg detected. For WebM export, record JobillyLogoLoader in browser or run:");
console.log(
  "ffmpeg -framerate 60 -i frames/frame-%04d.png -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 public/brand/loader/jobilly-loader-512.webm"
);
