import { NextResponse } from "next/server";
import {
  resolveManagerUserIdForCron,
  scrapeAllCandidateJobs,
} from "@/server/services/bulk-job-scrape";

export const maxDuration = 300;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const managerUserId = await resolveManagerUserIdForCron();
  if (!managerUserId) {
    return NextResponse.json(
      { error: "No manager account configured for job scraping." },
      { status: 503 },
    );
  }

  const result = await scrapeAllCandidateJobs(managerUserId, "cron");

  return NextResponse.json({
    ok: true,
    ...result,
  });
}
