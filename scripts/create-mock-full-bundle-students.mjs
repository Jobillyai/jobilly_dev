/**
 * Create mock Full Bundle (mock-and-job) students assigned to each mentor admin.
 *
 * Run: node scripts/create-mock-full-bundle-students.mjs
 *
 * Optional:
 *   MOCK_STUDENTS_PER_ADMIN=2
 *   MOCK_STUDENT_PASSWORD=YourTempPassword123!
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

function slugFromEmail(email) {
  const local = email.split("@")[0] ?? "admin";
  return local.replace(/[^a-z0-9]+/gi, "").toLowerCase().slice(0, 18) || "admin";
}

function firstNameFromAdmin(name, email) {
  const fromName = String(name ?? "").trim().split(/\s+/)[0];
  if (fromName) return fromName;
  return slugFromEmail(email);
}

const ROLES = [
  "Software Engineer",
  "Data Engineer",
  "Data Center Technician",
  "AI Business Analyst",
  "Full Stack Developer",
  "Cloud Engineer",
  "DevOps Engineer",
  "QA Engineer",
];

const env = loadEnvLocal();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const perAdmin = Math.max(1, Number(env.MOCK_STUDENTS_PER_ADMIN ?? 2));
const password = env.MOCK_STUDENT_PASSWORD || `Jb${randomBytes(8).toString("base64url").replace(/[-_]/g, "x")}!7`;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${serviceRoleKey}`,
  apikey: serviceRoleKey,
  "Content-Type": "application/json",
};

async function rest(path, { method = "GET", body, prefer } = {}) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    method,
    headers: {
      ...headers,
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { response, data };
}

async function findAuthUserByEmail(email) {
  const { response, data } = await rest(
    `/auth/v1/admin/users?page=1&per_page=200`,
  );
  if (!response.ok) {
    throw new Error(`Could not list auth users: ${JSON.stringify(data)}`);
  }
  const users = data?.users ?? [];
  return users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function ensureAuthUser(email, firstName, lastName) {
  const existing = await findAuthUserByEmail(email);
  if (existing) {
    const { response, data } = await rest(`/auth/v1/admin/users/${existing.id}`, {
      method: "PUT",
      body: {
        password,
        email_confirm: true,
        user_metadata: {
          name: `${firstName} ${lastName}`.trim(),
          first_name: firstName,
          last_name: lastName,
        },
        app_metadata: {
          ...(existing.app_metadata ?? {}),
          mock_student: true,
        },
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to reset auth user ${email}: ${JSON.stringify(data)}`);
    }
    return existing.id;
  }

  const { response, data } = await rest(`/auth/v1/admin/users`, {
    method: "POST",
    body: {
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: `${firstName} ${lastName}`.trim(),
        first_name: firstName,
        last_name: lastName,
      },
      app_metadata: { mock_student: true },
    },
  });
  if (!response.ok) {
    throw new Error(`Failed to create auth user ${email}: ${JSON.stringify(data)}`);
  }
  return data.id;
}

async function upsertPublicUser(userId, email, firstName, lastName) {
  const name = `${firstName} ${lastName}`.trim();
  const { response: getResponse, data: existing } = await rest(
    `/rest/v1/users?id=eq.${userId}&select=id`,
  );
  if (!getResponse.ok) {
    throw new Error(`Failed to read users row: ${JSON.stringify(existing)}`);
  }

  const payload = {
    email,
    name,
    first_name: firstName,
    last_name: lastName,
    role: "free_candidate",
  };

  if (Array.isArray(existing) && existing.length > 0) {
    const { response, data } = await rest(`/rest/v1/users?id=eq.${userId}`, {
      method: "PATCH",
      body: payload,
      prefer: "return=minimal",
    });
    if (!response.ok) {
      throw new Error(`Failed to update users row: ${JSON.stringify(data)}`);
    }
    return;
  }

  const { response, data } = await rest(`/rest/v1/users`, {
    method: "POST",
    body: { id: userId, ...payload },
    prefer: "return=minimal",
  });
  if (!response.ok) {
    throw new Error(`Failed to insert users row: ${JSON.stringify(data)}`);
  }
}

async function upsertCandidateProfile(userId, mentorId, role, experienceYears) {
  const payload = {
    assigned_employee_id: mentorId,
    job_search_role: role,
    experience_years: experienceYears,
    subscription_status: "none",
  };

  const { response: getResponse, data: existing } = await rest(
    `/rest/v1/candidate_profiles?user_id=eq.${userId}&select=user_id`,
  );
  if (!getResponse.ok) {
    throw new Error(`Failed to read candidate profile: ${JSON.stringify(existing)}`);
  }

  if (Array.isArray(existing) && existing.length > 0) {
    const { response, data } = await rest(
      `/rest/v1/candidate_profiles?user_id=eq.${userId}`,
      { method: "PATCH", body: payload, prefer: "return=minimal" },
    );
    if (!response.ok) {
      throw new Error(`Failed to update candidate profile: ${JSON.stringify(data)}`);
    }
    return;
  }

  const { response, data } = await rest(`/rest/v1/candidate_profiles`, {
    method: "POST",
    body: { user_id: userId, ...payload },
    prefer: "return=minimal",
  });
  if (!response.ok) {
    throw new Error(`Failed to create candidate profile: ${JSON.stringify(data)}`);
  }
}

async function upsertCareerAdvisory(userId, name, email, phone, role) {
  const payload = {
    candidate_id: userId,
    name,
    email,
    phone,
    graduation_details: "Mock student for Full Bundle testing",
    branch: role,
    interested_technology: role,
    is_veteran: false,
  };

  const { response: getResponse, data: existing } = await rest(
    `/rest/v1/career_advisory_intakes?candidate_id=eq.${userId}&select=id`,
  );
  if (!getResponse.ok) {
    throw new Error(`Failed to read career advisory: ${JSON.stringify(existing)}`);
  }

  if (Array.isArray(existing) && existing.length > 0) {
    const { response, data } = await rest(
      `/rest/v1/career_advisory_intakes?candidate_id=eq.${userId}`,
      { method: "PATCH", body: payload, prefer: "return=minimal" },
    );
    if (!response.ok) {
      throw new Error(`Failed to update career advisory: ${JSON.stringify(data)}`);
    }
    return;
  }

  const { response, data } = await rest(`/rest/v1/career_advisory_intakes`, {
    method: "POST",
    body: payload,
    prefer: "return=minimal",
  });
  if (!response.ok) {
    throw new Error(`Failed to create career advisory: ${JSON.stringify(data)}`);
  }
}

async function activateFullBundle(userId, name, email, phone) {
  const unique = randomBytes(8).toString("hex").toUpperCase();
  const datePart = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const { response, data } = await rest(`/rest/v1/rpc/complete_mock_checkout_transaction`, {
    method: "POST",
    body: {
      p_user_id: userId,
      p_plan: "mock-and-job",
      p_billing_name: name,
      p_billing_email: email,
      p_billing_phone: phone,
      p_billing_address_line1: "100 Mock Test Ave",
      p_billing_address_line2: "",
      p_billing_city: "Austin",
      p_billing_state: "TX",
      p_billing_postal_code: "78701",
      p_billing_country: "United States",
      p_transaction_reference: `MOCK-TEST-${unique}`,
      p_receipt_number: `JB-${datePart}-${unique.slice(-8)}`,
      p_amount_usd: 149.99,
      p_paid_at: new Date().toISOString(),
    },
  });

  if (!response.ok || !data) {
    throw new Error(`Full Bundle checkout failed for ${email}: ${JSON.stringify(data)}`);
  }
  return data;
}

const { response: adminsResponse, data: admins } = await rest(
  `/rest/v1/users?select=id,email,name,member_id&role=eq.admin&order=member_id.asc`,
);

if (!adminsResponse.ok || !Array.isArray(admins)) {
  console.error("Could not load admins:", admins);
  process.exit(1);
}

if (admins.length === 0) {
  console.error("No admin (mentor) users found.");
  process.exit(1);
}

const results = [];
let roleIndex = 0;

for (const admin of admins) {
  const adminSlug = slugFromEmail(admin.email);
  const mentorLabel = firstNameFromAdmin(admin.name, admin.email);

  for (let i = 1; i <= perAdmin; i += 1) {
    const email = `mock.${adminSlug}.${i}@jobilly.ai`;
    const firstName = "Mock";
    const lastName = `${mentorLabel}${i}`;
    const name = `${firstName} ${lastName}`;
    const phone = `555-01${String(results.length + 1).padStart(2, "0")}`;
    const role = ROLES[roleIndex % ROLES.length];
    roleIndex += 1;
    const experienceYears = 1 + ((i + results.length) % 4);

    const userId = await ensureAuthUser(email, firstName, lastName);
    await new Promise((r) => setTimeout(r, 200));
    await upsertPublicUser(userId, email, firstName, lastName);
    await upsertCandidateProfile(userId, admin.id, role, experienceYears);
    await upsertCareerAdvisory(userId, name, email, phone, role);
    const subscriptionId = await activateFullBundle(userId, name, email, phone);

    const { data: userRow } = await rest(
      `/rest/v1/users?id=eq.${userId}&select=member_id,role`,
    );
    results.push({
      mentor: admin.email,
      mentorId: admin.member_id,
      email,
      name,
      memberId: userRow?.[0]?.member_id ?? null,
      role: userRow?.[0]?.role ?? null,
      jobSearchRole: role,
      subscriptionId,
      password,
    });
  }
}

console.log("\nMock Full Bundle students created:\n");
for (const row of results) {
  console.log(`${row.name}  (${row.memberId ?? "no-id"})`);
  console.log(`  Email:     ${row.email}`);
  console.log(`  Password:  ${row.password}`);
  console.log(`  Plan:      Full Bundle (mock-and-job)`);
  console.log(`  Role:      ${row.role}`);
  console.log(`  Target:    ${row.jobSearchRole}`);
  console.log(`  Mentor:    ${row.mentor} (${row.mentorId})`);
  console.log("");
}
console.log(`Shared password for all mock students: ${password}`);
console.log("Admins: open Candidates / Apply for jobs to see their assigned students.");
