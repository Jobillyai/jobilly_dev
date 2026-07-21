/**
 * One-shot: create staff accounts with correct roles and member IDs.
 * Run: node scripts/create-staff-accounts.mjs
 *
 * Technical manager (full portal access) is marked by email in src/lib/auth/roles.ts
 * — keep avinashb@jobilly.ai as role "manager" plus that allowlist entry.
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

function generatePassword() {
  const raw = randomBytes(10).toString("base64url").replace(/[-_]/g, "x");
  return `Jb${raw}!7`;
}

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

/** @type {{ email: string, name: string, role: "admin" | "manager", note?: string }[]} */
const accounts = [
  { email: "rajeshwari.m@jobilly.ai", name: "Rajeshwari M", role: "admin" },
  { email: "saikrupa.p@jobilly.ai", name: "Sai Krupa P", role: "admin" },
  { email: "shivaprasad.a@jobilly.ai", name: "Shiva Prasad A", role: "admin" },
  { email: "abhilash.b@jobilly.ai", name: "Abhilash B", role: "manager" },
  {
    email: "avinashb@jobilly.ai",
    name: "Avinash B",
    role: "manager",
    note: "Technical manager — full access (manager + job apply + scrape)",
  },
];

const results = [];

for (const account of accounts) {
  const password = generatePassword();

  const createResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: account.email,
      password,
      email_confirm: true,
      user_metadata: { name: account.name },
    }),
  });
  const created = await createResponse.json();
  if (!createResponse.ok) {
    console.error(`Failed to create ${account.email}:`, created);
    process.exit(1);
  }
  const userId = created.id;

  // Signup trigger may insert free_candidate — force staff role + name.
  const roleResponse = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${userId}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({ role: account.role, name: account.name }),
  });
  if (!roleResponse.ok) {
    console.error(`Failed to set role for ${account.email}:`, await roleResponse.text());
    process.exit(1);
  }

  const idResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/allocate_member_id`, {
    method: "POST",
    headers,
    body: JSON.stringify({ p_role: account.role }),
  });
  const memberId = await idResponse.json();
  if (!idResponse.ok || typeof memberId !== "string") {
    console.error(`Failed to allocate member id for ${account.email}:`, memberId);
    process.exit(1);
  }

  const memberIdResponse = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${userId}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({ member_id: memberId }),
  });
  if (!memberIdResponse.ok) {
    console.error(`Failed to set member id for ${account.email}:`, await memberIdResponse.text());
    process.exit(1);
  }

  results.push({ ...account, password, memberId });
}

// Reset JAC counter so the first real candidate gets JAC0001.
const counterResponse = await fetch(
  `${supabaseUrl}/rest/v1/member_id_counters?prefix=eq.JAC`,
  {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({ last_value: 0 }),
  },
);
if (!counterResponse.ok) {
  console.warn("Could not reset JAC counter:", await counterResponse.text());
}

console.log("\nAccounts created:\n");
for (const result of results) {
  console.log(`${result.role.toUpperCase()} — ${result.name}`);
  console.log(`  Email:     ${result.email}`);
  console.log(`  Member ID: ${result.memberId}`);
  console.log(`  Password:  ${result.password}`);
  if (result.note) console.log(`  Note:      ${result.note}`);
  console.log("");
}
console.log("Login at /admin/login. Ask everyone to change passwords after first login.");
