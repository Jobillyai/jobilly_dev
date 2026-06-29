import Link from "next/link";
import { adminLogoutAction } from "@/server/actions/admin-auth";
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
      <Link href="/admin" className={styles.logo}>
        <span className={styles.logoMark}>Jb</span>
        <span>
          <span className={styles.logoText}>jobilly.ai</span>
          <span className={styles.logoSub}>{roleLabel} portal</span>
        </span>
      </Link>

      <div className={styles.navRight}>
        <div className={styles.userBlock}>
          <span className={styles.userName}>{displayName}</span>
          {memberId ? <MemberIdBadge memberId={memberId} size="sm" /> : null}
        </div>
        <form action={adminLogoutAction}>
          <button type="submit" className={styles.logoutBtn}>
            Log out
          </button>
        </form>
      </div>
    </header>
  );
}
