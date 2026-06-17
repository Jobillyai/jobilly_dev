/**
 * One-time setup: creates the public `avatars` storage bucket.
 * Run: node scripts/setup-avatars-bucket.mjs
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
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const response = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    apikey: serviceRoleKey,
  },
  body: JSON.stringify({
    id: "avatars",
    name: "avatars",
    public: true,
    file_size_limit: 5242880,
    allowed_mime_types: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  }),
});

const body = await response.text();

if (response.ok) {
  console.log("Created avatars bucket successfully.");
  process.exit(0);
}

if (body.includes("already exists") || body.includes("Duplicate")) {
  console.log("avatars bucket already exists.");
  process.exit(0);
}

console.error("Failed to create avatars bucket:", response.status, body);
process.exit(1);
