import Link from "next/link";
import {
  Briefcase,
  Calendar,
  ClipboardList,
  GraduationCap,
  Settings,
  Users,
} from "lucide-react";
import styles from "@/app/admin/admin.module.css";

const quickActions = [
  {
    href: "/admin/candidates",
    label: "Candidate details",
    description: "Review profiles, education, and advisory submissions.",
    icon: Users,
  },
  {
    href: "/admin/jobs",
    label: "Job scraping",
    description: "Scrape and apply jobs for candidates in Excel view.",
    icon: Briefcase,
  },
  {
    href: "/admin/tasks",
    label: "Tasks",
    description: "Follow-ups, reviews, and action items.",
    icon: ClipboardList,
  },
  {
    href: "/admin/calendar",
    label: "Calendar",
    description: "Advisory sessions and scheduled Meet invites.",
    icon: Calendar,
  },
  {
    href: "/admin/candidates",
    label: "Advisory intakes",
    description: "Career advisory form submissions from students.",
    icon: GraduationCap,
  },
  {
    href: "/admin/profile",
    label: "Admin profile",
    description: "Update your name, photo, and account details.",
    icon: Settings,
  },
] as const;

export function AdminQuickActions() {
  return (
    <section className={styles.quickActionsSection}>
      <h2 className={styles.sectionTitle}>Quick actions</h2>
      <div className={styles.quickActionsGrid}>
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.label} href={action.href} className={styles.quickActionCard}>
              <span className={styles.quickActionIcon} aria-hidden>
                <Icon size={20} strokeWidth={2} />
              </span>
              <span className={styles.quickActionLabel}>{action.label}</span>
              <span className={styles.quickActionDesc}>{action.description}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
