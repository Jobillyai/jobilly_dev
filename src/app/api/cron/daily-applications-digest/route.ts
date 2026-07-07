import { NextResponse } from "next/server";
import { runDailyApplicationsDigest } from "@/server/services/run-daily-applications-digest";

export const maxDuration = 300;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runDailyApplicationsDigest();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Digest job failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
