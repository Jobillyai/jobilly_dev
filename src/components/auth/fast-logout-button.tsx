"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useFastLogout } from "@/lib/auth/use-fast-logout";

type FastLogoutButtonProps = ComponentPropsWithoutRef<"button"> & {
  redirectTo: string;
  pendingLabel?: ReactNode;
  children: ReactNode;
};

export function FastLogoutButton({
  redirectTo,
  pendingLabel,
  children,
  className,
  disabled,
  onClick,
  ...buttonProps
}: FastLogoutButtonProps) {
  const { logout, isPending } = useFastLogout(redirectTo);

  return (
    <button
      type="button"
      className={className}
      disabled={disabled ?? isPending}
      aria-busy={isPending}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          logout();
        }
      }}
      {...buttonProps}
    >
      {isPending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
