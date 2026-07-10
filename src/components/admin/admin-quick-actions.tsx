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
    description: "Profiles, education, and advisory submissions.",
    icon: Users,
    tone: "blue" as const,
  },
  {
    href: "/admin/jobs",
    label: "Job listings",
    description: "Search and apply for assigned candidates.",
    icon: Briefcase,
    tone: "purple" as const,
  },
  {
    href: "/admin/tasks",
    label: "Tasks",
    description: "Follow-ups, reviews, and action items.",
    icon: ClipboardList,
    tone: "emerald" as const,
  },
  {
    href: "/admin/calendar",
    label: "Calendar",
    description: "Advisory sessions and Meet invites.",
    icon: Calendar,
    tone: "amber" as const,
  },
  {
    href: "/admin/candidates",
    label: "Advisory intakes",
    description: "Career advisory form submissions.",
    icon: GraduationCap,
    tone: "indigo" as const,
  },
  {
    href: "/admin/profile",
    label: "Admin profile",
    description: "Name, photo, and account details.",
    icon: Settings,
    tone: "rose" as const,
  },
] as const;

type AdminQuickActionsProps = {
  showJobApply?: boolean;
};

export function AdminQuickActions({ showJobApply = true }: AdminQuickActionsProps) {
  const actions = showJobApply
    ? quickActions
    : quickActions.filter((action) => action.href !== "/admin/jobs");

  return (
    <section className={styles.quickSection}>
      <div className={styles.sectionHeaderRow}>
        <h2 className={styles.sectionTitle}>Quick actions</h2>
        <span className={styles.sectionMeta}>{actions.length} shortcuts</span>
      </div>
      <div className={styles.quickGrid}>
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.label} href={action.href} className={styles.quickCard}>
              <span className={`${styles.quickIcon} ${styles[`quickIcon_${action.tone}`]}`}>
                <Icon size={20} strokeWidth={2} aria-hidden />
              </span>
              <h3 className={styles.quickLabel}>{action.label}</h3>
              <p className={styles.quickDesc}>{action.description}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
