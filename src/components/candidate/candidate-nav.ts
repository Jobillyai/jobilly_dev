import {
  Briefcase,
  Calendar,
  Compass,
  CreditCard,
  LayoutDashboard,
  Mic,
  UserCircle,
  type LucideIcon,
} from "lucide-react";

type CandidateNavHref =
  | "/dashboard"
  | "/dashboard/career-advisory"
  | "/dashboard/applications"
  | "/dashboard/mock-interviews"
  | "/dashboard/plans"
  | "/dashboard/calendar"
  | "/dashboard/profile";

export type CandidateNavItem = {
  href: CandidateNavHref;
  label: string;
  mobileLabel: string;
  icon: LucideIcon;
  exact: boolean;
};

export const CANDIDATE_NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    mobileLabel: "Home",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    href: "/dashboard/career-advisory",
    label: "Career Advisory",
    mobileLabel: "Advisory",
    icon: Compass,
    exact: false,
  },
  {
    href: "/dashboard/applications",
    label: "Applications",
    mobileLabel: "Jobs",
    icon: Briefcase,
    exact: false,
  },
  {
    href: "/dashboard/mock-interviews",
    label: "Mock Interviews",
    mobileLabel: "Mocks",
    icon: Mic,
    exact: false,
  },
  {
    href: "/dashboard/plans",
    label: "Plans",
    mobileLabel: "Plans",
    icon: CreditCard,
    exact: false,
  },
  {
    href: "/dashboard/calendar",
    label: "Calendar",
    mobileLabel: "Calendar",
    icon: Calendar,
    exact: false,
  },
  {
    href: "/dashboard/profile",
    label: "Profile",
    mobileLabel: "Profile",
    icon: UserCircle,
    exact: false,
  },
] as const satisfies readonly CandidateNavItem[];

export const CANDIDATE_NAV_ROUTES = CANDIDATE_NAV_ITEMS.map((item) => item.href);

export function isCandidateNavActive(
  pathname: string,
  href: CandidateNavHref,
  exact: boolean,
): boolean {
  if (exact) {
    return pathname === href;
  }
  return pathname.startsWith(href);
}
