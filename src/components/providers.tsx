"use client";

import { ThemeProvider, useTheme } from "next-themes";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { SignInModalProvider } from "@/components/sign-in-modal-provider";

/**
 * Client providers mounted once at the root: next-themes (class strategy,
 * system default) + the sonner Toaster, themed to follow the resolved theme.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SignInModalProvider>{children}</SignInModalProvider>
      <ThemedToaster />
    </ThemeProvider>
  );
}

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      richColors
      closeButton
      position="top-center"
    />
  );
}
