import Link from "next/link";
import { MemberIdBadge } from "@/components/auth/member-id-badge";
import type { UserProfile } from "@/lib/auth/profile";
import styles from "./staff-profile-card.module.css";

type StaffProfileCardProps = {
  profile: UserProfile;
  roleLabel: string;
  backHref?: "/admin";
  backLabel?: string;
};

export function StaffProfileCard({
  profile,
  roleLabel,
  backHref = "/admin",
  backLabel = "Back to dashboard",
}: StaffProfileCardProps) {
  return (
    <div className={styles.card}>
      <h1 className={styles.title}>
        Staff <em className={styles.titleEm}>profile</em>
      </h1>
      <p className={styles.subtitle}>
        Your {roleLabel.toLowerCase()} employee ID for the admin portal.
      </p>

      <dl className={styles.fieldList}>
        <div className={styles.field}>
          <dt className={styles.label}>Employee ID</dt>
          <dd>
            {profile.memberId ? (
              <MemberIdBadge memberId={profile.memberId} />
            ) : (
              <span className={styles.valueMuted}>Not assigned</span>
            )}
          </dd>
        </div>
      </dl>

      <Link href={backHref} className={styles.backLink}>
        ← {backLabel}
      </Link>
    </div>
  );
}
