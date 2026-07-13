import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAdminUser,
  staffCanAccessJobApplyPortal,
  staffCanScrapeJobs,
  toStaffContext,
} from "@/lib/auth/admin";
import { getAdminCandidateById } from "@/server/services/admin-dashboard";
import {
  getCandidateJobListings,
  runCandidateJobScrapeForSources,
} from "@/server/services/candidate-jobs";
import {
  JOB_MARKET_SOURCES,
  type JobMarketSource,
} from "@/server/services/job-market-search";
import {
  describeCacheStatus,
  isScrapeCacheFresh,
  normalizeSearchRole,
  type RoleScrapeCacheStatus,
} from "@/server/services/job-role-cache";
import { createClient } from "@/server/db/supabase-server";

export const maxDuration = 300;

const bodySchema = z.object({
  candidateId: z.string().uuid(),
  sourceMode: z.enum(["all", "linkedin", "indeed"]),
  interestedRole: z.string().min(1),
  searchKeywords: z.string().nullable().optional(),
});

function sourcesFromMode(mode: z.infer<typeof bodySchema>["sourceMode"]): JobMarketSource[] {
  if (mode === "all") {
    return [...JOB_MARKET_SOURCES];
  }
  return [mode];
}

async function getRoleScrapeCacheForSources(
  candidateId: string,
  searchRole: string,
  sources: JobMarketSource[],
): Promise<RoleScrapeCacheStatus[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("job_role_scrapes")
    .select("source, last_scraped_at")
    .eq("candidate_id", candidateId)
    .eq("search_role", searchRole)
    .in("source", sources);

  const bySource = new Map(
    (data ?? []).map((row) => [row.source as JobMarketSource, row.last_scraped_at]),
  );

  return sources.map((source) => {
    const lastScrapedAt = bySource.get(source) ?? null;
    return {
      source,
      lastScrapedAt,
      fresh: isScrapeCacheFresh(lastScrapedAt),
    };
  });
}

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const staff = toStaffContext(admin);
  if (!staffCanAccessJobApplyPortal(staff)) {
    return NextResponse.json({ error: "Managers cannot use the job apply portal." }, { status: 403 });
  }

  if (!staffCanScrapeJobs(staff)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid scrape request." }, { status: 400 });
  }

  const { candidateId, sourceMode, interestedRole, searchKeywords } = parsed.data;
  const sources = sourcesFromMode(sourceMode);
  const searchRole = normalizeSearchRole(interestedRole);

  const candidate = await getAdminCandidateById(candidateId, staff);
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const cacheStatus = await getRoleScrapeCacheForSources(
    candidateId,
    searchRole,
    sources,
  );
  const sourcesToScrape = cacheStatus
    .filter((entry) => !entry.fresh)
    .map((entry) => entry.source);

  if (sourcesToScrape.length === 0) {
    const jobs = await getCandidateJobListings(candidateId, searchRole);
    return NextResponse.json({
      success: true,
      scrapeCalled: false,
      newJobsAdded: 0,
      count: jobs.length,
      cacheStatus,
      info: describeCacheStatus(cacheStatus, sources) || "All selected sources are still cached.",
    });
  }

  const scrapeResult = await runCandidateJobScrapeForSources({
    candidate,
    adminUserId: admin.id,
    sources: sourcesToScrape,
    interestedRole,
    searchKeywords: searchKeywords?.trim() || null,
  });

  const updatedCacheStatus = await getRoleScrapeCacheForSources(
    candidateId,
    searchRole,
    sources,
  );
  const jobs = await getCandidateJobListings(candidateId, searchRole);
  const warning =
    scrapeResult.scrapeErrors.length > 0
      ? scrapeResult.scrapeErrors.join(" ")
      : undefined;

  revalidatePath(`/admin/candidates/${candidateId}/jobs`);
  revalidatePath(`/admin/candidates/${candidateId}/jobs/applied`);
  revalidatePath("/admin/jobs");

  if (scrapeResult.fatalError && jobs.length === 0) {
    return NextResponse.json(
      { error: scrapeResult.fatalError, warning },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    scrapeCalled: true,
    newJobsAdded: scrapeResult.newJobsAdded,
    count: jobs.length,
    cacheStatus: updatedCacheStatus,
    warning,
    info: describeCacheStatus(updatedCacheStatus, sources) || undefined,
    error: scrapeResult.fatalError,
  });
}
