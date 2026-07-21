const fs = require("fs");
const path = require("path");
const target =
  process.argv[2] ||
  path.join(__dirname, "..", "public", "resume_dashboard.html");
const file = path.isAbsolute(target)
  ? target
  : path.join(process.cwd(), target);
let text = fs.readFileSync(file, "utf8");

const start = text.indexOf("<style>");
const end = text.indexOf("</style>") + "</style>".length;
if (start < 0 || end < start) throw new Error("style block not found");

const newCss = `<style>
    :root {
      --bg: #f0f3f9;
      --ink: #0c1018;
      --ink-secondary: #3b4559;
      --ink-muted: #6b7385;
      --card: rgba(255, 255, 255, 0.92);
      --card-border: rgba(15, 23, 42, 0.08);
      --elevated: #ffffff;
      --accent: #38b6ff;
      --accent-bright: #5cc4ff;
      --accent-soft: rgba(56, 182, 255, 0.12);
      --brand: #5170ff;
      --success: #059669;
      --success-soft: rgba(16, 185, 129, 0.12);
      --danger: #dc2626;
      --danger-soft: rgba(239, 68, 68, 0.1);
      --warning: #d97706;
      --shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
      --radius: 14px;
      --font: "Plus Jakarta Sans", system-ui, -apple-system, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--font);
      background:
        radial-gradient(1200px 500px at 10% -10%, rgba(56, 182, 255, 0.16), transparent 55%),
        radial-gradient(900px 420px at 95% 0%, rgba(81, 112, 255, 0.12), transparent 50%),
        var(--bg);
      color: var(--ink);
      min-height: 100vh;
    }

    header {
      background: rgba(255, 255, 255, 0.88);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--card-border);
      padding: 18px 28px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: var(--shadow);
    }
    header .logo {
      width: 42px; height: 42px;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--brand), var(--accent));
      color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px; font-weight: 800;
      box-shadow: 0 8px 18px rgba(81, 112, 255, 0.25);
    }
    header h1 {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: var(--ink);
    }
    header p { font-size: 13px; color: var(--ink-muted); margin-top: 2px; }

    .container { max-width: 1200px; margin: 0 auto; padding: 28px 20px 48px; }

    .steps { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
    .step {
      display: flex; align-items: center; gap: 8px;
      background: var(--elevated);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
      color: var(--ink-muted);
      transition: all 0.2s;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
    }
    .step.active {
      border-color: rgba(56, 182, 255, 0.45);
      color: var(--ink);
      background: var(--accent-soft);
    }
    .step.done {
      border-color: rgba(16, 185, 129, 0.35);
      color: var(--success);
      background: var(--success-soft);
    }
    .step-num {
      width: 22px; height: 22px; border-radius: 50%;
      background: #e8edf5; color: var(--ink-muted);
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 800;
    }
    .step.active .step-num { background: var(--accent); color: #0c1018; }
    .step.done .step-num { background: var(--success); color: #fff; }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 18px;
    }
    @media (max-width: 900px) { .grid-2 { grid-template-columns: 1fr; } }

    .card {
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: var(--radius);
      padding: 18px;
      box-shadow: var(--shadow);
    }
    .card-title {
      font-size: 11px;
      font-weight: 800;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 10px;
      display: flex; align-items: center; gap: 8px;
    }

    textarea {
      width: 100%;
      background: #fff;
      border: 1px solid var(--card-border);
      border-radius: 10px;
      color: var(--ink);
      font-size: 13px;
      line-height: 1.6;
      padding: 12px;
      resize: vertical;
      min-height: 240px;
      font-family: var(--font);
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    textarea:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px var(--accent-soft);
    }
    textarea::placeholder { color: #9aa3b5; }

    .action-bar {
      display: flex; gap: 10px; align-items: center;
      margin-bottom: 20px; flex-wrap: wrap;
    }
    button {
      cursor: pointer; border: none; border-radius: 10px;
      font-family: var(--font);
      font-size: 13px; font-weight: 700;
      padding: 11px 18px; transition: all 0.15s;
    }
    .btn-primary {
      background: var(--accent);
      color: #0c1018;
      box-shadow: 0 8px 18px rgba(56, 182, 255, 0.28);
    }
    .btn-primary:hover { background: var(--accent-bright); transform: translateY(-1px); }
    .btn-secondary {
      background: var(--elevated);
      color: var(--ink-secondary);
      border: 1px solid var(--card-border);
    }
    .btn-secondary:hover {
      background: var(--accent-soft);
      border-color: rgba(56,182,255,0.35);
      color: var(--ink);
    }
    .btn-success { background: var(--success); color: #fff; }
    .btn-success:hover { filter: brightness(1.05); }
    .btn-warning { background: var(--warning); color: #fff; }
    .btn-warning:hover { filter: brightness(1.05); }
    .btn-danger {
      background: var(--elevated);
      color: var(--danger);
      border: 1px solid rgba(220, 38, 38, 0.3);
    }
    .btn-danger:hover { background: var(--danger-soft); }
    button:disabled { opacity: 0.45; cursor: not-allowed; transform: none !important; }

    .score-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 18px;
    }
    @media (max-width: 900px) { .score-grid { grid-template-columns: repeat(2, 1fr); } }

    .score-card {
      background: var(--card);
      border: 1px solid var(--card-border);
      border-radius: var(--radius);
      padding: 16px;
      text-align: center;
      box-shadow: var(--shadow);
    }
    .score-label {
      font-size: 11px; color: var(--ink-muted);
      text-transform: uppercase; letter-spacing: 0.08em;
      font-weight: 700; margin-bottom: 8px;
    }
    .score-value { font-size: 30px; font-weight: 800; letter-spacing: -0.03em; }
    .score-value.green { color: var(--success); }
    .score-value.blue { color: #0284c7; }
    .score-value.yellow { color: var(--warning); }
    .score-value.red { color: var(--danger); }
    .score-sub { font-size: 12px; color: var(--ink-muted); margin-top: 4px; }

    .keyword-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .kw-tag { font-size: 12px; padding: 5px 10px; border-radius: 999px; font-weight: 700; }
    .kw-match {
      background: var(--success-soft); color: var(--success);
      border: 1px solid rgba(16, 185, 129, 0.28);
    }
    .kw-miss {
      background: var(--danger-soft); color: var(--danger);
      border: 1px solid rgba(220, 38, 38, 0.25);
    }

    #outputArea {
      width: 100%;
      background: #fff;
      border: 1px solid var(--card-border);
      border-radius: 10px;
      color: var(--ink);
      font-size: 13px;
      line-height: 1.75;
      padding: 18px;
      min-height: 420px;
      white-space: pre-wrap;
      font-family: var(--font);
      outline: none;
    }

    .progress-bar-wrap {
      width: 100%; background: #e8edf5; border-radius: 999px;
      height: 8px; overflow: hidden; margin: 8px 0;
    }
    .progress-bar {
      height: 100%; border-radius: 999px;
      background: linear-gradient(90deg, var(--accent), var(--success));
      transition: width 0.5s ease;
    }

    .spinner {
      display: inline-block; width: 16px; height: 16px;
      border: 2px solid #d7deea; border-top-color: var(--accent);
      border-radius: 50%; animation: spin 0.8s linear infinite;
      vertical-align: middle; margin-right: 8px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .hidden { display: none !important; }

    .tab-bar {
      display: flex; gap: 4px; margin-bottom: 14px;
      border-bottom: 1px solid var(--card-border); flex-wrap: wrap;
    }
    .tab-btn {
      background: none; border: none; color: var(--ink-muted);
      padding: 10px 14px; font-size: 13px; font-weight: 700;
      border-bottom: 2px solid transparent; border-radius: 0;
      font-family: var(--font);
    }
    .tab-btn.active { color: var(--ink); border-bottom-color: var(--accent); }
    .tab-content { display: none; }
    .tab-content.active { display: block; }

    .dl-strip {
      display: flex; gap: 10px; flex-wrap: wrap;
      margin-top: 12px; padding-top: 12px;
      border-top: 1px solid var(--card-border);
    }

    .gap-item {
      background: #f8fafc;
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 13px;
      color: var(--ink-secondary);
      margin-bottom: 8px;
    }
    .gap-item strong { color: var(--ink); }

    #toast {
      position: fixed; bottom: 24px; right: 24px;
      background: var(--success); color: #fff;
      padding: 12px 18px; border-radius: 10px;
      font-size: 13px; font-weight: 700;
      opacity: 0; transition: opacity 0.3s;
      z-index: 9999; max-width: 320px;
      box-shadow: var(--shadow);
    }
    #toast.show { opacity: 1; }

    .char-count { font-size: 11px; color: var(--ink-muted); text-align: right; margin-top: 4px; }

    .api-badge {
      display: inline-flex; align-items: center; gap: 6px;
      background: var(--success-soft);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 999px;
      padding: 6px 12px;
      font-size: 12px; color: var(--success); font-weight: 700;
    }
    .api-dot {
      width: 8px; height: 8px; background: var(--success);
      border-radius: 50%; animation: pulse 2s infinite;
    }
    @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

    .streaming-cursor::after {
      content: '▋'; animation: blink 1s infinite; color: var(--accent);
    }
    @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }

    .scorecard {
      background: #fff;
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 16px;
      font-size: 13px;
      line-height: 2;
    }
    .scorecard-row {
      display: flex; justify-content: space-between;
      border-bottom: 1px solid #eef2f7; padding: 6px 0;
    }
    .scorecard-row:last-child { border-bottom: none; }
    .sc-label { color: var(--ink-muted); }
    .sc-value { font-weight: 700; }
    .sc-green { color: var(--success); }
    .sc-blue { color: #0284c7; }
    .sc-yellow { color: var(--warning); }
    .sc-red { color: var(--danger); }

    .filename-box {
      background: #fff;
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 10px;
      padding: 18px;
    }
    .filename-value {
      font-size: 17px; font-weight: 800; color: var(--success);
      word-break: break-all; margin: 8px 0 12px;
      font-family: ui-monospace, monospace;
    }

    .error-box {
      background: var(--danger-soft);
      border: 1px solid rgba(220, 38, 38, 0.28);
      border-radius: 10px;
      padding: 16px;
      color: #991b1b;
      font-size: 13px;
      line-height: 1.7;
    }
  </style>`;

text = text.slice(0, start) + newCss + text.slice(end);

if (!text.includes("fonts.googleapis.com")) {
  text = text.replace(
    "<title>ATS Resume Tailoring Dashboard</title>",
    `<title>Resume dashboard · Jobilly</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />`,
  );
}

text = text.replace(
  `<header>
  <div class="logo">📄</div>
  <div style="flex:1;">
    <h1>ATS Resume Tailoring Dashboard</h1>
    <p>Powered by Google Gemini AI · 100/100 ATS-optimized rewrites · Real keyword extraction</p>
  </div>
  <div class="api-badge"><div class="api-dot"></div> Gemini AI Connected</div>
</header>`,
  `<header>
  <div class="logo">J</div>
  <div style="flex:1;">
    <h1>Resume dashboard</h1>
    <p>ATS-aligned rewrites with Gemini · Jobilly admin styling</p>
  </div>
  <div class="api-badge"><div class="api-dot"></div> Gemini AI Connected</div>
</header>`,
);

fs.writeFileSync(file, text);
console.log("restyled", fs.statSync(file).size);
