import fs from "fs";
import path from "path";
import os from "os";
import { setTimeout as sleep } from "timers/promises";
import { getProjectDistDir } from "./next-dist-path.mjs";

async function removePath(target, attempts = 5) {
  if (!fs.existsSync(target)) {
    return;
  }

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      fs.rmSync(target, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
      return;
    } catch (error) {
      if (attempt === attempts) {
        throw error;
      }
      await sleep(500);
    }
  }
}

// Leftover from experiments — safe to delete; does not remove junction targets.
await removePath(path.join(os.tmpdir(), "jobilly-next-dev"));
await removePath(getProjectDistDir());
