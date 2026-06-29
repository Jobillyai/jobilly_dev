/**
 * Remove all candidate users from Supabase (auth + public + cascaded rows).
 * Keeps admin, manager, employee, and institution_admin accounts.
 *
 * Run: node scripts/clear-candidates.mjs
 * Dry run: node scripts/clear-candidates.mjs --dry-run
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const CANDIDATE_ROLES = [
  "free_candidate",
  "subscribed_candidate",
  "institution_candidate",
];

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  const contents = readFileSync(envPath, "utf8");
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
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${serviceRoleKey}`,
  apikey: serviceRoleKey,
  "Content-Type": "application/json",
};

const roleFilter = CANDIDATE_ROLES.map((role) => `"${role}"`).join(",");

const listResponse = await fetch(
  `${supabaseUrl}/rest/v1/users?select=id,email,name,role&role=in.(${roleFilter})`,
  { headers },
);

const candidates = await listResponse.json();

if (!listResponse.ok) {
  console.error("Failed to list candidates:", candidates);
  process.exit(1);
}

if (!Array.isArray(candidates) || candidates.length === 0) {
  console.log("No candidate users found.");
  process.exit(0);
}

console.log(`Found ${candidates.length} candidate(s) to remove:`);
for (const candidate of candidates) {
  console.log(`  - ${candidate.email} (${candidate.role})`);
}

if (dryRun) {
  console.log("\nDry run — no changes made.");
  process.exit(0);
}

let deleted = 0;
const errors = [];

for (const candidate of candidates) {
  const deleteResponse = await fetch(
    `${supabaseUrl}/auth/v1/admin/users/${candidate.id}`,
    { method: "DELETE", headers },
  );

  if (!deleteResponse.ok) {
    const body = await deleteResponse.text();
    errors.push(`${candidate.email}: ${body}`);
    continue;
  }

  deleted += 1;
  console.log(`Deleted: ${candidate.email}`);
}

const clearAssignmentsResponse = await fetch(
  `${supabaseUrl}/rest/v1/employee_profiles?assigned_candidate_ids=neq.{}`,
  {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({ assigned_candidate_ids: [] }),
  },
);

if (!clearAssignmentsResponse.ok) {
  const body = await clearAssignmentsResponse.text();
  console.warn("Could not clear employee candidate assignments:", body);
} else {
  console.log("Cleared mentor/employee candidate assignments.");
}

console.log(`\nDone. Deleted ${deleted}/${candidates.length} candidate account(s).`);
if (errors.length > 0) {
  console.error("Errors:");
  for (const error of errors) {
    console.error(`  ${error}`);
  }
  process.exit(1);
}
