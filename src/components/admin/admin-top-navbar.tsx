import { adminLogoutAction } from "@/server/actions/admin-auth";
import { JobillyLogo } from "@/components/brand/jobilly-logo";
import { LogoutForm, LogoutSubmitButton } from "@/components/auth/logout-form";
import { MemberIdBadge } from "@/components/auth/member-id-badge";
import { formatDisplayName } from "@/lib/format-display-name";
import styles from "./admin-top-navbar.module.css";

type AdminTopNavbarProps = {
  userName: string | null;
  memberId: string | null;
};

export function AdminTopNavbar({
  userName,
  memberId,
}: AdminTopNavbarProps) {
  const displayName = userName
    ? formatDisplayName(userName)
    : "Admin user";

  return (
    <header className={styles.topNav}>
      <JobillyLogo href="/admin" height={32} className={styles.logo} />

      <div className={styles.navRight}>
        <div className={styles.userBlock}>
          <span className={styles.userName}>{displayName}</span>
          {memberId ? <MemberIdBadge memberId={memberId} size="sm" /> : null}
        </div>
        <LogoutForm action={adminLogoutAction}>
          <LogoutSubmitButton className={styles.logoutBtn}>Log out</LogoutSubmitButton>
        </LogoutForm>
      </div>
    </header>
  );
}
