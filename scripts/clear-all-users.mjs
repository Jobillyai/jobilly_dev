/**
 * Remove ALL user accounts from Supabase (auth + public + cascaded rows):
 * candidates, admins, managers, employees, mentors — everyone.
 *
 * FK cascades clean up candidate_profiles, employee_profiles, mentor_profiles,
 * advisory sessions, intakes, applications, scraped jobs, service requests, etc.
 *
 * Run: node scripts/clear-all-users.mjs
 * Dry run: node scripts/clear-all-users.mjs --dry-run
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

// List every auth user (paginated) so nothing is left behind,
// including accounts missing a public.users row.
const allUsers = [];
let page = 1;

for (;;) {
  const listResponse = await fetch(
    `${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=100`,
    { headers },
  );
  const payload = await listResponse.json();

  if (!listResponse.ok) {
    console.error("Failed to list users:", payload);
    process.exit(1);
  }

  const users = payload.users ?? [];
  allUsers.push(...users);
  if (users.length < 100) break;
  page += 1;
}

if (allUsers.length === 0) {
  console.log("No users found — database is already clean.");
  process.exit(0);
}

// Show roles from public.users for a clearer summary.
const rolesResponse = await fetch(`${supabaseUrl}/rest/v1/users?select=id,role`, { headers });
const roleRows = rolesResponse.ok ? await rolesResponse.json() : [];
const roleById = new Map(roleRows.map((row) => [row.id, row.role]));

console.log(`Found ${allUsers.length} account(s) to remove:`);
for (const user of allUsers) {
  console.log(`  - ${user.email ?? user.id} (${roleById.get(user.id) ?? "no public row"})`);
}

if (dryRun) {
  console.log("\nDry run — no changes made.");
  process.exit(0);
}

let deleted = 0;
const errors = [];

for (const user of allUsers) {
  const deleteResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
    method: "DELETE",
    headers,
  });

  if (!deleteResponse.ok) {
    const body = await deleteResponse.text();
    errors.push(`${user.email ?? user.id}: ${body}`);
    continue;
  }

  deleted += 1;
  console.log(`Deleted: ${user.email ?? user.id}`);
}

console.log(`\nDone. Deleted ${deleted}/${allUsers.length} account(s).`);
if (errors.length > 0) {
  console.error("Errors:");
  for (const error of errors) {
    console.error(`  ${error}`);
  }
  process.exit(1);
}
