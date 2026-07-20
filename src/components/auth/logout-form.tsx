"use client";

import { useFormStatus } from "react-dom";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type LogoutFormProps = {
  action: () => void | Promise<void>;
  className?: string;
  children: ReactNode;
};

export function LogoutForm({ action, className, children }: LogoutFormProps) {
  return (
    <form action={action} className={className}>
      {children}
    </form>
  );
}

type LogoutSubmitButtonProps = ComponentPropsWithoutRef<"button"> & {
  pendingLabel?: ReactNode;
};

export function LogoutSubmitButton({
  className,
  children,
  pendingLabel = "Signing out…",
  disabled,
  ...buttonProps
}: LogoutSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={className}
      disabled={disabled ?? pending}
      aria-busy={pending}
      {...buttonProps}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
