/**
 * Generates development activity files from a single source of truth.
 * Run: node scripts/generate-dev-activities.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const entries = [
  { date: "2026-06-17", day: "Tuesday", module: "Project Setup", tasks: "Initial repository created; loaded codebase from GitHub; fixed dev server / environment issues", status: "Completed", notes: "Project kickoff" },
  { date: "2026-06-18", day: "Wednesday", module: "Authentication", tasks: "Built login & signup pages with Supabase token auth; navbar login/signup toggle; removed early-access button; redesigned forms to match welcome page; normal email signup (not university-only)", status: "Completed", notes: "Committed: Login page signup page and dashboard" },
  { date: "2026-06-18", day: "Wednesday", module: "Candidate Portal", tasks: "Dashboard with welcome-page-style service boxes; session persistence after login; global footer; user icon + edit profile; profile photo upload (avatars bucket); signup success → redirect to login", status: "Completed", notes: "" },
  { date: "2026-06-18", day: "Wednesday", module: "Password Reset", tasks: "Forgot-password flow attempted (OTP + reset link); email rate-limit issues; feature removed temporarily for stability", status: "Paused", notes: "Later replaced with simpler reset-link flow" },
  { date: "2026-06-18", day: "Wednesday", module: "Resume ATS", tasks: "Added resume ATS score checker on candidate dashboard", status: "Completed", notes: "" },
  { date: "2026-06-18", day: "Wednesday", module: "Career Advisory", tasks: "Career advisory intake form (name email phone graduation branch technology); Google Meet invite email on submit (local/dev only)", status: "Completed", notes: "Committed: career advisory form and Meet invites" },
  { date: "2026-06-18", day: "Wednesday", module: "Admin Portal", tasks: "Admin login + protected dashboard; admin user credentials; left sidebar (Dashboard Tasks Candidate Details Calendar); removed public admin navbar link; display names capitalized; admin profile edit", status: "Completed", notes: "Committed: admin dashboard and job scraping polish" },
  { date: "2026-06-18", day: "Wednesday", module: "Documentation", tasks: "Updated README with features and setup", status: "Completed", notes: "" },
  { date: "2026-06-18", day: "Wednesday", module: "Deployment", tasks: "Netlify deployment guidance; NEXT_PUBLIC_APP_URL configured; production deploy on Netlify", status: "Completed", notes: "jobillyai.netlify.app" },
  { date: "2026-06-22", day: "Monday", module: "Career Advisory", tasks: "Candidate-selected session booking time; branded invite emails; admin calendar for scheduled sessions", status: "Completed", notes: "" },
  { date: "2026-06-23", day: "Tuesday", module: "Admin Portal", tasks: "Admin calendar + meeting tasks pages; improved career advisory save reliability", status: "Completed", notes: "" },
  { date: "2026-06-23", day: "Tuesday", module: "UI/Design", tasks: "Switched layouts to cleaner plain-white backgrounds", status: "Completed", notes: "" },
  { date: "2026-06-25", day: "Thursday", module: "Resume & Jobs", tasks: "ATS scoring enhancements; Apify job scraping integration; candidate portal job features", status: "Completed", notes: "" },
  { date: "2026-06-26", day: "Friday", module: "Marketing", tasks: "Products Community Contact Us navbar; products/services page with pricing ($79.99 mock / $99.99 jobs / $149.99 bundle monthly); marketing pages and design system polish", status: "Completed", notes: "" },
  { date: "2026-06-26", day: "Friday", module: "Welcome Page", tasks: "Animated two-row company logo marquee (18 companies) with IntersectionObserver stagger animation", status: "Completed", notes: "" },
  { date: "2026-06-27", day: "Saturday", module: "Job Scraping", tasks: "Indeed LinkedIn Google Jobs sources; applied-job updates visible to candidates; job source column in listings", status: "Completed", notes: "" },
  { date: "2026-06-30", day: "Monday", module: "Roles & Auth", tasks: "Manager role + mentor admin role; manager oversees mentors; production auth hardening; member ID badges", status: "Completed", notes: "" },
  { date: "2026-06-30", day: "Monday", module: "Candidate Profile", tasks: "Expanded profile fields; contact/service request form; UI polish", status: "Completed", notes: "" },
  { date: "2026-06-30", day: "Monday", module: "Job Scraping", tasks: "24-hour role cache — scrape once per role per day stored in DB; previous searches dropdown; interested role field before search", status: "Completed", notes: "Reduces Apify billing" },
  { date: "2026-06-30", day: "Monday", module: "Build", tasks: "Fixed ESLint prefer-const error blocking production build", status: "Completed", notes: "" },
  { date: "2026-07-03", day: "Friday", module: "UI Redesign", tasks: "Created UI branch; ChronoTask-inspired redesign; new brand logo; removed repetitive/clumsy UI elements", status: "Completed", notes: "Pushed to UI branch" },
  { date: "2026-07-03", day: "Friday", module: "Git/DevOps", tasks: "Pushed to main; sandbox repo copy; cleaned up branches", status: "Completed", notes: "" },
  { date: "2026-07-03", day: "Friday", module: "Admin Jobs", tasks: "Admin job workflow updates; scrape-related DB migrations", status: "Completed", notes: "" },
  { date: "2026-07-05", day: "Sunday", module: "DevOps", tasks: "Dev server run / maintenance", status: "Completed", notes: "No major feature commits" },
  { date: "2026-07-06", day: "Monday", module: "Portal UX", tasks: "Removed veteran field from career advisory; US/India phone picker with flags (+1/+91); logout + user block top-right; welcome-page footer on candidate portal (session-safe links)", status: "Completed", notes: "Committed: portal UX polish" },
  { date: "2026-07-06", day: "Monday", module: "UI-2 Branch", tasks: "Created UI-2 branch; login/signup split layout with gradient logo panel; privacy & terms pages (full-width prose); logo aligned to new design; loading spinner brand colors", status: "Completed", notes: "" },
  { date: "2026-07-06", day: "Monday", module: "Candidate Dashboard", tasks: "Removed card constraints wider layout; applications list — title + company with expand; mock interview placeholder button per job", status: "Completed", notes: "" },
  { date: "2026-07-06", day: "Monday", module: "Admin Portal", tasks: "Admin sidebar matches candidate portal style; wider layouts; job sheet redesigned from table to expandable list; scraped/posted dates on jobs", status: "Completed", notes: "" },
  { date: "2026-07-06", day: "Monday", module: "Job Scraping", tasks: "Renamed Job Scraping → Apply for jobs; experience as Entry/Mid/Senior levels; resume upload for match % scoring; per-candidate resume storage; apply URL field (employer link not LinkedIn view URL); removed Jobright integration", status: "Completed", notes: "" },
  { date: "2026-07-06", day: "Monday", module: "Candidate Details", tasks: "Candidate list with expand-for-details; apply actions moved to Apply for jobs page only", status: "Completed", notes: "" },
  { date: "2026-07-07", day: "Tuesday", module: "Job Scraping", tasks: "Added Glassdoor & ZipRecruiter Apify sources; replaced clumsy source buttons with Job board dropdown + Search; per-candidate resume (not shared); removed analyze-on-file button; managers blocked from Apply for jobs", status: "Completed", notes: "" },
  { date: "2026-07-07", day: "Tuesday", module: "Copy/UI Cleanup", tasks: "Removed 3-hour cache hints match-% hints candidate page subtitles and API billing wording", status: "Completed", notes: "" },
  { date: "2026-07-07", day: "Tuesday", module: "Email — Daily Digest", tasks: "End-of-day applied-jobs email to candidates (company + role list show 3 + see more → portal); cron route + migration 0039; manual Send mail button on Applied jobs tab", status: "Completed", notes: "Migrations 0039/0040 applied" },
  { date: "2026-07-07", day: "Tuesday", module: "Manager Workflow", tasks: "New candidate signup → service request + manager email alert; assign mentor on signup (migration 0040); mentor assign UI on Candidate Details page", status: "Completed", notes: "" },
  { date: "2026-07-07", day: "Tuesday", module: "Mentor Meetings", tasks: "Mentors can send Google Meet links to assigned candidates (email + calendar invite); UI on Candidate Details and Tasks pages", status: "Completed", notes: "Uses RESEND_API_KEY in production" },
  { date: "2026-07-07", day: "Tuesday", module: "Bug Fixes", tasks: "Fixed .next cache vendor-chunks error; Supabase multi-relationship embed error on digest; JSX syntax errors in job sheet; resume upload Object.defineProperty error", status: "Completed", notes: "Delete .next and restart dev if cache corrupts" },
  { date: "2026-07-08", day: "Wednesday", module: "Job Scraping", tasks: "LinkedIn-first background job scraping with progressive table updates; admin scrape API route; resume text extraction and job-match scoring; apply URL migration", status: "Completed", notes: "Migrations 0037-0038; committed 86de109" },
  { date: "2026-07-08", day: "Wednesday", module: "Joben Chat", tasks: "Floating Joben chatbot on welcome page; AI backend (Gemini/Anthropic) with public knowledge guardrails; candidate-only topic matching; suggested prompts", status: "Completed", notes: "Committed 86de109" },
  { date: "2026-07-08", day: "Wednesday", module: "Email", tasks: "Candidate welcome email on signup; daily applied-jobs digest cron; new-candidate manager alerts; shared Jobilly.AI email branding and logo", status: "Completed", notes: "Migrations 0039-0041" },
  { date: "2026-07-08", day: "Wednesday", module: "Mentor Workflow", tasks: "Mentor meeting link form; Google Meet invite emails to assigned candidates; service request flow on new signup", status: "Completed", notes: "" },
  { date: "2026-07-08", day: "Wednesday", module: "Admin Portal", tasks: "Admin job list component; candidate jobs sheet redesign; candidates expand list; privacy and terms legal pages; error boundaries", status: "Completed", notes: "" },
  { date: "2026-07-09", day: "Thursday", module: "Marketing", tasks: "Animated arrow Lottie loader; welcome page marketing polish", status: "Completed", notes: "Committed ff5a1cf" },
  { date: "2026-07-10", day: "Friday", module: "Resume & Applications", tasks: "Improved application job descriptions; better tailored resume visibility for candidates", status: "Completed", notes: "Committed 2c4c5a3" },
  { date: "2026-07-11", day: "Saturday", module: "Welcome Page", tasks: "Hero carousel; pipeline section; wave mesh backgrounds; arcade portal styling; Lottie loader integration", status: "Completed", notes: "Committed d78f952" },
  { date: "2026-07-11", day: "Saturday", module: "Admin Portal", tasks: "Admin dashboard arcade refresh; calendar/jobs/tasks/requests page styling; portal background mesh", status: "Completed", notes: "" },
  { date: "2026-07-11", day: "Saturday", module: "Candidate Portal", tasks: "Dashboard calendar and applications UI refresh; profile page polish; portal gradient styling", status: "Completed", notes: "" },
  { date: "2026-07-11", day: "Saturday", module: "Authentication", tasks: "Google OAuth production fixes; Resend-ready auth redirect URLs for production", status: "Completed", notes: "Committed 7e2e826" },
  { date: "2026-07-11", day: "Saturday", module: "Password Reset", tasks: "Fixed reset links to use token_hash instead of Supabase action_link", status: "Completed", notes: "Committed a5ae3b7" },
  { date: "2026-07-11", day: "Saturday", module: "Branding", tasks: "Integrated Option 5 brand logo; mobile UI polish across marketing and portal", status: "Completed", notes: "Committed c79ea14" },
  { date: "2026-07-11", day: "Saturday", module: "Career Advisory", tasks: "Fixed invite and welcome email delivery in production; US/IST timezone scheduling for sessions", status: "Completed", notes: "Committed da070b9" },
  { date: "2026-07-11", day: "Saturday", module: "UI / Theme", tasks: "Site-wide dark theme toggle (sun/moon); portal timezone strip; globals.css theme tokens", status: "Completed", notes: "Committed 7bbabe7" },
  { date: "2026-07-11", day: "Saturday", module: "DevOps", tasks: "OneDrive build path fixes; clean-dev, prepare-build, and ensure-no-dev scripts", status: "Completed", notes: "" },
  { date: "2026-07-13", day: "Monday", module: "Admin Jobs", tasks: "Cyan admin accent (replacing indigo/lavender); larger company and role on job cards and modal; removed match % from list and modal", status: "Completed", notes: "nemesis branch — local" },
  { date: "2026-07-13", day: "Monday", module: "Joben Chat", tasks: "Full-screen portal chat with blurred backdrop; spider-web lavender grid background; animated connector lines; sun/moon theme toggle; New chat button; always-visible suggestions; redirect CTAs to products/signup/dashboard; black dark theme; transparent header and welcome blocks; wider chat layout", status: "Completed", notes: "nemesis branch — local" },
  { date: "2026-07-13", day: "Monday", module: "Admin Tasks", tasks: "Daily mentor task updates form; manager email digest; rewritten tasks page for mentors and managers; admin_daily_updates table", status: "Completed", notes: "Migration 0042 — apply in Supabase" },
  { date: "2026-07-13", day: "Monday", module: "Resume / ATS", tasks: "Removed standalone ATS resume score and tailor-resume pages; consolidated resume storage and analyze flow; shared Apify client", status: "Completed", notes: "nemesis branch — local" },
  { date: "2026-07-13", day: "Monday", module: "Portal UI", tasks: "Portal background component with mesh styling; auth page and lottie loader polish", status: "Completed", notes: "nemesis branch — local" },
  { date: "2026-07-13", day: "Monday", module: "DevOps", tasks: "nemesis branch active; OneDrive .next cache maintenance; next.config and clean-dev script updates", status: "Completed", notes: "origin/nemesis pushed" },
];

function weekForDate(iso) {
  const start = new Date("2026-06-17T12:00:00");
  const d = new Date(`${iso}T12:00:00`);
  const diff = Math.floor((d - start) / (7 * 24 * 60 * 60 * 1000));
  return `Week ${diff + 1}`;
}

function statusLabel(status) {
  if (status === "Completed") return "✅ Completed";
  if (status === "Paused") return "⏸ Paused";
  return "🔄 In Progress";
}

function escapeCsv(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

const downloadsDir = resolve(root, "public/downloads");

// Rich CSV (with Week + emoji status)
const richHeader = ["Date", "Day", "Week", "Module", "Tasks Completed", "Status", "Notes"];
const richRows = entries.map((e) => [
  e.date,
  e.day,
  weekForDate(e.date),
  e.module,
  e.tasks,
  statusLabel(e.status),
  e.notes,
]);
const richCsv = [richHeader, ...richRows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
writeFileSync(resolve(downloadsDir, "jobilly-daily-development-activities.csv"), richCsv, "utf8");

// Google Sheet format (matches live sheet columns)
const sheetHeader = ["Date", "Day", "Module", "Tasks Completed", "Status", "Notes"];
const sheetRows = entries.map((e) => [
  e.date,
  e.day,
  e.module,
  e.tasks,
  e.status,
  e.notes,
]);
const sheetCsv = [sheetHeader, ...sheetRows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
writeFileSync(resolve(downloadsDir, "google-sheet-import.csv"), sheetCsv, "utf8");

// Patch HTML entries array
const htmlPath = resolve(downloadsDir, "jobilly-daily-development-activities.html");
let html = readFileSync(htmlPath, "utf8");

const entriesJson = entries
  .map((e) => `      { date: "${e.date}", day: "${e.day}", module: "${e.module.replace(/"/g, '\\"')}", tasks: "${e.tasks.replace(/"/g, '\\"')}", status: "${e.status}", notes: "${e.notes.replace(/"/g, '\\"')}" }`)
  .join(",\n");

html = html.replace(
  /const entries = \[[\s\S]*?\];/,
  `const entries = [\n${entriesJson},\n    ];`,
);

const lastDate = entries[entries.length - 1].date;
html = html.replace(
  /<span>Jul 7, 2026<\/span>/,
  `<span>${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${lastDate}T12:00:00`))}</span>`,
);

writeFileSync(htmlPath, html, "utf8");

console.log(`Updated ${entries.length} entries through ${lastDate}`);
console.log(`  → public/downloads/jobilly-daily-development-activities.csv`);
console.log(`  → public/downloads/google-sheet-import.csv`);
console.log(`  → public/downloads/jobilly-daily-development-activities.html`);
