# MY TAKE

**Job Data Ingestion: How Our Apify Scraping Works — and Why API-First Still Wins**

A personal opinion on how Jobilly’s current Apify pipeline actually works, how it compares to indexed/ATS APIs, and why Apify shouldn’t stay our default.

Written by: Jobilly.ai Team  
Date: July 22, 2026

## 1. How our Apify scraping works today

This section describes the live managed-applications scrape path as of July 2026 — not a hypothetical. Understanding it matters before arguing for a replacement.

### 1.1 Trigger and eligibility

- An authorized Job Apply admin opens an eligible candidate and starts a scrape.
- Checks: authenticated staff, Job Apply access, scrape permission, assignment to that candidate, and a plan that includes Managed Applications.
- Scraping is on-demand when cache is stale — not a guaranteed every-three-hours auto-run for every candidate (three hours is the freshness/cache window).

### 1.2 Resume → search intent

- Input: candidate PDF/DOCX resume, or an admin TXT override if present.
- Gemini (resume intelligence) extracts target roles, canonical search title, skills, search keywords, occupational category, accepted title patterns, and excluded categories.
- Admin can edit/add keywords before search. Final keywords = admin list ∪ resume keywords (deduped).
- External query is US-nationwide and shaped as OR groups: `(role1 OR role2 OR …) + (kw1 OR kw2 OR …)`.

### 1.3 Apify collection layer

- Auth: `APIFY_API_TOKEN` or `APIFY_KEY` → Apify `run-sync-get-dataset-items` API.
- Active sources today: **LinkedIn + Indeed only** (parallel). Glassdoor and ZipRecruiter actors exist in code but are not in the active source list.
- Actors: LinkedIn = `curious_coder~linkedin-jobs-scraper`; Indeed = `misceres~indeed-scraper`.
- We do not crawl arbitrary company career pages. We build LinkedIn/Indeed search URLs (keywords, United States, posted-within window) and hand those start URLs to the actors.
- Per selected source we run two searches in parallel: (A) regular role search, (B) Fortune 500–biased search (rotating 12-company batch, 3-hour rotation bucket), then keep Fortune hits only when company signals match.
- Lookback: first successful search up to ~15 days (Indeed capped to fromage steps 1/3/7/14 → max 14); later searches start from last success + ~1h overlap. LinkedIn uses seconds-based `f_TPR` (min 1 hour).
- Raw items are normalized to a common `JobListing`, Jobright URLs dropped, URL-deduped, then lightly relevance-filtered.

### 1.4 Post-Apify quality gates (our real product edge)

- Occupational category gate via Gemini (e.g. Data Technician ≠ Electronics Technician).
- Keyword gate: typically ≥2 keyword hits in the job description.
- Rank by keyword match count, then resume-match score; store/refresh by URL.
- 3-hour cache per candidate/source/role-intent.

**Bottom line:** Apify is only the fetch layer for LinkedIn/Indeed SERP-style pages. Matching quality is mostly post-processing — so swapping fetch to APIs is high leverage.

## 2. Why Apify bothers me as the default fetch

Apify isn’t a bad tool for LinkedIn/Indeed search pages, but it’s the wrong default when structured alternatives exist:

- **Slow:** seconds–minutes per source; ~180–240s sync timeouts.
- **Expensive:** compute/proxy × runs × sources × (regular + Fortune).
- **Fragile:** actor/DOM/anti-bot changes break us without a Jobilly code change.
- **Noisy:** HTML-derived text needs cleanup; we spend Gemini spend cleaning a noisy fetch.

Our gates are strong; our fetch is still “pay to render SERPs.”

## 3. What I’d reach for instead

Apify shouldn’t be the first call — last resort only.

### 3.1 Proposed fetch router

1. Detect ATS (Greenhouse, Lever, Ashby, Workday) → public JSON boards.
2. Else aggregator/indexed APIs (JSearch, Adzuna, Jooble; SerpApi if needed) with the same role+keyword intent.
3. Keep post-fetch stack: normalize → category gate → keyword gate → rank → store/cache.
4. Only then Apify (or lighter render proxy) for gaps / custom career sites.

### 3.2 Current vs proposed

| Dimension | Current (Apify fetch) | Proposed (API-first fetch) |
|---|---|---|
| What we scrape | LinkedIn + Indeed search URLs via Apify; Fortune in parallel | ATS JSON + indexed aggregators first; Apify for gaps |
| Method | run-sync actor → dataset → normalize | Direct JSON HTTP; browser/actor as fallback |
| Speed | Seconds–minutes per source; dual query | Milliseconds–seconds; parallelizable |
| Cost | Apify compute/proxy; 2×2 searches common | Free/low-cost ATS + cheap aggregators |
| Reliability | Actor health / anti-bot | Stable schemas |
| Matching quality | Strong after fetch | Same gates; cleaner upstream fields |
| Coverage | Strong SERPs; weak direct company boards | Stronger ATS; may still need Apify for exclusives |

### 3.3 Sources to integrate

| Source | What it gives us | Priority |
|---|---|---|
| Greenhouse / Lever / Ashby | Public JSON job boards — free, fast | P0 |
| Workday | JSON behind tenants; endpoint discovery | P1 |
| JSearch (RapidAPI) | Indexed aggregation, structured fields | P1 |
| Adzuna / Jooble | Broad aggregator JSON | P1–P2 |
| ScraperAPI / ScrapingBee | Lighter render+proxy | P2 |
| Apify (retained) | Last resort gaps / custom sites | P3 |

### 3.4 Ranked order

1. ATS APIs  
2. JSearch / Adzuna  
3. ScraperAPI / ScrapingBee  
4. Apify last  

Keep resume intelligence + occupational gates either way.

### 3.5 ~100 jobs time & cost (illustrative)

| Source | Est. time | Est. cost | Notes |
|---|---|---|---|
| Apify (current) | ~5–8+ min | ~$0.50–$3.00 | LinkedIn+Indeed; regular+Fortune multiplies runs |
| Greenhouse / Lever / Ashby | < 5 sec | $0 | Whole-board JSON |
| JSearch | ~10–15 sec | ~$0.01–$0.05 | Paginated indexed |
| Adzuna | ~10–15 sec | Often free tier | Similar pagination |
| ScraperAPI / ScrapingBee | ~2–3 min | ~$0.05–$0.20 | Lighter than Apify |

## 4. Why this matters for Jobilly

- Throughput: shorter time-to-sheet for admins.
- Cost: cut Apify + some Gemini cleanup.
- Reliability: fewer empty/timeout failures.
- Product fit: differentiator is occupational accuracy after fetch — not a browser farm.

## 5. Rough sequence

| Phase | Focus | Outcome |
|---|---|---|
| Week 1 | ATS detection + Greenhouse/Lever into existing gates | Direct API for top companies |
| Week 2 | JSearch (+ Adzuna) as primary aggregator | Most Apify volume replaceable |
| Week 3 | API hit? skip Apify; else fallback | Apify minority of runs |
| Week 4 | Monitoring, dedupe, ghost flags; compare acceptance rates | Evidence-based cutover |

## 6. Bottom line

Today: resume intelligence → Apify LinkedIn/Indeed (× Fortune) → normalize → category/keyword gates → rank/store/cache.

The gates are the smart part; Apify is the expensive, slow, fragile part. Apify should be last resort. ATS APIs + JSearch are the highest-leverage swap — and they can reuse the matching stack we already trust.
