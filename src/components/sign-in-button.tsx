"use client";

import { useSignIn } from "./sign-in-modal-provider";

/**
 * A button that opens the global sign-in popup. Styling is passed through via
 * `className` so it can stand in for the various former `/signin` links.
 */
export function SignInButton({
  next,
  className,
  children,
}: {
  next?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { openSignIn } = useSignIn();
  return (
    <button type="button" className={className} onClick={() => openSignIn(next)}>
      {children}
    </button>
  );
}
