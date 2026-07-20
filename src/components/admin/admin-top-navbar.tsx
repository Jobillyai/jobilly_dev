import { JobillyLogo } from "@/components/brand/jobilly-logo";
import { FastLogoutButton } from "@/components/auth/fast-logout-button";
import { MemberIdBadge } from "@/components/auth/member-id-badge";
import { formatDisplayName } from "@/lib/format-display-name";
import styles from "./admin-top-navbar.module.css";

type AdminTopNavbarProps = {
  userName: string | null;
  memberId: string | null;
  roleLabel: string;
};

export function AdminTopNavbar({
  userName,
  memberId,
  roleLabel,
}: AdminTopNavbarProps) {
  const displayName = userName
    ? formatDisplayName(userName)
    : "Admin user";

  return (
    <header className={styles.topNav}>
      <JobillyLogo
        href="/admin"
        markSize={34}
        subtitle={`${roleLabel} portal`}
        className={styles.logo}
      />

      <div className={styles.navRight}>
        <div className={styles.userBlock}>
          <span className={styles.userName}>{displayName}</span>
          {memberId ? <MemberIdBadge memberId={memberId} size="sm" /> : null}
        </div>
        <FastLogoutButton className={styles.logoutBtn} redirectTo="/admin/login">
          Log out
        </FastLogoutButton>
      </div>
    </header>
  );
}
