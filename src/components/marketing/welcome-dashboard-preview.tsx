"use client";

import { useEffect, useState } from "react";
import {
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  Loader2,
  Send,
  User,
} from "lucide-react";
import styles from "./welcome-dashboard-preview.module.css";

type AppRow = {
  company: string;
  role: string;
  status: "submitted" | "tailoring" | "queued" | "interview";
  statusLabel: string;
  time: string;
};

const applications: AppRow[] = [
  {
    company: "Google",
    role: "Software Engineer",
    status: "submitted",
    statusLabel: "Submitted",
    time: "2h ago",
  },
  {
    company: "Amazon",
    role: "SDE II",
    status: "tailoring",
    statusLabel: "Tailoring résumé",
    time: "Now",
  },
  {
    company: "Airbnb",
    role: "Frontend Developer",
    status: "queued",
    statusLabel: "Queued",
    time: "3h ago",
  },
  {
    company: "SAP",
    role: "Cloud Consultant",
    status: "interview",
    statusLabel: "Interview",
    time: "Tomorrow",
  },
];

const matches = [
  { company: "Google", role: "Software Engineer", match: 94 },
  { company: "Amazon", role: "SDE II", match: 91 },
  { company: "Airbnb", role: "Frontend Developer", match: 88 },
  { company: "SAP", role: "Cloud Consultant", match: 85 },
];

const applyFields = [
  { label: "Full name", value: "Alex Morgan" },
  { label: "Email", value: "alex@morgan.io" },
  { label: "Résumé", value: "alex_morgan_v3.pdf" },
  { label: "Why this role?", value: "Tailored to job description…" },
] as const;

export function WelcomeDashboardPreview() {
  const [activeField, setActiveField] = useState(0);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setActiveField(applyFields.length);
      return;
    }

    const timer = window.setInterval(() => {
      setActiveField((current) =>
        current >= applyFields.length ? 0 : current + 1,
      );
    }, 1400);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className={styles.wrap} aria-hidden>
      <div className={styles.window}>
        <div className={styles.titleBar}>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.titleBarLabel}>jobilly.ai — candidate portal</span>
        </div>

        <div className={styles.body}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarBrand}>Jobilly</div>
            <nav className={styles.sidebarNav}>
              <span className={`${styles.navItem} ${styles.navItemActive}`}>
                <LayoutDashboard size={14} />
                Dashboard
              </span>
              <span className={styles.navItem}>
                <Briefcase size={14} />
                Applications
              </span>
              <span className={styles.navItem}>
                <Calendar size={14} />
                Calendar
              </span>
              <span className={styles.navItem}>
                <User size={14} />
                Profile
              </span>
            </nav>
          </aside>

          <div className={styles.main}>
            <div className={styles.mainHeader}>
              <div>
                <p className={styles.mainEyebrow}>Your workspace</p>
                <h3 className={styles.mainTitle}>Applications</h3>
              </div>
              <span className={styles.creditBadge}>12 active</span>
            </div>

            <div className={styles.matches}>
              <p className={styles.matchesLabel}>Top matches</p>
              <ul className={styles.matchList}>
                {matches.map((match) => (
                  <li key={match.company} className={styles.matchItem}>
                    <div>
                      <p className={styles.matchRole}>{match.role}</p>
                      <p className={styles.matchCompany}>{match.company}</p>
                    </div>
                    <span className={styles.matchPct}>{match.match}%</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Status</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((row) => (
                    <tr key={`${row.company}-${row.role}`}>
                      <td>
                        <p className={styles.rowCompany}>{row.company}</p>
                        <p className={styles.rowRole}>{row.role}</p>
                      </td>
                      <td>
                        <span className={`${styles.status} ${styles[`status_${row.status}`]}`}>
                          {row.status === "tailoring" ? (
                            <Loader2 size={11} className={styles.spin} />
                          ) : row.status === "submitted" ? (
                            <CheckCircle2 size={11} />
                          ) : row.status === "interview" ? (
                            <Calendar size={11} />
                          ) : (
                            <Clock size={11} />
                          )}
                          {row.statusLabel}
                        </span>
                      </td>
                      <td className={styles.rowTime}>{row.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.applyCard}>
        <div className={styles.applyHeader}>
          <Send size={14} />
          <span>Applying on your behalf</span>
        </div>
        <p className={styles.applyRole}>
          SDE II · <strong>Amazon</strong>
        </p>
        <ul className={styles.applyFields}>
          {applyFields.map((field, index) => {
            const isDone = index < activeField;
            const isActive =
              index === activeField && activeField < applyFields.length;

            return (
              <li
                key={field.label}
                className={`${styles.applyField} ${isDone ? styles.applyFieldDone : ""} ${
                  isActive ? styles.applyFieldActive : ""
                }`}
              >
                <span className={styles.applyCheck}>
                  {isDone ? <CheckCircle2 size={12} /> : <span className={styles.applyCheckEmpty} />}
                </span>
                <span className={styles.applyFieldLabel}>{field.label}</span>
                <span className={styles.applyFieldValue}>{field.value}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
