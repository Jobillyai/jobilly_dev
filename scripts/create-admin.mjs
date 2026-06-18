/**
 * Create an admin user in Supabase Auth and set role=admin in public.users.
 * Run: node scripts/create-admin.mjs you@email.com "Your Name" your-password
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

const [email, name, password] = process.argv.slice(2);

if (!email || !name || !password) {
  console.error('Usage: node scripts/create-admin.mjs you@email.com "Your Name" your-password');
  process.exit(1);
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

const createResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  }),
});

const createBody = await createResponse.json();

if (!createResponse.ok) {
  console.error("Failed to create auth user:", createBody);
  process.exit(1);
}

const userId = createBody.id;
console.log(`Auth user created: ${userId}`);

const insertResponse = await fetch(`${supabaseUrl}/rest/v1/users`, {
  method: "POST",
  headers: {
    ...headers,
    Prefer: "return=representation",
  },
  body: JSON.stringify({
    id: userId,
    name,
    email,
    role: "admin",
  }),
});

const insertBody = await insertResponse.json();

if (!insertResponse.ok) {
  const updateResponse = await fetch(
    `${supabaseUrl}/rest/v1/users?id=eq.${userId}`,
    {
      method: "PATCH",
      headers: {
        ...headers,
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        name,
        email,
        role: "admin",
      }),
    },
  );

  const updateBody = await updateResponse.json();

  if (!updateResponse.ok) {
    console.error("Failed to set admin role:", updateBody);
    process.exit(1);
  }
}

console.log("Admin user ready.");
console.log(`Email: ${email}`);
console.log("Login at: http://localhost:3000/admin/login");
