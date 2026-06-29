import { MemberIdBadge } from "@/components/auth/member-id-badge";
import styles from "@/components/auth/auth-page.module.css";

type LoginMemberIdPreviewProps = {
  hintExample: string;
  memberId: string | null;
  loading?: boolean;
};

export function LoginMemberIdPreview({
  hintExample,
  memberId,
  loading = false,
}: LoginMemberIdPreviewProps) {
  return (
    <>
      <p className={styles.memberIdHint}>
        Your unique member ID (e.g. {hintExample}) appears below when you enter your
        registered email, and stays visible in the portal after sign-in.
      </p>
      {loading ? (
        <p className={styles.memberIdPreview} role="status">
          Looking up member ID…
        </p>
      ) : memberId ? (
        <p className={styles.memberIdPreview}>
          Member ID: <MemberIdBadge memberId={memberId} />
        </p>
      ) : null}
    </>
  );
}
