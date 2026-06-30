import fs from "fs";
import path from "path";
import os from "os";
import { setTimeout as sleep } from "timers/promises";

const projectRoot = process.cwd();
const nextDir = path.join(projectRoot, ".next");
const tempNext = path.join(os.tmpdir(), "jobilly-next-dev");
const tempWebpack = path.join(os.tmpdir(), "jobilly-webpack-cache");

async function removePath(target, attempts = 5) {
  if (!fs.existsSync(target)) {
    return;
  }

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      fs.rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
      console.log(`Removed ${target}`);
      return;
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }
      await sleep(500);
    }
  }
}

if (fs.existsSync(nextDir)) {
  try {
    if (fs.lstatSync(nextDir).isSymbolicLink()) {
      await removePath(nextDir);
    }
  } catch {
    // ignore
  }
}

await removePath(nextDir);
await removePath(tempNext);
await removePath(tempWebpack);

console.log("Next.js dev cache cleared.");
