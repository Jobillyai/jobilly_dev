"use client";

import { useEffect, useState } from "react";

type CandidateLocalTimeProps = {
  timezone: string;
  className?: string;
};

/** Live local time for a candidate, e.g. "Wed 3:26 PM EST". */
export function CandidateLocalTime({ timezone, className }: CandidateLocalTimeProps) {
  // Rendered only after mount so the server and client markup never disagree.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return <span className={className}>…</span>;
  }

  let label: string;
  try {
    label = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(now);
  } catch {
    return null;
  }

  return <span className={className}>{label}</span>;
}
