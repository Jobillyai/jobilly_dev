import fs from "fs";
import { setTimeout as sleep } from "timers/promises";
import { getDevDistDir, getProjectDistDir } from "./next-dist-path.mjs";

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

await removePath(getProjectDistDir());
await removePath(getDevDistDir());
console.log("Next.js dev cache cleared.");
