/**
 * Remove candidate and mentor-admin accounts from Supabase Auth.
 * Preserves manager, institution_admin, employee, and unclassified accounts.
 *
 * Run: node scripts/clear-candidates-and-admins.mjs
 * Candidates only: node scripts/clear-candidates-and-admins.mjs --candidates-only
 * Dry run: node scripts/clear-candidates-and-admins.mjs --dry-run
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const CANDIDATE_ROLES = [
  "free_candidate",
  "subscribed_candidate",
  "institution_candidate",
];
const candidatesOnly = process.argv.includes("--candidates-only");
const REMOVABLE_ROLES = new Set(
  candidatesOnly ? CANDIDATE_ROLES : ["admin", ...CANDIDATE_ROLES],
);

function loadEnvLocal() {
  const contents = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  const env = {};

  for (const line of contents.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }

  return env;
}

const dryRun = process.argv.includes("--dry-run");
const env = loadEnvLocal();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${serviceRoleKey}`,
  apikey: serviceRoleKey,
  "Content-Type": "application/json",
};

const response = await fetch(
  `${supabaseUrl}/rest/v1/users?select=id,email,name,role`,
  { headers },
);
const rows = await response.json();

if (!response.ok) {
  console.error("Failed to list users:", rows);
  process.exit(1);
}

const accounts = (rows ?? []).filter((row) => REMOVABLE_ROLES.has(row.role));

if (accounts.length === 0) {
  console.log(candidatesOnly ? "No candidate accounts found." : "No candidate or admin accounts found.");
  process.exit(0);
}

console.log(`Found ${accounts.length} account(s) to remove:`);
for (const account of accounts) {
  console.log(`  - ${account.email} (${account.role})`);
}

if (dryRun) {
  console.log("\nDry run — no changes made.");
  process.exit(0);
}

let deleted = 0;
const errors = [];

for (const account of accounts) {
  // Legacy schema declares scraped_jobs.employee_id NOT NULL while its FK uses
  // ON DELETE SET NULL. Remove test scrape rows first so admin deletion can
  // cascade without violating that contradictory constraint.
  if (account.role === "admin") {
    const clearJobsResponse = await fetch(
      `${supabaseUrl}/rest/v1/scraped_jobs?employee_id=eq.${account.id}`,
      {
        method: "DELETE",
        headers: { ...headers, Prefer: "return=minimal" },
      },
    );

    if (!clearJobsResponse.ok) {
      errors.push(
        `${account.email}: could not clear scraped jobs: ${await clearJobsResponse.text()}`,
      );
      continue;
    }
  }

  const deleteResponse = await fetch(
    `${supabaseUrl}/auth/v1/admin/users/${account.id}`,
    { method: "DELETE", headers },
  );

  if (!deleteResponse.ok) {
    errors.push(`${account.email}: ${await deleteResponse.text()}`);
    continue;
  }

  deleted += 1;
  console.log(`Deleted: ${account.email}`);
}

console.log(`\nDone. Deleted ${deleted}/${accounts.length} account(s).`);
if (errors.length > 0) {
  console.error("Errors:");
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}
