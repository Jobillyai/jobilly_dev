import {
  Briefcase,
  Calendar,
  ClipboardList,
  Inbox,
  LayoutDashboard,
  ReceiptText,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";

type AdminNavHref =
  | "/admin"
  | "/admin/candidates"
  | "/admin/jobs"
  | "/admin/requests"
  | "/admin/tasks"
  | "/admin/calendar"
  | "/admin/transactions"
  | "/admin/profile";

export type AdminNavItem = {
  href: AdminNavHref;
  label: string;
  mobileLabel: string;
  icon: LucideIcon;
  exact: boolean;
  jobApplyOnly: boolean;
  managerOnly: boolean;
};

export const ADMIN_NAV_ITEMS = [
  {
    href: "/admin",
    label: "Dashboard",
    mobileLabel: "Home",
    icon: LayoutDashboard,
    exact: true,
    jobApplyOnly: false,
    managerOnly: false,
  },
  {
    href: "/admin/candidates",
    label: "Candidate Details",
    mobileLabel: "Candidates",
    icon: Users,
    exact: false,
    jobApplyOnly: false,
    managerOnly: false,
  },
  {
    href: "/admin/jobs",
    label: "Apply for jobs",
    mobileLabel: "Jobs",
    icon: Briefcase,
    exact: false,
    jobApplyOnly: true,
    managerOnly: false,
  },
  {
    href: "/admin/requests",
    label: "Service Requests",
    mobileLabel: "Requests",
    icon: Inbox,
    exact: false,
    jobApplyOnly: false,
    managerOnly: false,
  },
  {
    href: "/admin/tasks",
    label: "Tasks",
    mobileLabel: "Tasks",
    icon: ClipboardList,
    exact: false,
    jobApplyOnly: false,
    managerOnly: false,
  },
  {
    href: "/admin/calendar",
    label: "Calendar",
    mobileLabel: "Calendar",
    icon: Calendar,
    exact: false,
    jobApplyOnly: false,
    managerOnly: false,
  },
  {
    href: "/admin/transactions",
    label: "Transactions",
    mobileLabel: "Sales",
    icon: ReceiptText,
    exact: false,
    jobApplyOnly: false,
    managerOnly: true,
  },
  {
    href: "/admin/profile",
    label: "My profile",
    mobileLabel: "Profile",
    icon: UserCircle,
    exact: false,
    jobApplyOnly: false,
    managerOnly: false,
  },
] as const satisfies readonly AdminNavItem[];

export function getAdminNavItems(options: {
  showJobApplyNav?: boolean;
  showManagerNav?: boolean;
}): AdminNavItem[] {
  const { showJobApplyNav = true, showManagerNav = false } = options;

  return ADMIN_NAV_ITEMS.filter(
    (item) =>
      (!item.jobApplyOnly || showJobApplyNav) &&
      (!item.managerOnly || showManagerNav),
  );
}

export function isAdminNavActive(pathname: string, href: AdminNavHref, exact: boolean): boolean {
  if (exact) {
    return pathname === href;
  }
  return pathname.startsWith(href);
}
