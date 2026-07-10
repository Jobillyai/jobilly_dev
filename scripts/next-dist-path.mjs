import path from "path";
import os from "os";

export const projectRoot = process.cwd();

export function isOneDrivePath(dir) {
  return dir.replace(/\\/g, "/").includes("OneDrive");
}

export const isOneDriveProject = isOneDrivePath(projectRoot);

/** Dev server output — outside OneDrive so sync cannot corrupt CSS/chunks. */
export function getDevDistDir() {
  return path.join(os.tmpdir(), "jobilly-next-dev");
}

/** Relative from project root — Next.js only accepts relative distDir paths. */
export function getDevDistDirRelative() {
  return path.relative(projectRoot, getDevDistDir());
}

export function getProjectDistDir() {
  return path.join(projectRoot, ".next");
}
