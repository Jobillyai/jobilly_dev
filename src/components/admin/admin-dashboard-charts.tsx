"use client";

import styles from "./admin-dashboard-charts.module.css";

export type ChartSegment = {
  label: string;
  value: number;
  color: string;
};

type PieChartProps = {
  segments: ChartSegment[];
  size?: number;
};

function PieChart({ segments, size = 168 }: PieChartProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const radius = 62;
  const stroke = 24;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  if (total === 0) {
    return (
      <div className={styles.pieEmpty} style={{ width: size, height: size }}>
        <span>No data</span>
      </div>
    );
  }

  let offset = 0;

  return (
    <svg
      className={styles.pieSvg}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-hidden
    >
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke="#f3f4f6"
        strokeWidth={stroke}
      />
      {segments.map((segment) => {
        if (segment.value <= 0) {
          return null;
        }

        const dash = (segment.value / total) * circumference;
        const circle = (
          <circle
            key={segment.label}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={segment.color}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${center} ${center})`}
          />
        );
        offset += dash;
        return circle;
      })}
      <text x={center} y={center - 4} textAnchor="middle" className={styles.pieCenterValue}>
        {total}
      </text>
      <text x={center} y={center + 14} textAnchor="middle" className={styles.pieCenterLabel}>
        total
      </text>
    </svg>
  );
}

type ChartCardProps = {
  title: string;
  description: string;
  segments: ChartSegment[];
};

function ChartCard({ title, description, segments }: ChartCardProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <article className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>{title}</h3>
        <p className={styles.chartDesc}>{description}</p>
      </div>
      <div className={styles.chartBody}>
        <PieChart segments={segments} />
        <ul className={styles.legend}>
          {segments.map((segment) => {
            const percent = total > 0 ? Math.round((segment.value / total) * 100) : 0;
            return (
              <li key={segment.label} className={styles.legendItem}>
                <span
                  className={styles.legendSwatch}
                  style={{ backgroundColor: segment.color }}
                  aria-hidden
                />
                <span className={styles.legendLabel}>{segment.label}</span>
                <span className={styles.legendValue}>
                  {segment.value} ({percent}%)
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </article>
  );
}

type AdminDashboardChartsProps = {
  freeCandidates: number;
  premiumCandidates: number;
  candidatesWithSubmission: number;
  candidatesWithoutSubmission: number;
  invitesSent: number;
  pendingInvites: number;
  selectedJobs: number;
  unselectedJobs: number;
};

export function AdminDashboardCharts({
  freeCandidates,
  premiumCandidates,
  candidatesWithSubmission,
  candidatesWithoutSubmission,
  invitesSent,
  pendingInvites,
  selectedJobs,
  unselectedJobs,
}: AdminDashboardChartsProps) {
  return (
    <section className={styles.chartsSection}>
      <h2 className={styles.chartsSectionTitle}>Overview charts</h2>
      <div className={styles.chartsGrid}>
        <ChartCard
          title="Candidate plans"
          description="Free vs premium candidate accounts"
          segments={[
            { label: "Free candidates", value: freeCandidates, color: "#4a9fff" },
            { label: "Premium candidates", value: premiumCandidates, color: "#7c3aed" },
          ]}
        />
        <ChartCard
          title="Advisory coverage"
          description="Candidates with career advisory submissions"
          segments={[
            {
              label: "With submission",
              value: candidatesWithSubmission,
              color: "#059669",
            },
            {
              label: "Without submission",
              value: candidatesWithoutSubmission,
              color: "#d1d5db",
            },
          ]}
        />
        <ChartCard
          title="Meet invite status"
          description="Google Meet invites for advisory intakes"
          segments={[
            { label: "Invite sent", value: invitesSent, color: "#7c3aed" },
            { label: "Invite pending", value: pendingInvites, color: "#f59e0b" },
          ]}
        />
        <ChartCard
          title="Jobs pipeline"
          description="Jobs selected for admin apply workflow"
          segments={[
            { label: "Marked to apply", value: selectedJobs, color: "#8b5cf6" },
            { label: "Not selected yet", value: unselectedJobs, color: "#93c5fd" },
          ]}
        />
      </div>
    </section>
  );
}
