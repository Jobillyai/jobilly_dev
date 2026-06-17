/**
 * Diagnose password reset email delivery.
 * Run: node scripts/diagnose-password-reset.mjs you@email.com
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

const emailArg = process.argv[2];
if (!emailArg) {
  console.error("Usage: node scripts/diagnose-password-reset.mjs you@email.com");
  process.exit(1);
}

const env = loadEnvLocal();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

if (!url || !anon || !service) {
  console.error("Missing Supabase env vars in .env.local");
  process.exit(1);
}

const email = emailArg.trim();
const emailLower = email.toLowerCase();

async function main() {
  console.log("Project:", url);
  console.log("Testing email:", email);

  const usersRes = await fetch(
    `${url}/auth/v1/admin/users?filter=${encodeURIComponent(`email.eq.${email}`)}`,
    {
      headers: {
        Authorization: `Bearer ${service}`,
        apikey: service,
      },
    },
  );
  const usersBody = await usersRes.json();
  console.log("\n[exact email lookup]", usersRes.status, usersBody.users?.length ?? 0, "users");

  const usersLowerRes = await fetch(
    `${url}/auth/v1/admin/users?filter=${encodeURIComponent(`email.eq.${emailLower}`)}`,
    {
      headers: {
        Authorization: `Bearer ${service}`,
        apikey: service,
      },
    },
  );
  const usersLowerBody = await usersLowerRes.json();
  console.log("[lowercase lookup]", usersLowerRes.status, usersLowerBody.users?.length ?? 0, "users");

  const listRes = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=50`, {
    headers: {
      Authorization: `Bearer ${service}`,
      apikey: service,
    },
  });
  const listBody = await listRes.json();
  console.log("[all auth users]", listRes.status, listBody.users?.length ?? 0, "total");
  for (const user of listBody.users ?? []) {
    console.log("  -", user.email);
  }

  const dbRes = await fetch(
    `${url}/rest/v1/users?select=email&limit=20`,
    {
      headers: {
        Authorization: `Bearer ${service}`,
        apikey: service,
      },
    },
  );
  const dbBody = await dbRes.json();
  console.log("\n[public.users table]", dbRes.status);
  if (Array.isArray(dbBody)) {
    for (const row of dbBody) {
      console.log("  -", row.email);
    }
  } else {
    console.log(dbBody);
  }

  const authEmail =
    usersBody.users?.[0]?.email ?? usersLowerBody.users?.[0]?.email ?? email;

  const recoverRes = await fetch(`${url}/auth/v1/recover`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anon,
    },
    body: JSON.stringify({
      email: authEmail,
      redirect_to: `${appUrl}/auth/callback`,
    }),
  });

  const recoverText = await recoverRes.text();
  console.log("\n[recover API]", recoverRes.status, recoverText || "(empty body)");

  const linkRes = await fetch(`${url}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${service}`,
      apikey: service,
    },
    body: JSON.stringify({
      type: "recovery",
      email: authEmail,
      options: { redirect_to: `${appUrl}/auth/callback` },
    }),
  });

  const linkBody = await linkRes.json();
  console.log("\n[generate_link]", linkRes.status);
  if (linkRes.ok) {
    console.log("action_link:", linkBody.action_link ?? linkBody.properties?.action_link ?? "(none)");
  } else {
    console.log(linkBody);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
