import { NextResponse } from "next/server";

export const maxDuration = 300;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    skipped: true,
    reason:
      "Automatic bulk scraping is disabled. Assigned admins search jobs from each candidate sheet (3-hour limit per role).",
  });
}
