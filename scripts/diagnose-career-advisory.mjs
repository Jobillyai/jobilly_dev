/**
 * Check career_advisory_intakes table and public.users linkage.
 * Run: node scripts/diagnose-career-advisory.mjs
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

const env = loadEnvLocal();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${serviceRoleKey}`,
  apikey: serviceRoleKey,
  "Content-Type": "application/json",
};

const tableCheck = await fetch(
  `${supabaseUrl}/rest/v1/career_advisory_intakes?select=id&limit=1`,
  { headers },
);

console.log("career_advisory_intakes status:", tableCheck.status);
console.log("career_advisory_intakes body:", await tableCheck.text());

const columnsCheck = await fetch(
  `${supabaseUrl}/rest/v1/career_advisory_intakes?select=session_scheduled_at,google_meet_link,invite_sent_at&limit=1`,
  { headers },
);

console.log("0017 columns status:", columnsCheck.status);
console.log("0017 columns body:", await columnsCheck.text());

const usersCheck = await fetch(`${supabaseUrl}/rest/v1/users?select=id,email,role&limit=3`, {
  headers,
});

console.log("users sample status:", usersCheck.status);
console.log("users sample body:", await usersCheck.text());
