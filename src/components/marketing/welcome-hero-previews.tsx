"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  LayoutDashboard,
  Loader2,
  Mic,
  Send,
  Sparkles,
  Star,
} from "lucide-react";
import carouselStyles from "./welcome-hero-carousel.module.css";

const applyFields = [
  { label: "Full name", value: "Priya Sharma" },
  { label: "Email", value: "priya@email.com" },
  { label: "Résumé", value: "priya_sharma_v4.pdf" },
  { label: "Why this role?", value: "Tailored to job description…" },
] as const;

const applications = [
  { company: "Google", role: "Software Engineer", status: "submitted" as const, time: "2h ago" },
  { company: "Amazon", role: "SDE II", status: "tailoring" as const, time: "Now" },
  { company: "Airbnb", role: "Frontend Developer", status: "queued" as const, time: "3h ago" },
  { company: "SAP", role: "Cloud Consultant", status: "interview" as const, time: "Tomorrow" },
];

const lessons = [
  { title: "System design basics", progress: 100, status: "done" as const },
  { title: "Behavioral STAR method", progress: 72, status: "active" as const },
  { title: "DSA: arrays & hashing", progress: 0, status: "locked" as const },
];

function PortalShell({
  title,
  activeNav,
  children,
}: {
  title: string;
  activeNav: "dashboard" | "applications" | "practice" | "learn";
  children: React.ReactNode;
}) {
  const navItems = [
    { id: "dashboard" as const, label: "Dashboard", icon: LayoutDashboard },
    { id: "applications" as const, label: "Applications", icon: Briefcase },
    { id: "practice" as const, label: "Mock interviews", icon: Mic },
    { id: "learn" as const, label: "Growth School", icon: BookOpen },
  ];

  return (
    <div className={carouselStyles.previewWrap}>
      <div className={carouselStyles.window}>
        <div className={carouselStyles.titleBar}>
          <span className={carouselStyles.windowDot} />
          <span className={carouselStyles.windowDot} />
          <span className={carouselStyles.windowDot} />
          <span className={carouselStyles.titleBarLabel}>{title}</span>
        </div>
        <div className={carouselStyles.body}>
          <aside className={carouselStyles.sidebar}>
            <div className={carouselStyles.sidebarBrand}>Jobilly</div>
            <nav className={carouselStyles.sidebarNav}>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <span
                    key={item.id}
                    className={`${carouselStyles.navItem} ${
                      item.id === activeNav ? carouselStyles.navItemActive : ""
                    }`}
                  >
                    <Icon size={14} />
                    {item.label}
                  </span>
                );
              })}
            </nav>
          </aside>
          <div className={carouselStyles.main}>{children}</div>
        </div>
      </div>
    </div>
  );
}

export function DashboardHeroPreview() {
  return (
    <PortalShell title="jobilly.ai — dashboard" activeNav="dashboard">
      <div className={carouselStyles.mainHeader}>
        <div>
          <p className={carouselStyles.mainEyebrow}>Your workspace</p>
          <h3 className={carouselStyles.mainTitle}>Good morning, Priya</h3>
        </div>
        <span className={carouselStyles.creditBadge}>4 phases</span>
      </div>
      <div className={carouselStyles.statsRow}>
        <div className={carouselStyles.statBox}>
          <p className={carouselStyles.statLabel}>Applications</p>
          <p className={carouselStyles.statValue}>12</p>
        </div>
        <div className={carouselStyles.statBox}>
          <p className={carouselStyles.statLabel}>Next session</p>
          <p className={carouselStyles.statValue}>Thu 4pm</p>
        </div>
        <div className={carouselStyles.statBox}>
          <p className={carouselStyles.statLabel}>Mock score</p>
          <p className={carouselStyles.statValue}>8.4</p>
        </div>
      </div>
      <ul className={carouselStyles.feedList}>
        <li className={carouselStyles.feedItem}>
          <span className={carouselStyles.feedIcon}>
            <Calendar size={14} />
          </span>
          <div>
            <p className={carouselStyles.feedTitle}>Career advisory booked</p>
            <p className={carouselStyles.feedMeta}>Google Meet · Tomorrow 4:00 PM</p>
          </div>
        </li>
        <li className={carouselStyles.feedItem}>
          <span className={carouselStyles.feedIcon}>
            <Briefcase size={14} />
          </span>
          <div>
            <p className={carouselStyles.feedTitle}>3 new role matches</p>
            <p className={carouselStyles.feedMeta}>Google, Amazon, Airbnb</p>
          </div>
        </li>
        <li className={carouselStyles.feedItem}>
          <span className={carouselStyles.feedIcon}>
            <Sparkles size={14} />
          </span>
          <div>
            <p className={carouselStyles.feedTitle}>Lesson unlocked</p>
            <p className={carouselStyles.feedMeta}>Behavioral STAR method</p>
          </div>
        </li>
      </ul>
    </PortalShell>
  );
}

export function ApplicationsHeroPreview() {
  const [activeField, setActiveField] = useState(0);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setActiveField(applyFields.length);
      return;
    }
    const timer = window.setInterval(() => {
      setActiveField((c) => (c >= applyFields.length ? 0 : c + 1));
    }, 1200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className={carouselStyles.previewWrapWithFloat}>
      <PortalShell title="jobilly.ai — applications" activeNav="applications">
        <div className={carouselStyles.mainHeader}>
          <div>
            <p className={carouselStyles.mainEyebrow}>Managed apply</p>
            <h3 className={carouselStyles.mainTitle}>Applications</h3>
          </div>
          <span className={carouselStyles.creditBadge}>12 active</span>
        </div>
        <div className={carouselStyles.tableWrap}>
          <table className={carouselStyles.table}>
            <thead>
              <tr>
                <th>Role</th>
                <th>Status</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((row) => (
                <tr key={row.company}>
                  <td>
                    <p className={carouselStyles.rowCompany}>{row.company}</p>
                    <p className={carouselStyles.rowRole}>{row.role}</p>
                  </td>
                  <td>
                    <span
                      className={`${carouselStyles.status} ${
                        carouselStyles[`status_${row.status}`]
                      }`}
                    >
                      {row.status === "tailoring" ? (
                        <Loader2 size={11} className={carouselStyles.spin} />
                      ) : row.status === "submitted" ? (
                        <CheckCircle2 size={11} />
                      ) : row.status === "interview" ? (
                        <Calendar size={11} />
                      ) : (
                        <Clock size={11} />
                      )}
                      {row.status === "submitted"
                        ? "Submitted"
                        : row.status === "tailoring"
                          ? "Tailoring"
                          : row.status === "interview"
                            ? "Interview"
                            : "Queued"}
                    </span>
                  </td>
                  <td className={carouselStyles.rowTime}>{row.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PortalShell>
      <div className={carouselStyles.floatCard}>
        <div className={carouselStyles.floatHeader}>
          <Send size={14} />
          <span>Applying on your behalf</span>
        </div>
        <p className={carouselStyles.floatRole}>
          SDE II · <strong>Amazon</strong>
        </p>
        <ul className={carouselStyles.applyFields}>
          {applyFields.map((field, index) => {
            const done = index < activeField;
            const active = index === activeField && activeField < applyFields.length;
            return (
              <li
                key={field.label}
                className={`${carouselStyles.applyField} ${done ? carouselStyles.applyFieldDone : ""} ${
                  active ? carouselStyles.applyFieldActive : ""
                }`}
              >
                <span className={carouselStyles.applyCheck}>
                  {done ? (
                    <CheckCircle2 size={12} />
                  ) : (
                    <span className={carouselStyles.applyCheckEmpty} />
                  )}
                </span>
                <span>{field.label}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function MockInterviewHeroPreview() {
  const [bars, setBars] = useState([3, 5, 4, 7, 5, 8, 6, 4, 7, 5, 6, 4]);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const timer = window.setInterval(() => {
      setBars((current) =>
        current.map(() => Math.floor(Math.random() * 8) + 2),
      );
    }, 180);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <PortalShell title="jobilly.ai — mock interviews" activeNav="practice">
      <div className={carouselStyles.mainHeader}>
        <div>
          <p className={carouselStyles.mainEyebrow}>Voice AI practice</p>
          <h3 className={carouselStyles.mainTitle}>Mock interview</h3>
        </div>
        <span className={`${carouselStyles.creditBadge} ${carouselStyles.liveBadge}`}>
          Live
        </span>
      </div>
      <div className={carouselStyles.interviewCard}>
        <div className={carouselStyles.interviewTop}>
          <span className={carouselStyles.personaBadge}>Google persona</span>
          <span className={carouselStyles.interviewType}>Behavioral round</span>
        </div>
        <div className={carouselStyles.waveform}>
          {bars.map((height, index) => (
            <span
              key={index}
              className={carouselStyles.waveBar}
              style={{ height: `${height * 4}px` }}
            />
          ))}
        </div>
        <p className={carouselStyles.interviewPrompt}>
          &ldquo;Tell me about a time you led a project under a tight deadline.&rdquo;
        </p>
        <div className={carouselStyles.scoreRow}>
          <div className={carouselStyles.scoreItem}>
            <Star size={12} />
            <span>Clarity 8.6</span>
          </div>
          <div className={carouselStyles.scoreItem}>
            <Star size={12} />
            <span>Structure 8.2</span>
          </div>
          <div className={carouselStyles.scoreItem}>
            <Mic size={12} />
            <span>Recording…</span>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}

export function GrowthLearningHeroPreview() {
  return (
    <PortalShell title="jobilly.ai — growth school" activeNav="learn">
      <div className={carouselStyles.mainHeader}>
        <div>
          <p className={carouselStyles.mainEyebrow}>Skill path</p>
          <h3 className={carouselStyles.mainTitle}>Growth learning</h3>
        </div>
        <span className={carouselStyles.creditBadge}>Level 3</span>
      </div>
      <div className={carouselStyles.pathCard}>
        <p className={carouselStyles.pathLabel}>Your learning path</p>
        <p className={carouselStyles.pathTitle}>Software engineer — new grad</p>
        <div className={carouselStyles.pathProgress}>
          <span className={carouselStyles.pathProgressFill} style={{ width: "68%" }} />
        </div>
        <p className={carouselStyles.pathMeta}>68% complete · 2 of 3 modules done</p>
      </div>
      <ul className={carouselStyles.lessonList}>
        {lessons.map((lesson) => (
          <li key={lesson.title} className={carouselStyles.lessonItem}>
            <div className={carouselStyles.lessonMain}>
              <p className={carouselStyles.lessonTitle}>{lesson.title}</p>
              <div className={carouselStyles.lessonBar}>
                <span
                  className={carouselStyles.lessonBarFill}
                  style={{ width: `${lesson.progress}%` }}
                />
              </div>
            </div>
            <span
              className={`${carouselStyles.lessonStatus} ${
                carouselStyles[`lesson_${lesson.status}`]
              }`}
            >
              {lesson.status === "done"
                ? "Done"
                : lesson.status === "active"
                  ? "In progress"
                  : "Locked"}
            </span>
          </li>
        ))}
      </ul>
    </PortalShell>
  );
}
