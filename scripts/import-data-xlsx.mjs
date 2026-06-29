/**
 * Import manager, mentor admins, and candidates from data.xlsx.
 *
 * Expected columns (header row):
 * S.no | Canditate Name | Technology | Experience | Contact | Email |
 * Mentor | mail ID | Manager | manager Mail ID
 *
 * Run:
 *   node scripts/import-data-xlsx.mjs
 *   node scripts/import-data-xlsx.mjs path/to/file.xlsx
 *
 * Optional env in .env.local:
 *   IMPORT_DEFAULT_PASSWORD=YourTempPassword123!
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import XLSX from "xlsx";

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

function normalizeEmail(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function parseExperienceYearsFromInput(value) {
  const trimmed = normalizeText(value);
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    return null;
  }

  const parsed = Number(match[1]);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 50) {
    return null;
  }

  return Math.round(parsed);
}

function headerKey(value) {
  return normalizeText(value).toLowerCase().replace(/\s+/g, " ");
}

function findColumn(headers, candidates) {
  for (const candidate of candidates) {
    const index = headers.findIndex((header) => header.includes(candidate));
    if (index >= 0) {
      return index;
    }
  }
  return -1;
}

function parseRows(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  if (rows.length < 2) {
    throw new Error("Spreadsheet is empty or missing data rows.");
  }

  const headers = rows[0].map(headerKey);
  const column = {
    name: findColumn(headers, ["canditate name", "candidate name", "name"]),
    technology: findColumn(headers, ["technology"]),
    experience: findColumn(headers, ["experience"]),
    contact: findColumn(headers, ["contact", "phone"]),
    email: findColumn(headers, ["email"]),
    mentorName: findColumn(headers, ["mentor"]),
    mentorEmail: findColumn(headers, ["mail id", "mentor email", "mentor mail"]),
    managerName: findColumn(headers, ["manager"]),
    managerEmail: findColumn(headers, ["manager mail", "manager email"]),
  };

  const missing = Object.entries(column)
    .filter(([, index]) => index < 0)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing expected columns: ${missing.join(", ")}`);
  }

  const parsed = [];

  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index];
    const email = normalizeEmail(row[column.email]);
    const name = normalizeText(row[column.name]);

    if (!email && !name) {
      continue;
    }

    if (!email) {
      throw new Error(`Row ${index + 1} is missing candidate email.`);
    }

    parsed.push({
      name,
      technology: normalizeText(row[column.technology]),
      experience: normalizeText(row[column.experience]),
      contact: normalizeText(row[column.contact]),
      email,
      mentorName: normalizeText(row[column.mentorName]),
      mentorEmail: normalizeEmail(row[column.mentorEmail]),
      managerName: normalizeText(row[column.managerName]),
      managerEmail: normalizeEmail(row[column.managerEmail]),
    });
  }

  if (parsed.length === 0) {
    throw new Error("No candidate rows found in spreadsheet.");
  }

  return parsed;
}

async function restFetch(url, options, headers) {
  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options.headers ?? {}) },
  });
  const text = await response.text();
  let body = text;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  return { response, body };
}

async function findUserByEmail(supabaseUrl, headers, email) {
  const { response, body } = await restFetch(
    `${supabaseUrl}/rest/v1/users?select=id,email,name,role&email=eq.${encodeURIComponent(email)}`,
    { method: "GET" },
    headers,
  );

  if (!response.ok) {
    throw new Error(`Failed to look up ${email}: ${JSON.stringify(body)}`);
  }

  return body?.[0] ?? null;
}

function splitFullName(fullName) {
  const trimmed = String(fullName ?? "").trim();
  if (!trimmed) {
    return { firstName: "", lastName: "" };
  }
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function combineFirstLastName(firstName, lastName) {
  return `${String(firstName).trim()} ${String(lastName).trim()}`.trim();
}

async function findAuthUserByEmail(supabaseUrl, headers, email) {
  const normalized = normalizeEmail(email);
  let page = 1;
  const perPage = 200;

  while (page <= 20) {
    const { response, body } = await restFetch(
      `${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=${perPage}`,
      { method: "GET" },
      headers,
    );

    if (!response.ok) {
      throw new Error(
        `Failed to list auth users for ${email}: ${JSON.stringify(body)}`,
      );
    }

    const users = body?.users ?? [];
    const match = users.find(
      (user) => normalizeEmail(user.email) === normalized,
    );
    if (match?.id) {
      return match.id;
    }

    if (users.length < perPage) {
      break;
    }

    page += 1;
  }

  return null;
}

async function ensureAuthUser(
  supabaseUrl,
  headers,
  email,
  firstName,
  lastName,
  password,
) {
  const normalized = normalizeEmail(email);
  const existingPublic = await findUserByEmail(supabaseUrl, headers, normalized);
  if (existingPublic?.id) {
    return existingPublic.id;
  }

  const existingAuth = await findAuthUserByEmail(supabaseUrl, headers, normalized);
  if (existingAuth) {
    return existingAuth;
  }

  try {
    return await createAuthUser(
      supabaseUrl,
      headers,
      normalized,
      firstName,
      lastName,
      password,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("email_exists")) {
      const authId = await findAuthUserByEmail(supabaseUrl, headers, normalized);
      if (authId) {
        return authId;
      }
    }
    throw error;
  }
}

async function createAuthUser(
  supabaseUrl,
  headers,
  email,
  firstName,
  lastName,
  password,
) {
  const name = combineFirstLastName(firstName, lastName);
  const { response, body } = await restFetch(
    `${supabaseUrl}/auth/v1/admin/users`,
    {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          name,
        },
      }),
    },
    headers,
  );

  if (!response.ok) {
    throw new Error(`Failed to create auth user ${email}: ${JSON.stringify(body)}`);
  }

  return body.id;
}

async function upsertPublicUser(
  supabaseUrl,
  headers,
  userId,
  email,
  firstName,
  lastName,
  role,
) {
  const name = combineFirstLastName(firstName, lastName);
  const existing = await findUserByEmail(supabaseUrl, headers, email);

  if (existing) {
    const { response, body } = await restFetch(
      `${supabaseUrl}/rest/v1/users?id=eq.${existing.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          name,
          first_name: firstName,
          last_name: lastName,
          email,
          role,
        }),
      },
      { ...headers, Prefer: "return=representation" },
    );

    if (!response.ok) {
      throw new Error(`Failed to update user ${email}: ${JSON.stringify(body)}`);
    }

    return existing.id;
  }

  const { response, body } = await restFetch(
    `${supabaseUrl}/rest/v1/users`,
    {
      method: "POST",
      body: JSON.stringify({
        id: userId,
        email,
        name,
        first_name: firstName,
        last_name: lastName,
        role,
      }),
    },
    { ...headers, Prefer: "return=representation" },
  );

  if (!response.ok) {
    throw new Error(`Failed to insert user ${email}: ${JSON.stringify(body)}`);
  }

  return userId;
}

async function ensureStaffUser(supabaseUrl, headers, password, staff) {
  const email = normalizeEmail(staff.email);
  const { firstName, lastName } = splitFullName(staff.name);
  const role = staff.role;

  let existing = await findUserByEmail(supabaseUrl, headers, email);
  let userId = existing?.id;

  if (!userId) {
    userId = await ensureAuthUser(
      supabaseUrl,
      headers,
      email,
      firstName,
      lastName,
      password,
    );
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }

  await upsertPublicUser(
    supabaseUrl,
    headers,
    userId,
    email,
    firstName,
    lastName,
    role,
  );
  return userId;
}

async function upsertCandidateProfile(
  supabaseUrl,
  headers,
  candidateId,
  profile,
) {
  const { response: existingResponse, body: existingBody } = await restFetch(
    `${supabaseUrl}/rest/v1/candidate_profiles?select=user_id&user_id=eq.${candidateId}`,
    { method: "GET" },
    headers,
  );

  if (!existingResponse.ok) {
    throw new Error(
      `Failed to read candidate profile: ${JSON.stringify(existingBody)}`,
    );
  }

  const payload = {
    job_search_role: profile.technology || null,
    experience_years: parseExperienceYearsFromInput(profile.experience),
    assigned_employee_id: profile.mentorId,
  };

  if (existingBody?.length > 0) {
    const { response, body } = await restFetch(
      `${supabaseUrl}/rest/v1/candidate_profiles?user_id=eq.${candidateId}`,
      { method: "PATCH", body: JSON.stringify(payload) },
      headers,
    );

    if (!response.ok) {
      throw new Error(
        `Failed to update candidate profile: ${JSON.stringify(body)}`,
      );
    }
    return;
  }

  const { response, body } = await restFetch(
    `${supabaseUrl}/rest/v1/candidate_profiles`,
    {
      method: "POST",
      body: JSON.stringify({ user_id: candidateId, ...payload }),
    },
    headers,
  );

  if (!response.ok) {
    throw new Error(`Failed to create candidate profile: ${JSON.stringify(body)}`);
  }
}

async function upsertCareerAdvisoryIntake(
  supabaseUrl,
  headers,
  candidateId,
  row,
) {
  const payload = {
    candidate_id: candidateId,
    name: row.name,
    email: row.email,
    phone: row.contact || "N/A",
    graduation_details: "Imported from spreadsheet",
    branch: row.technology || "General",
    interested_technology: row.technology || "General",
    is_veteran: false,
  };

  const { response: existingResponse, body: existingBody } = await restFetch(
    `${supabaseUrl}/rest/v1/career_advisory_intakes?select=id&candidate_id=eq.${candidateId}`,
    { method: "GET" },
    headers,
  );

  if (!existingResponse.ok) {
    throw new Error(
      `Failed to read career advisory intake: ${JSON.stringify(existingBody)}`,
    );
  }

  if (existingBody?.length > 0) {
    const { response, body } = await restFetch(
      `${supabaseUrl}/rest/v1/career_advisory_intakes?candidate_id=eq.${candidateId}`,
      { method: "PATCH", body: JSON.stringify(payload) },
      headers,
    );

    if (!response.ok) {
      throw new Error(
        `Failed to update career advisory intake: ${JSON.stringify(body)}`,
      );
    }
    return;
  }

  const { response, body } = await restFetch(
    `${supabaseUrl}/rest/v1/career_advisory_intakes`,
    { method: "POST", body: JSON.stringify(payload) },
    headers,
  );

  if (!response.ok) {
    throw new Error(
      `Failed to create career advisory intake: ${JSON.stringify(body)}`,
    );
  }
}

const filePath = resolve(process.cwd(), process.argv[2] ?? "data.xlsx");
const env = loadEnvLocal();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const defaultPassword = env.IMPORT_DEFAULT_PASSWORD ?? "Jobilly2026!";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${serviceRoleKey}`,
  apikey: serviceRoleKey,
  "Content-Type": "application/json",
};

const rows = parseRows(filePath);

const managers = new Map();
const mentors = new Map();

for (const row of rows) {
  if (row.managerEmail) {
    managers.set(row.managerEmail, {
      name: row.managerName || row.managerEmail,
      email: row.managerEmail,
      role: "manager",
    });
  }

  if (row.mentorEmail) {
    mentors.set(row.mentorEmail, {
      name: row.mentorName || row.mentorEmail,
      email: row.mentorEmail,
      role: "admin",
    });
  }
}

console.log(`Importing from ${filePath}`);
console.log(`Candidates: ${rows.length}`);
console.log(`Managers: ${managers.size}`);
console.log(`Mentors: ${mentors.size}`);
console.log(`Default password: ${defaultPassword}`);
console.log("");

const staffIds = new Map();

for (const staff of managers.values()) {
  const userId = await ensureStaffUser(supabaseUrl, headers, defaultPassword, staff);
  staffIds.set(staff.email, userId);
  console.log(`Manager ready: ${staff.name} <${staff.email}> (${userId})`);
}

for (const staff of mentors.values()) {
  const userId = await ensureStaffUser(supabaseUrl, headers, defaultPassword, staff);
  staffIds.set(staff.email, userId);
  console.log(`Mentor ready: ${staff.name} <${staff.email}> (${userId})`);
}

for (const row of rows) {
  const mentorId = staffIds.get(row.mentorEmail);
  if (!mentorId) {
    throw new Error(`Mentor not found for candidate ${row.email}`);
  }

  let existing = await findUserByEmail(supabaseUrl, headers, row.email);
  let candidateId = existing?.id;
  const { firstName, lastName } = splitFullName(row.name);

  if (!candidateId) {
    candidateId = await ensureAuthUser(
      supabaseUrl,
      headers,
      row.email,
      firstName,
      lastName,
      defaultPassword,
    );
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }

  await upsertPublicUser(
    supabaseUrl,
    headers,
    candidateId,
    row.email,
    firstName,
    lastName,
    "free_candidate",
  );

  await upsertCandidateProfile(supabaseUrl, headers, candidateId, {
    experience: row.experience,
    technology: row.technology,
    mentorId,
  });

  await upsertCareerAdvisoryIntake(supabaseUrl, headers, candidateId, row);

  console.log(
    `Candidate ready: ${row.name} <${row.email}> -> mentor ${row.mentorEmail}`,
  );
}

console.log("\nImport complete.");
console.log("Staff login: /admin/login");
console.log("Candidate login: /login");
console.log("Share the default password and ask everyone to change it after first login.");
