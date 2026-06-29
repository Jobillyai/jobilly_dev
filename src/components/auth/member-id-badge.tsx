import styles from "./member-id-badge.module.css";

type MemberIdBadgeProps = {
  memberId: string | null | undefined;
  size?: "sm" | "md";
};

export function MemberIdBadge({ memberId, size = "md" }: MemberIdBadgeProps) {
  if (!memberId) {
    return null;
  }

  return (
    <span
      className={`${styles.badge} ${size === "sm" ? styles.badgeSm : ""}`}
      title="Your Jobilly member ID"
    >
      {memberId}
    </span>
  );
}
