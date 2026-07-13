import type { DailyActivityItem } from "@/server/services/admin-daily-updates";

export type GroupedDailyActivity = {
  id: string;
  badge: string;
  label: string;
  at: string | null;
};

function formatJobLine(item: DailyActivityItem): string {
  const candidate = item.label.replace(/^Found job for /, "");
  return item.detail ? `${item.detail} (${candidate})` : candidate;
}

function formatApplicationLine(item: DailyActivityItem): string {
  const candidate = item.label.replace(/^Submitted application for /, "");
  return item.detail ? `${item.detail} (${candidate})` : candidate;
}

/** Collapse per-job rows into one label per activity type. */
export function groupDailyActivityItems(items: DailyActivityItem[]): GroupedDailyActivity[] {
  const groups: GroupedDailyActivity[] = [];
  const jobItems = items.filter((item) => item.category === "job_scraped");
  const applicationItems = items.filter((item) => item.category === "application");
  const otherItems = items.filter(
    (item) => item.category !== "job_scraped" && item.category !== "application",
  );

  if (jobItems.length > 0) {
    const lines = jobItems.map(formatJobLine);
    groups.push({
      id: "jobs-found",
      badge: "Jobs",
      label: `${jobItems.length} job${jobItems.length === 1 ? "" : "s"} found — ${lines.join(" · ")}`,
      at: jobItems[0]?.at ?? null,
    });
  }

  if (applicationItems.length > 0) {
    const lines = applicationItems.map(formatApplicationLine);
    groups.push({
      id: "applications",
      badge: "Applications",
      label: `${applicationItems.length} application${applicationItems.length === 1 ? "" : "s"} submitted — ${lines.join(" · ")}`,
      at: applicationItems[0]?.at ?? null,
    });
  }

  for (const item of otherItems) {
    const badge =
      item.category === "meet_invite"
        ? "Invite"
        : item.category === "meeting"
          ? "Session"
          : "Activity";

    groups.push({
      id: item.id,
      badge,
      label: item.detail ? `${item.label} — ${item.detail}` : item.label,
      at: item.at,
    });
  }

  return groups;
}
