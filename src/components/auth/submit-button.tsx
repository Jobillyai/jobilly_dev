import styles from "./auth-page.module.css";

interface SubmitButtonProps {
  pending: boolean;
  pendingLabel: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export function SubmitButton({
  pending,
  pendingLabel,
  children,
  disabled = false,
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={styles.submitBtn}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
