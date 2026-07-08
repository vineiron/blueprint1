"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { SignInModal } from "./sign-in-modal";

type SignInContextValue = {
  /** Open the sign-in popup. Pass the path to land on after signing in. */
  openSignIn: (next?: string) => void;
};

const SignInContext = createContext<SignInContextValue | null>(null);

/**
 * Mounts the single global sign-in popup and exposes openSignIn() to the whole
 * app. Also auto-opens when a gated route bounced the visitor here with
 * `?signin=1` (optionally `&next=`), then strips those params so a refresh or
 * back-nav doesn't reopen it.
 */
export function SignInModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState<string | undefined>(undefined);

  const openSignIn = useCallback((nextPath?: string) => {
    setNext(nextPath && nextPath.startsWith("/") ? nextPath : undefined);
    setOpen(true);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("signin") !== "1") return;

    const nextParam = params.get("next") ?? undefined;
    setNext(nextParam && nextParam.startsWith("/") ? nextParam : undefined);
    setOpen(true);

    params.delete("signin");
    params.delete("next");
    const qs = params.toString();
    const url = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", url);
  }, []);

  const value = useMemo(() => ({ openSignIn }), [openSignIn]);

  return (
    <SignInContext.Provider value={value}>
      {children}
      <SignInModal open={open} onClose={() => setOpen(false)} next={next} />
    </SignInContext.Provider>
  );
}

export function useSignIn() {
  const ctx = useContext(SignInContext);
  if (!ctx) throw new Error("useSignIn must be used within SignInModalProvider");
  return ctx;
}
