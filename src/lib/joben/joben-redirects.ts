export type JobenLink = {
  path: string;
  label: string;
};

/** Longest paths first so split/replace matches correctly. */
export const JOBEN_LINKS: JobenLink[] = [
  { path: "/dashboard/career-advisory", label: "Book Career Advisory" },
  { path: "/dashboard/applications", label: "View Applications" },
  { path: "/dashboard/profile", label: "Open Profile" },
  { path: "/dashboard/calendar", label: "Open Calendar" },
  { path: "/dashboard", label: "Go to Dashboard" },
  { path: "/products", label: "View plans & pricing" },
  { path: "/signup", label: "Sign up free" },
  { path: "/login", label: "Log in" },
  { path: "/contact", label: "Contact support" },
];

const JOBEN_LINK_PATH_PATTERN = new RegExp(
  `(${JOBEN_LINKS.map((link) => link.path.replace(/\//g, "\\/")).join("|")})`,
  "g",
);

export function getJobenLinksInContent(content: string): JobenLink[] {
  const found = new Set<string>();

  for (const link of JOBEN_LINKS) {
    if (content.includes(link.path)) {
      found.add(link.path);
    }
  }

  return JOBEN_LINKS.filter((link) => found.has(link.path));
}

export function splitJobenContent(content: string): Array<string | JobenLink> {
  const parts = content.split(JOBEN_LINK_PATH_PATTERN);
  const linkByPath = new Map(JOBEN_LINKS.map((link) => [link.path, link]));

  return parts
    .filter((part) => part.length > 0)
    .map((part) => linkByPath.get(part) ?? part);
}
